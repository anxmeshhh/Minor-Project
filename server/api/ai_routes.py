"""
api/ai_routes.py — Groq AI endpoints
POST /api/ai/insight
POST /api/ai/explain
"""
from flask import Blueprint, request, jsonify, current_app
import db
from core import ai

bp = Blueprint("ai", __name__)


@bp.route("/api/ai/insight", methods=["POST"])
def ai_insight():
    body       = request.get_json(silent=True) or {}
    patient_id = int(body.get("patient_id", 1))
    try:
        history = db.get_history(patient_id, 20)
    except Exception:
        history = []
    if not history:
        latest = current_app.config.get("ESP32_LATEST") or {}
        history = [latest] if latest else []

    import time
    insight = ai.generate_insight(history, patient_id)
    try:
        db.save_insight(patient_id, insight)
    except Exception:
        pass
    return jsonify({"insight": insight, "ts": int(time.time() * 1000)})


@bp.route("/api/ai/explain", methods=["POST"])
def ai_explain():
    reading     = request.get_json(silent=True) or {}
    explanation = ai.explain_alert(reading)
    return jsonify({"explanation": explanation})


@bp.route("/api/ai/insights", methods=["GET"])
def get_insights():
    patient_id = int(request.args.get("patient_id", 1))
    limit      = int(request.args.get("limit", 10))
    try:
        c = db._conn()
        cur = c.cursor(dictionary=True)
        cur.execute(
            "SELECT insight, model, created_at FROM ai_insights "
            "WHERE patient_id=%s ORDER BY id DESC LIMIT %s",
            (patient_id, limit),
        )
        rows = cur.fetchall()
        cur.close(); c.close()
        return jsonify(rows)
    except Exception:
        return jsonify([])
