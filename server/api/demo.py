"""
api/demo.py — Demo control endpoints
GET  /api/demo/status
POST /api/demo/trigger
GET  /api/demo/scenarios
"""
import time
from flask import Blueprint, request, jsonify, current_app
from simulation.engine import list_scenarios
from api import vitals as vitals_module

bp = Blueprint("demo", __name__)


@bp.route("/api/demo/status", methods=["GET"])
def demo_status():
    esp32_ts = current_app.config.get("LAST_ESP32_TS", 0)
    return jsonify({
        "scenario":      current_app.config.get("ACTIVE_SCENARIO"),
        "dataSource":    current_app.config.get("DATA_SOURCE", "simulation"),
        "esp32Connected": (time.time() * 1000 - esp32_ts) < 6000 and esp32_ts > 0,
    })


@bp.route("/api/demo/trigger", methods=["POST"])
def demo_trigger():
    body   = request.get_json(silent=True) or {}
    scene  = body.get("scene")
    source = body.get("source")

    if scene is not None:
        sid = None if scene == "normal" else scene
        current_app.config["ACTIVE_SCENARIO"] = sid
        vitals_module._sim_scenario        = sid
        vitals_module._scenario_start_tick = vitals_module._sim_tick

    if source in ("device", "simulation"):
        current_app.config["DATA_SOURCE"] = source

    return jsonify({
        "ok":         True,
        "scenario":   current_app.config.get("ACTIVE_SCENARIO"),
        "dataSource": current_app.config.get("DATA_SOURCE", "simulation"),
    })


@bp.route("/api/demo/scenarios", methods=["GET"])
def get_scenarios():
    """Return all registered scenario metadata for the Demo Panel."""
    return jsonify(list_scenarios())
