"""
risk.py — Risk scoring engine (mirrors TypeScript getAlertReasons)
"""


def compute(hr: int, spo2: int, temp: float, gforce: float, fall: bool) -> int:
    """Return a 0-100 risk score."""
    score = 10
    if hr > 120 or hr < 50:
        score += 35
    elif hr > 100:
        score += 15
    if spo2 < 90:
        score += 45
    elif spo2 < 94:
        score += 30
    if temp > 38.5:
        score += 20
    elif temp > 38.0:
        score += 10
    if temp < 35.0 and temp > 10:
        score += 15
    if fall:
        score += 50
    if gforce > 3.0:
        score += 15
    return min(100, score)


def get_level(score: int) -> str:
    if score <= 40:
        return "safe"
    if score <= 70:
        return "caution"
    return "critical"


def get_alert_reasons(reading: dict) -> list[dict]:
    reasons = []
    hr   = int(reading.get("hr", 0))
    spo2 = int(reading.get("spo2", 0))
    temp = float(reading.get("temp", 36.5))
    fall = bool(reading.get("fall", False))
    g    = float(reading.get("gforce", 1.0))

    if fall:
        reasons.append({"type": "Fall Detected", "severity": "critical", "detail": f"Impact {g:.1f}G"})
    if hr > 120:
        reasons.append({"type": "High HR", "severity": "critical", "detail": f"{hr} BPM"})
    elif hr < 50 and hr > 0:
        reasons.append({"type": "Low HR", "severity": "critical", "detail": f"{hr} BPM"})
    if spo2 > 0 and spo2 < 90:
        reasons.append({"type": "Severe Hypoxia", "severity": "critical", "detail": f"SpO₂ {spo2}%"})
    elif spo2 > 0 and spo2 < 94:
        reasons.append({"type": "Low SpO₂", "severity": "caution", "detail": f"SpO₂ {spo2}%"})
    if temp > 38.5:
        reasons.append({"type": "High Fever", "severity": "critical", "detail": f"{temp:.1f}°C"})
    elif temp > 38.0:
        reasons.append({"type": "Fever", "severity": "caution", "detail": f"{temp:.1f}°C"})

    return reasons
