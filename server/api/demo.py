"""
api/demo.py — Demo control + glove command endpoints
GET  /api/demo/status
POST /api/demo/trigger
GET  /api/demo/scenarios   ← used by DemoPanel UI (dynamic, no hardcoded values)
GET  /api/glove/command    ← polled by ESP32 every 3s for wireless scenario sync
"""
import time
from flask import Blueprint, request, jsonify, current_app
from simulation.engine import list_scenarios, get_metadata
from api import vitals as vitals_module

bp = Blueprint("demo", __name__)


@bp.route("/api/demo/status", methods=["GET"])
def demo_status():
    esp32_ts = current_app.config.get("LAST_ESP32_TS", 0)
    scenario = current_app.config.get("ACTIVE_SCENARIO")
    return jsonify({
        "scenario":      scenario,
        "dataSource":    current_app.config.get("DATA_SOURCE", "simulation"),
        "esp32Connected": (time.time() * 1000 - esp32_ts) < 6000 and esp32_ts > 0,
        "scenarioMeta":  get_metadata(scenario) if scenario else get_metadata("normal"),
    })


@bp.route("/api/demo/trigger", methods=["POST"])
def demo_trigger():
    body   = request.get_json(silent=True) or {}
    scene  = body.get("scene")
    source = body.get("source")

    if scene is not None:
        sid = None if scene == "normal" else scene
        current_app.config["ACTIVE_SCENARIO"]       = sid
        vitals_module._sim_scenario                 = sid
        vitals_module._scenario_start_tick          = vitals_module._sim_tick

    if source in ("device", "simulation"):
        current_app.config["DATA_SOURCE"] = source

    active = current_app.config.get("ACTIVE_SCENARIO")
    return jsonify({
        "ok":          True,
        "scenario":    active,
        "dataSource":  current_app.config.get("DATA_SOURCE", "simulation"),
        "meta":        get_metadata(active) if active else get_metadata("normal"),
    })


@bp.route("/api/demo/scenarios", methods=["GET"])
def get_scenarios():
    """Return all 9 registered scenario metadata objects — used by DemoPanel UI."""
    return jsonify(list_scenarios())


@bp.route("/api/glove/command", methods=["GET"])
def glove_command():
    """
    Polled by the ESP32 every 3 seconds.
    Returns the active scenario so the OLED can display it wirelessly.
    This is what makes the physical glove respond to UI simulation changes.
    """
    scenario = current_app.config.get("ACTIVE_SCENARIO") or "normal"
    meta     = get_metadata(scenario) or {}
    return jsonify({
        "scenario":    scenario,
        "label":       meta.get("label", "Normal Monitoring"),
        "description": meta.get("description", "Baseline vitals"),
        "risk_range":  meta.get("expected_risk_range", [5, 20]),
        "tier":        meta.get("expected_escalation_tier", 0),
        "gaps":        meta.get("gaps", []),
    })

