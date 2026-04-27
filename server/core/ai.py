"""
ai.py — Groq API integration for health insights
Model: llama3-70b-8192 (fast, accurate for medical text)
"""
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        key = os.getenv("GROQ_API_KEY", "")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _client = Groq(api_key=key)
    return _client


MODEL = "llama3-70b-8192"

SYSTEM_PROMPT = """You are VitalGlove AI, a clinical decision-support assistant embedded in a 
smart health monitoring glove system. You receive real-time sensor data (HR, SpO2, temperature, 
G-force, fall detection) from an ESP32-based wearable device and provide concise, actionable 
health insights for both patients and doctors. Always be factual, avoid overdiagnosis, and 
clearly flag critical conditions. Keep responses under 120 words."""


def generate_insight(readings: list[dict], patient_id: int = 1) -> str:
    """
    Given the last N readings, ask Groq for a health summary.
    Falls back to a rule-based message if API key is missing.
    """
    if not readings:
        return "No data available to analyse."

    try:
        client = _get_client()
    except RuntimeError as e:
        return _fallback_insight(readings)

    # Build a compact summary of the data
    n = len(readings)
    avg_hr   = sum(r.get("hr", 0)   for r in readings) / n
    avg_spo2 = sum(r.get("spo2", 0) for r in readings) / n
    avg_temp = sum(r.get("temp", 0) for r in readings) / n
    max_g    = max(r.get("gforce", 1.0) for r in readings)
    falls    = sum(1 for r in readings if r.get("fall"))
    latest   = readings[-1]

    user_msg = f"""Patient ID: {patient_id}
Analysis window: last {n} readings
Average HR: {avg_hr:.0f} BPM | Average SpO2: {avg_spo2:.0f}% | Average Temp: {avg_temp:.1f}°C
Peak G-force: {max_g:.1f}G | Falls detected: {falls}
Latest reading: HR={latest.get('hr')} BPM, SpO2={latest.get('spo2')}%, Temp={latest.get('temp')}°C, Fall={latest.get('fall')}

Provide a brief health status summary, flag any concerns, and give one actionable recommendation."""

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=200,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return _fallback_insight(readings)


def explain_alert(reading: dict) -> str:
    """
    Explain a specific anomaly in plain English.
    """
    hr   = reading.get("hr", 0)
    spo2 = reading.get("spo2", 0)
    temp = reading.get("temp", 36.5)
    fall = reading.get("fall", False)
    g    = reading.get("gforce", 1.0)

    try:
        client = _get_client()
        user_msg = f"""Alert reading: HR={hr} BPM, SpO2={spo2}%, Temp={temp}°C, G-force={g:.1f}G, Fall={fall}.
Explain this alert in 2–3 simple sentences a patient can understand. What does it mean? What should they do?"""
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=120,
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return _fallback_explain(reading)


# ── rule-based fallbacks (no API key required) ───────────────────────────────
def _fallback_insight(readings: list[dict]) -> str:
    if not readings:
        return "Insufficient data."
    latest = readings[-1]
    hr, spo2, temp = latest.get("hr", 0), latest.get("spo2", 0), latest.get("temp", 36.5)
    parts = []
    if hr > 120:   parts.append(f"HR elevated at {hr} BPM — possible tachycardia.")
    elif hr < 50:  parts.append(f"HR low at {hr} BPM — monitor closely.")
    if spo2 < 90:  parts.append(f"SpO₂ critically low at {spo2}% — seek immediate care.")
    elif spo2 < 94: parts.append(f"SpO₂ below normal at {spo2}%.")
    if temp > 38.5: parts.append(f"Fever detected: {temp:.1f}°C.")
    if latest.get("fall"): parts.append("Fall detected — check patient condition.")
    return " ".join(parts) if parts else f"Vitals within normal range. HR {hr} BPM, SpO₂ {spo2}%, Temp {temp:.1f}°C."


def _fallback_explain(reading: dict) -> str:
    parts = []
    if reading.get("fall"): parts.append("A fall was detected.")
    if reading.get("hr", 0) > 120: parts.append("Heart rate is very high.")
    if reading.get("spo2", 100) < 94: parts.append("Blood oxygen is lower than normal.")
    return " ".join(parts) or "An anomaly was detected. Please consult your doctor."
