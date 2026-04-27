"""
api/telemetry.py — POST /api/telemetry
Receives JSON from ESP32, normalises, scores, saves to DB, broadcasts via WS.
"""
import time
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import SocketIO
from core.risk import compute as compute_risk, get_alert_reasons
from core.alerts import evaluate
import db
import ml.predictor as predictor

bp = Blueprint("telemetry", __name__)


def _normalise(p: dict, source: str = "device") -> dict:
    hr     = int(p.get("hr", 0))
    spo2   = int(p.get("spo2", 0))
    temp   = float(p.get("tempC", p.get("temp", 0)))
    gforce = float(p.get("impactG", p.get("gforce", 1.0)))
    fall   = bool(p.get("fall", False))
    risk   = compute_risk(hr, spo2, temp, gforce, fall)
    alert  = hr < 50 or hr > 120 or spo2 < 94 or fall
    motion = p.get("motion", {})
    return {
        "timestamp":  int(time.time() * 1000),
        "patient_id": int(p.get("patient_id", 1)),
        "hr": hr, "spo2": spo2, "temp": temp,
        "gforce": round(gforce, 2), "fall": fall,
        "accelX": float(motion.get("x", p.get("accelX", 0))),
        "accelY": float(motion.get("y", p.get("accelY", 0))),
        "accelZ": float(motion.get("z", p.get("accelZ", 0))),
        "ir": int(p.get("ir", 0)),
        "finger": bool(p.get("finger", False)),
        "alert": alert, "risk": risk, "source": source,
    }


@bp.route("/api/telemetry", methods=["POST"])
def receive_telemetry():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "invalid JSON"}), 400

    reading = _normalise(payload, source="device")

    # Store in shared state for /api/latest
    current_app.config["ESP32_LATEST"] = reading
    current_app.config["LAST_ESP32_TS"] = time.time() * 1000

    # ML classification
    ml_result = predictor.predict(reading)
    reading["ml_class"] = ml_result.get("predicted_class", "unknown")
    reading["ml_confidence"] = ml_result.get("confidence", 0.0)

    # Evaluate escalation
    escalation = evaluate(reading)
    reading["escalation_tier"] = escalation["tier"]

    # Persist
    try:
        reading_id = db.save_reading(reading)
        for a in escalation["reasons"]:
            db.save_alert(reading["patient_id"], a, reading_id)
    except Exception as e:
        current_app.logger.warning(f"DB skip: {e}")

    # Broadcast to React via WebSocket
    socketio: SocketIO = current_app.config["SOCKETIO"]
    socketio.emit("vitals", reading)

    return jsonify({"ok": True, "risk": reading["risk"], "tier": escalation["tier"]})
