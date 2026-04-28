"""
api/vitals.py - GET /api/latest, /api/history
Serves current vitals (real or simulated) to the React frontend.
Every response includes ML classification + escalation tier inline.
"""
import time
from flask import Blueprint, request, jsonify, current_app
from simulation.engine import build as sim_build
from core.alerts import evaluate, describe_tier
import ml.predictor as predictor
import db

bp = Blueprint("vitals", __name__)
_sim_tick = 0
_sim_scenario: str | None = None
_scenario_start_tick: int = 0


@bp.route("/api/latest", methods=["GET"])
def get_latest():
    global _sim_tick, _sim_scenario
    esp32  = current_app.config.get("ESP32_LATEST")
    ts     = current_app.config.get("LAST_ESP32_TS", 0)
    esp32_alive = esp32 and (time.time() * 1000 - ts) < 6000

    # ── Smart source selection ────────────────────────────────────────────
    # Scenario active  → always simulation (both dashboard and glove show sim)
    # Normal + glove   → real device data  (both show real hardware readings)
    # Normal, no glove → simulation fallback
    active_scenario = _sim_scenario  # None when "normal"

    if active_scenario:
        # Non-normal scenario: generate simulation data
        _sim_tick += 1
        age = _sim_tick - _scenario_start_tick
        reading = sim_build(_sim_tick, _sim_scenario, age_ticks=age)
        reading["source"] = "simulation"
    elif esp32_alive:
        # Normal mode + ESP32 connected: use real glove data
        reading = dict(esp32)
        reading["source"] = "device"
    else:
        # Normal mode, no glove: simulation fallback
        _sim_tick += 1
        age = _sim_tick - _scenario_start_tick
        reading = sim_build(_sim_tick, None, age_ticks=age)
        reading["source"] = "simulation"

    # ── Share the latest reading so /api/glove/command serves identical data ─
    current_app.config["LATEST_SIM_READING"] = reading

    # ── Enrich with ML prediction ────────────────────────────────────────
    ml_result = predictor.predict(reading)
    reading["ml_class"]      = ml_result.get("predicted_class", "unknown")
    reading["ml_confidence"] = ml_result.get("confidence", 0.0)
    reading["ml_algorithm"]  = ml_result.get("algorithm", "unknown")
    reading["ml_ready"]      = ml_result.get("model_ready", False)

    # ── Enrich with escalation tier ──────────────────────────────────────
    esc = evaluate(reading)
    reading["escalation_tier"]  = esc["tier"]
    reading["escalation_label"] = describe_tier(esc["tier"])
    reading["alert_reasons"]    = esc["reasons"]
    reading["escalation_actions"] = esc["actions"]

    return jsonify(reading)


@bp.route("/api/history", methods=["GET"])
def get_history():
    n          = int(request.args.get("n", 60))
    patient_id = int(request.args.get("patient_id", 1))
    try:
        return jsonify(db.get_history(patient_id, n))
    except Exception:
        return jsonify([])
