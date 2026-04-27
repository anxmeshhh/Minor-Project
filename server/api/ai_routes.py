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
    FULL ANALYSIS PIPELINE (Holistic Health Assessment):
    Input: vitals + medications + symptoms + medical_history + prescriptions
           + family_health + doctor_notes + checkups
    Process: ML classification -> Rule risk -> Groq AI (with ALL context)
    Output: urgency + recommendations + doctor specialty
    """
    body = request.get_json(silent=True) or {}
    patient_id      = int(body.get("patient_id", 1))
    medications     = body.get("medications", [])
    symptoms        = body.get("symptoms", [])
    checkups        = body.get("checkups", [])
    medical_history = body.get("medical_history", [])
    prescriptions   = body.get("prescriptions", [])
    family_health   = body.get("family_health", [])
    doctor_notes    = body.get("doctor_notes", [])

    # Get latest vitals
    vitals = current_app.config.get("ESP32_LATEST")
    if not vitals:
        from simulation.engine import build as sim_build
        from api.vitals import _sim_tick, _sim_scenario, _scenario_start_tick
        vitals = sim_build(_sim_tick, _sim_scenario, age_ticks=_sim_tick - _scenario_start_tick)

    # Step 1: ML Classification (glove data)
    ml_result = predictor.predict(vitals)
    ml_class = ml_result.get("predicted_class", "unknown")
    ml_confidence = ml_result.get("confidence", 0.0)

    # Step 2: Rule-based risk score (glove data)
    risk = compute_risk(
        int(vitals.get("hr", 72)), int(vitals.get("spo2", 98)),
        float(vitals.get("temp", 36.5)), float(vitals.get("gforce", 1.0)),
        bool(vitals.get("fall", False))
    )
    risk_level = get_level(risk)

    # Step 3: Escalation tier
    esc = evaluate({**vitals, "risk": risk})

    # Step 4: Holistic urgency (ML + rules + context)
    # Consider symptoms severity alongside vitals
    severe_symptoms = any(s.lower() in ("chest pain","breathing difficulty","unconscious",
        "severe headache","fainting","seizure","bleeding") for s in symptoms)
    if risk > 70 or ml_class in ("fall", "hypoxia") or severe_symptoms:
        urgency = "emergency"
    elif risk > 40 or ml_class in ("tachycardia", "bradycardia", "arrhythmia", "fever") or len(symptoms) >= 3:
        urgency = "visit"
    else:
        urgency = "safe"

    # Step 5: Build comprehensive context strings
    meds_str     = ", ".join(medications)     if medications     else "None reported"
    symp_str     = ", ".join(symptoms)        if symptoms        else "None reported"
    checkup_str  = ", ".join(checkups)        if checkups        else "None scheduled"
    history_str  = ", ".join(medical_history) if medical_history else "No known conditions"
    presc_str    = ", ".join(prescriptions)   if prescriptions   else "No active prescriptions"
    family_str   = ", ".join(family_health)   if family_health   else "No family health data"
    notes_str    = ", ".join(doctor_notes)    if doctor_notes    else "No doctor notes"

    try:
        db_history = db.get_history(patient_id, 20)
    except Exception:
        db_history = []

    # Step 6: Groq AI with FULL patient context
    enriched_prompt = f"""Comprehensive Patient Health Assessment:

=== REAL-TIME GLOVE DATA (VitalGlove ESP32) ===
Heart Rate: {vitals.get('hr')} BPM | SpO2: {vitals.get('spo2')}% | Temp: {vitals.get('temp')}C | G-Force: {vitals.get('gforce')}G | Fall: {vitals.get('fall')}

=== ML MODEL OUTPUT (RandomForest, 95.96% accuracy) ===
Predicted Condition: {ml_class} (confidence: {ml_confidence*100:.1f}%)
Rule-Based Risk Score: {risk}/100 ({risk_level})
Escalation Tier: {esc['tier']} - {describe_tier(esc['tier'])}

=== PATIENT MEDICAL PROFILE ===
Current Medications: {meds_str}
Active Prescriptions: {presc_str}
Reported Symptoms: {symp_str}
Medical History: {history_str}
Upcoming Checkups: {checkup_str}
Doctor Notes: {notes_str}

=== FAMILY HEALTH CONTEXT ===
{family_str}

INSTRUCTIONS: Analyze ALL the above data holistically. Do NOT base your assessment solely on glove vitals.
Consider medication interactions, symptom patterns, medical history, and family health risks together.

Provide:
1. URGENCY: Safe / Need Doctor Visit / Emergency
2. HOLISTIC ASSESSMENT: What the combined data (glove + history + meds + symptoms) suggests
3. KEY CONCERNS: Any medication interactions or risk factors from history
4. RECOMMENDATIONS: 3 specific actionable steps
5. DOCTOR SPECIALTY: Which specialist to see, if needed
6. FAMILY ALERT: Should family members be notified? Why?

Keep response under 200 words. Be direct, factual, and considerate of the full patient picture."""

    try:
        client = ai._get_client()
        resp = client.chat.completions.create(
            model=ai.MODEL,
            messages=[
                {"role": "system", "content": ai.SYSTEM_PROMPT},
                {"role": "user", "content": enriched_prompt},
            ],
            max_tokens=350,
            temperature=0.2,
        )
        ai_text = resp.choices[0].message.content.strip()
    except Exception:
        # Detailed fallback without Groq
        context_parts = []
        if ml_class != "normal":
            context_parts.append(f"Glove ML detected '{ml_class}' pattern ({ml_confidence*100:.0f}% confidence).")
        if symptoms:
            context_parts.append(f"Patient reports: {symp_str}.")
        if medications:
            context_parts.append(f"Currently on: {meds_str}.")
        if medical_history:
            context_parts.append(f"History: {history_str}.")

        if urgency == "emergency":
            ai_text = f"EMERGENCY: {' '.join(context_parts)} Risk score {risk}/100. Immediate medical attention required. Contact emergency services (108)."
        elif urgency == "visit":
            ai_text = f"ATTENTION: {' '.join(context_parts)} Risk score {risk}/100. Based on combined assessment of vitals, symptoms, and medical history, schedule a doctor visit within 24-48 hours."
        else:
            ai_text = f"All Clear: {' '.join(context_parts) or 'All vitals within normal range.'} Risk score {risk}/100. Continue regular monitoring and medication schedule."

    # Step 7: Doctor specialty suggestion
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
        "context_used": {
            "vitals": True,
            "ml_model": True,
            "medications": bool(medications),
            "symptoms": bool(symptoms),
            "medical_history": bool(medical_history),
            "prescriptions": bool(prescriptions),
            "family_health": bool(family_health),
            "doctor_notes": bool(doctor_notes),
        },
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

