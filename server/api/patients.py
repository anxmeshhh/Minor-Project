"""
api/patients.py — Patient CRUD
GET /api/patients
GET /api/patients/<id>/alerts
"""
from flask import Blueprint, request, jsonify
import db

bp = Blueprint("patients", __name__)


@bp.route("/api/patients", methods=["GET"])
def list_patients():
    try:
        return jsonify(db.list_patients())
    except Exception:
        return jsonify([{"id": 1, "name": "Demo Patient", "age": 28, "condition": "Cardiac Monitoring"}])


@bp.route("/api/patients/<int:pid>/alerts", methods=["GET"])
def patient_alerts(pid):
    try:
        return jsonify(db.get_alerts(pid))
    except Exception:
        return jsonify([])
