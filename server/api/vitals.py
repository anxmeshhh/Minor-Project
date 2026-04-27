"""
api/vitals.py — GET /api/latest, /api/history
Serves current vitals (real or simulated) to the React frontend.
"""
import time
from flask import Blueprint, request, jsonify, current_app
from simulation.engine import build as sim_build
import db

bp = Blueprint("vitals", __name__)
_sim_tick = 0
_sim_scenario: str | None = None
_scenario_start_tick: int = 0


@bp.route("/api/latest", methods=["GET"])
def get_latest():
    global _sim_tick, _sim_scenario
    source = current_app.config.get("DATA_SOURCE", "simulation")
    esp32  = current_app.config.get("ESP32_LATEST")
    ts     = current_app.config.get("LAST_ESP32_TS", 0)

    if source == "device" and esp32 and (time.time() * 1000 - ts) < 6000:
        return jsonify(esp32)

    # Simulation fallback
    _sim_tick += 1
    age = _sim_tick - _scenario_start_tick
    reading = sim_build(_sim_tick, _sim_scenario, age_ticks=age)
    return jsonify(reading)


@bp.route("/api/history", methods=["GET"])
def get_history():
    n          = int(request.args.get("n", 60))
    patient_id = int(request.args.get("patient_id", 1))
    try:
        return jsonify(db.get_history(patient_id, n))
    except Exception:
        return jsonify([])
