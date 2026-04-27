"""
core/risk.py — Clinical risk scoring engine
Mirrors glove.cpp thresholds exactly so hardware and software agree.
"""
from config import (
    HR_LOW, HR_HIGH, HR_CRITICAL_LOW, HR_CRITICAL_HIGH,
    SPO2_CAUTION, SPO2_CRITICAL, SPO2_SEVERE,
    TEMP_FEVER, TEMP_HIGH_FEVER, TEMP_HYPO,
    FALL_G_THRESH, CRITICAL_G,
)


def compute(hr: int, spo2: int, temp: float, gforce: float, fall: bool) -> int:
    """Return a 0–100 risk score matching glove.cpp logic."""
    score = 10

    # Heart rate
    if hr > HR_CRITICAL_HIGH or (0 < hr < HR_CRITICAL_LOW):
        score += 45
    elif hr > HR_HIGH or (0 < hr < HR_LOW):
        score += 30
    elif hr > 100:
        score += 10

    # SpO2
    if 0 < spo2 < SPO2_SEVERE:
        score += 45
    elif 0 < spo2 < SPO2_CRITICAL:
        score += 35
    elif 0 < spo2 < SPO2_CAUTION:
        score += 20

    # Temperature
    if temp > TEMP_HIGH_FEVER:
        score += 20
    elif temp > TEMP_FEVER:
        score += 10
    if 10 < temp < TEMP_HYPO:
        score += 18

    # Motion / fall
    if fall:
        score += 50
    elif gforce > CRITICAL_G:
        score += 20
    elif gforce > FALL_G_THRESH:
        score += 10

    return min(100, score)


def get_level(score: int) -> str:
    if score <= 40:  return "safe"
    if score <= 70:  return "caution"
    return "critical"


def get_alert_reasons(reading: dict) -> list[dict]:
    """Return a list of alert reason dicts for the given reading."""
    hr   = int(reading.get("hr", 0))
    spo2 = int(reading.get("spo2", 0))
    temp = float(reading.get("temp", 36.5))
    fall = bool(reading.get("fall", False))
    g    = float(reading.get("gforce", 1.0))

    reasons = []
    if fall:
        reasons.append({"type": "Fall Detected",  "severity": "critical", "detail": f"Impact {g:.1f}G"})
    if 0 < hr > HR_CRITICAL_HIGH:
        reasons.append({"type": "Severe Tachycardia", "severity": "critical", "detail": f"{hr} BPM"})
    elif 0 < hr > HR_HIGH:
        reasons.append({"type": "High HR",         "severity": "caution",  "detail": f"{hr} BPM"})
    if 0 < hr < HR_CRITICAL_LOW:
        reasons.append({"type": "Severe Bradycardia", "severity": "critical", "detail": f"{hr} BPM"})
    elif 0 < hr < HR_LOW:
        reasons.append({"type": "Low HR",          "severity": "caution",  "detail": f"{hr} BPM"})
    if 0 < spo2 < SPO2_SEVERE:
        reasons.append({"type": "Severe Hypoxia",  "severity": "critical", "detail": f"SpO₂ {spo2}%"})
    elif 0 < spo2 < SPO2_CRITICAL:
        reasons.append({"type": "Hypoxia",         "severity": "critical", "detail": f"SpO₂ {spo2}%"})
    elif 0 < spo2 < SPO2_CAUTION:
        reasons.append({"type": "Low SpO₂",        "severity": "caution",  "detail": f"SpO₂ {spo2}%"})
    if temp > TEMP_HIGH_FEVER:
        reasons.append({"type": "High Fever",      "severity": "critical", "detail": f"{temp:.1f}°C"})
    elif temp > TEMP_FEVER:
        reasons.append({"type": "Fever",           "severity": "caution",  "detail": f"{temp:.1f}°C"})
    if 10 < temp < TEMP_HYPO:
        reasons.append({"type": "Hypothermia",     "severity": "critical", "detail": f"{temp:.1f}°C"})
    return reasons
