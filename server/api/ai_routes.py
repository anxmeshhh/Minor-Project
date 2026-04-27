"""
api/ai_routes.py - Groq AI + ML combined endpoints
POST /api/ai/insight      - Quick Groq insight
POST /api/ai/explain      - Alert explanation
GET  /api/ai/insights     - Insight history
POST /api/ai/analyze      - FULL analysis (ML + Rules + Groq combined)
"""
from flask import Blueprint, request, jsonify, current_app
import time
import db
from core import ai
from core.risk import compute as compute_risk, get_level
from core.alerts import evaluate, describe_tier
import ml.predictor as predictor

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


@bp.route("/api/ai/analyze", methods=["POST"])
def ai_full_analyze():
    """
    FULL ANALYSIS PIPELINE:
    1. Takes current vitals + patient context (medications, symptoms, history)
    2. Runs ML prediction (9-class scenario classification)
    3. Runs rule-based risk scoring (0-100)
    4. Runs Groq AI with ALL context
    5. Returns unified urgency + recommendations
    """
    body = request.get_json(silent=True) or {}
    patient_id  = int(body.get("patient_id", 1))
    medications = body.get("medications", [])
    symptoms    = body.get("symptoms", [])
    checkups    = body.get("checkups", [])

    # Get latest vitals
    vitals = current_app.config.get("ESP32_LATEST")
    if not vitals:
        from simulation.engine import build as sim_build
        from api.vitals import _sim_tick, _sim_scenario, _scenario_start_tick
        vitals = sim_build(_sim_tick, _sim_scenario, age_ticks=_sim_tick - _scenario_start_tick)

    # Step 1: ML Classification
    ml_result = predictor.predict(vitals)
    ml_class = ml_result.get("predicted_class", "unknown")
    ml_confidence = ml_result.get("confidence", 0.0)

    # Step 2: Rule-based risk score
    risk = compute_risk(
        int(vitals.get("hr", 72)), int(vitals.get("spo2", 98)),
        float(vitals.get("temp", 36.5)), float(vitals.get("gforce", 1.0)),
        bool(vitals.get("fall", False))
    )
    risk_level = get_level(risk)

    # Step 3: Escalation tier
    esc = evaluate({**vitals, "risk": risk})

    # Step 4: Determine urgency from ML + rules
    if risk > 70 or ml_class in ("fall", "hypoxia"):
        urgency = "emergency"
    elif risk > 40 or ml_class in ("tachycardia", "bradycardia", "arrhythmia", "fever"):
        urgency = "visit"
    else:
        urgency = "safe"

    # Step 5: Groq AI with full context
    meds_str = ", ".join(medications) if medications else "None reported"
    symp_str = ", ".join(symptoms) if symptoms else "None reported"
    checkup_str = ", ".join(checkups) if checkups else "None scheduled"

    try:
        history = db.get_history(patient_id, 20)
    except Exception:
        history = []

    # Build rich prompt for Groq
    prompt_readings = history if history else [vitals]
    enriched_prompt = f"""Patient Analysis Request:

CURRENT VITALS: HR={vitals.get('hr')} BPM, SpO2={vitals.get('spo2')}%, Temp={vitals.get('temp')}C, G-Force={vitals.get('gforce')}G, Fall={vitals.get('fall')}
ML PREDICTION: {ml_class} (confidence: {ml_confidence*100:.1f}%)
RULE-BASED RISK: {risk}/100 ({risk_level})
ESCALATION TIER: {esc['tier']} - {describe_tier(esc['tier'])}

MEDICATIONS: {meds_str}
SYMPTOMS: {symp_str}
UPCOMING CHECKUPS: {checkup_str}

Based on ALL the above data (ML prediction + rule-based risk + patient context), provide:
1. URGENCY LEVEL: Safe / Need Doctor Visit / Emergency
2. CONDITION DETECTED: What the ML model and vitals suggest
3. EXPLANATION: 2-3 sentences a patient can understand
4. RECOMMENDATIONS: 2-3 specific actionable steps
5. DOCTOR SPECIALTY: If visit needed, which type of doctor

Keep response under 150 words. Be direct and factual."""

    try:
        from groq import Groq
        client = ai._get_client()
        resp = client.chat.completions.create(
            model=ai.MODEL,
            messages=[
                {"role": "system", "content": ai.SYSTEM_PROMPT},
                {"role": "user", "content": enriched_prompt},
            ],
            max_tokens=250,
            temperature=0.2,
        )
        ai_text = resp.choices[0].message.content.strip()
    except Exception:
        # Fallback without Groq
        if urgency == "emergency":
            ai_text = f"EMERGENCY: ML detected '{ml_class}' pattern. Risk score {risk}/100. Immediate medical attention required. Contact emergency services (108). Do not delay treatment."
        elif urgency == "visit":
            ai_text = f"ATTENTION: ML detected '{ml_class}' pattern with {ml_confidence*100:.0f}% confidence. Risk score {risk}/100. Schedule a doctor visit within 24-48 hours. Monitor vitals closely."
        else:
            ai_text = f"All Clear: Vitals are within normal range. ML confirms '{ml_class}' state ({ml_confidence*100:.0f}% confidence). Risk score {risk}/100. Continue regular monitoring."

    # Step 6: Build doctor suggestion
    doctor_map = {
        "tachycardia": "Cardiologist", "bradycardia": "Cardiologist",
        "arrhythmia": "Cardiologist / Electrophysiologist",
        "hypoxia": "Pulmonologist", "sleep_apnea": "Sleep Medicine Specialist",
        "fever": "General Physician / Internist",
        "fall": "Emergency Medicine / Orthopedic",
        "exercise": None, "normal": None,
    }

    result = {
        "urgency": urgency,
        "risk_score": risk,
        "risk_level": risk_level,
        "ml_class": ml_class,
        "ml_confidence": ml_confidence,
        "ml_algorithm": ml_result.get("algorithm", "unknown"),
        "escalation_tier": esc["tier"],
        "escalation_label": describe_tier(esc["tier"]),
        "alert_reasons": esc["reasons"],
        "ai_analysis": ai_text,
        "doctor_specialty": doctor_map.get(ml_class),
        "vitals": {
            "hr": vitals.get("hr"), "spo2": vitals.get("spo2"),
            "temp": vitals.get("temp"), "gforce": vitals.get("gforce"),
            "fall": vitals.get("fall"),
        },
        "ts": int(time.time() * 1000),
    }

    # Save insight
    try:
        db.save_insight(patient_id, f"[{urgency.upper()}] {ai_text}")
    except Exception:
        pass

    return jsonify(result)
