"""
api/emergency.py - SOS + Emergency dispatch endpoints
POST /api/emergency/sos       - Patient one-tap SOS (saves vitals snapshot)
GET  /api/emergency/status    - Current escalation state
POST /api/emergency/resolve   - Doctor marks emergency as resolved
"""
import time
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import SocketIO
from core.alerts import evaluate, describe_tier
import db

bp = Blueprint("emergency", __name__)


@bp.route("/api/emergency/sos", methods=["POST"])
def sos():
    """
    One-tap SOS from patient.
    Saves current vitals as emergency snapshot, triggers L3 escalation,
    broadcasts emergency event to all connected clients.
    """
    body = request.get_json(silent=True) or {}
    patient_id = int(body.get("patient_id", 1))
    location = body.get("location", {
        "lat": 12.9716, "lng": 77.5946,
        "address": "Flat 402, Sunrise Apartments, MG Road, Bengaluru - 560001"
    })

    # Grab latest vitals
    latest = current_app.config.get("ESP32_LATEST", {})
    risk = latest.get("risk", 95)

    # Force L3 escalation for SOS
    sos_event = {
        "type": "SOS",
        "timestamp": int(time.time() * 1000),
        "patient_id": patient_id,
        "vitals_snapshot": {
            "hr": latest.get("hr", 0),
            "spo2": latest.get("spo2", 0),
            "temp": latest.get("temp", 0),
            "gforce": latest.get("gforce", 0),
            "fall": latest.get("fall", False),
            "risk": risk,
        },
        "location": location,
        "escalation_tier": 3,
        "escalation_label": describe_tier(3),
        "actions": [
            "Doctor paged immediately",
            "Family SMS + call dispatched",
            "Ambulance service notified (108)",
            "Vitals snapshot saved to emergency record",
        ],
        "status": "active",
    }

    # Save to DB
    try:
        alert_data = {"type": "SOS", "severity": "critical", "detail": f"Patient triggered SOS. Risk={risk}"}
        db.save_alert(patient_id, alert_data, reading_id=0)
    except Exception:
        pass

    # Store in app config for status checks
    current_app.config["ACTIVE_EMERGENCY"] = sos_event

    # Broadcast to all connected clients
    socketio: SocketIO = current_app.config.get("SOCKETIO")
    if socketio:
        socketio.emit("emergency", sos_event)

    # Log simulated notifications
    print(f"[SOS] EMERGENCY triggered for patient {patient_id}")
    print(f"[SOS] -> Doctor notified (push + SMS simulated)")
    print(f"[SOS] -> Family contacted (SMS simulated)")
    print(f"[SOS] -> Ambulance 108 dispatched (API simulated)")
    print(f"[SOS] -> Location: {location.get('address', 'Unknown')}")

    return jsonify(sos_event)


@bp.route("/api/emergency/status", methods=["GET"])
def status():
    """Get current emergency state."""
    emergency = current_app.config.get("ACTIVE_EMERGENCY")
    if not emergency:
        return jsonify({"active": False, "status": "clear"})
    return jsonify({"active": True, **emergency})


@bp.route("/api/emergency/resolve", methods=["POST"])
def resolve():
    """Doctor resolves the emergency."""
    body = request.get_json(silent=True) or {}
    emergency = current_app.config.get("ACTIVE_EMERGENCY")
    if emergency:
        emergency["status"] = "resolved"
        emergency["resolved_by"] = body.get("doctor", "Dr. Mehra")
        emergency["resolved_at"] = int(time.time() * 1000)
        current_app.config["ACTIVE_EMERGENCY"] = None

        socketio: SocketIO = current_app.config.get("SOCKETIO")
        if socketio:
            socketio.emit("emergency_resolved", emergency)

        print(f"[SOS] Emergency resolved by {emergency['resolved_by']}")
        return jsonify({"ok": True, **emergency})
    return jsonify({"ok": False, "error": "No active emergency"})
