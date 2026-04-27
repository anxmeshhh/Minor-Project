"""
VitalGlove Flask Backend
========================
Receives telemetry from ESP32 → stores in MySQL → serves React frontend.
Run: python app.py
"""

import os, time, math, random
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import db, risk, ai, simulation

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "vitalglove-secret")
CORS(app, origins=["http://localhost:8080", "http://127.0.0.1:8080"])
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

PORT = int(os.getenv("FLASK_PORT", 5001))

# ── in-memory state ──────────────────────────────────────────────────────────
_latest: dict | None = None           # last reading served (device or sim)
_esp32_latest: dict | None = None     # last real device reading
_scenario: str | None = None          # active simulation scenario
_scenario_tick: int = 0               # tick when scenario started
_data_source: str = "simulation"      # "device" | "simulation"
_sim_tick: int = 0

# ── telemetry endpoint (ESP32 → Flask) ───────────────────────────────────────
@app.route("/api/telemetry", methods=["POST"])
def receive_telemetry():
    global _esp32_latest, _latest
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "invalid JSON"}), 400

    reading = _normalise(payload, source="device")
    _esp32_latest = reading
    if _data_source == "device":
        _latest = reading

    # Persist to MySQL (non-blocking – ignore if DB is down)
    try:
        reading_id = db.save_reading(reading)
        alerts = risk.get_alert_reasons(reading)
        for a in alerts:
            db.save_alert(reading.get("patient_id", 1), a, reading_id)
    except Exception as e:
        app.logger.warning(f"DB write skipped: {e}")

    # Broadcast to all connected React clients via WebSocket
    socketio.emit("vitals", reading)

    return jsonify({"ok": True, "risk": reading["risk"]})


# ── React poll endpoint ───────────────────────────────────────────────────────
@app.route("/api/latest", methods=["GET"])
def get_latest():
    global _sim_tick, _latest
    patient_id = int(request.args.get("patient_id", 1))
    _ = patient_id  # future: filter by patient

    if _data_source == "device" and _esp32_latest:
        out = _esp32_latest
    else:
        # Generate simulated reading
        _sim_tick += 1
        out = simulation.build(_sim_tick, _scenario)
        _latest = out

    return jsonify(out)


# ── history ───────────────────────────────────────────────────────────────────
@app.route("/api/history", methods=["GET"])
def get_history():
    n = int(request.args.get("n", 60))
    patient_id = int(request.args.get("patient_id", 1))
    try:
        rows = db.get_history(patient_id, n)
    except Exception:
        rows = []
    return jsonify(rows)


# ── alerts ────────────────────────────────────────────────────────────────────
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    patient_id = int(request.args.get("patient_id", 1))
    try:
        rows = db.get_alerts(patient_id)
    except Exception:
        rows = []
    return jsonify(rows)


# ── Groq AI insight ───────────────────────────────────────────────────────────
@app.route("/api/ai/insight", methods=["POST"])
def get_ai_insight():
    body = request.get_json(silent=True) or {}
    patient_id = int(body.get("patient_id", 1))
    try:
        history = db.get_history(patient_id, 20)
    except Exception:
        history = [_latest] if _latest else []

    insight = ai.generate_insight(history, patient_id)
    try:
        db.save_insight(patient_id, insight)
    except Exception:
        pass
    return jsonify({"insight": insight, "ts": int(time.time() * 1000)})


@app.route("/api/ai/explain", methods=["POST"])
def explain_alert():
    reading = request.get_json(silent=True) or {}
    explanation = ai.explain_alert(reading)
    return jsonify({"explanation": explanation})


# ── demo / simulation control ─────────────────────────────────────────────────
@app.route("/api/demo/status", methods=["GET"])
def demo_status():
    return jsonify({
        "scenario": _scenario,
        "dataSource": _data_source,
        "esp32Connected": _esp32_latest is not None
            and (time.time() * 1000 - _esp32_latest.get("timestamp", 0)) < 6000,
    })


@app.route("/api/demo/trigger", methods=["POST"])
def demo_trigger():
    global _scenario, _scenario_tick, _data_source, _sim_tick
    body = request.get_json(silent=True) or {}
    scene = body.get("scene")
    source = body.get("source")
    if scene is not None:
        _scenario = None if scene == "normal" else scene
        _scenario_tick = _sim_tick
    if source in ("device", "simulation"):
        _data_source = source
    return jsonify({"ok": True, "scenario": _scenario, "dataSource": _data_source})


# ── patients (basic CRUD for demo) ────────────────────────────────────────────
@app.route("/api/patients", methods=["GET"])
def list_patients():
    try:
        return jsonify(db.list_patients())
    except Exception:
        return jsonify([{"id": 1, "name": "Demo Patient", "age": 35, "condition": "Monitoring"}])


# ── WebSocket events ──────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print("[WS] Client connected")
    if _latest:
        emit("vitals", _latest)


# ── helpers ───────────────────────────────────────────────────────────────────
def _normalise(p: dict, source: str = "device") -> dict:
    hr     = int(p.get("hr", 0))
    spo2   = int(p.get("spo2", 0))
    temp   = float(p.get("tempC", p.get("temp", 0)))
    gforce = float(p.get("impactG", p.get("gforce", 1.0)))
    fall   = bool(p.get("fall", False))

    r = risk.compute(hr, spo2, temp, gforce, fall)
    alert = hr < 50 or hr > 120 or spo2 < 94 or fall

    return {
        "timestamp": int(time.time() * 1000),
        "patient_id": int(p.get("patient_id", 1)),
        "hr": hr, "spo2": spo2, "temp": temp,
        "gforce": round(gforce, 2), "fall": fall,
        "accelX": float(p.get("motion", {}).get("x", p.get("accelX", 0))),
        "accelY": float(p.get("motion", {}).get("y", p.get("accelY", 0))),
        "accelZ": float(p.get("motion", {}).get("z", p.get("accelZ", 0))),
        "ir": int(p.get("ir", 0)),
        "finger": bool(p.get("finger", False)),
        "alert": alert,
        "risk": r,
        "source": source,
    }


if __name__ == "__main__":
    print(f"[VitalGlove] Flask backend starting on port {PORT}")
    print(f"[VitalGlove] MySQL: {os.getenv('MYSQL_HOST', 'localhost')}:{os.getenv('MYSQL_PORT', 3306)}")
    db.init()
    socketio.run(app, host="0.0.0.0", port=PORT, debug=True, use_reloader=False)
