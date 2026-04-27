"""
simulation/scenarios/tachycardia.py
=====================================
Scenario: Exercise-Induced Tachycardia / SVT
Medical context: HR ramps from baseline 78 → 145 BPM over ~35s.
  Models either exertion tachycardia or supraventricular tachycardia (SVT).
  The rise is non-linear (fast initial rise, plateau at peak).
Research refs:
  - Page RL et al. (2016). "2015 ACC/AHA/HRS Guideline for SVT Management." JACC.
  - Neumar RW et al. (2010). "Adult ACLS Guidelines." Circulation.
Research gaps: G2 (patient dashboard), G7 (doctor alert integration).
"""
import math, random


METADATA = {
    "id":          "tachycardia",
    "label":       "Tachycardia",
    "description": "HR ramps from 78 → 145 BPM over 35s (SVT / exertion model). "
                   "Triggers L1 doctor alert when HR > 120.",
    "medical_ref": "Page RL et al. (2016) JACC — SVT HR typically 150–250 BPM",
    "gaps":        ["G2", "G7"],
    "expected_risk_range": [45, 80],
    "expected_escalation_tier": 1,
    "system_response": [
        "HR > 120 → alert flag = true in frontend",
        "Risk score → 60+ → L1: Doctor notified",
        "Patient dashboard shows animated critical badge",
    ],
}


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    # Non-linear ramp using tanh for realistic acceleration
    progress = math.tanh(age_ticks / 20.0)
    hr = round(78 + progress * 67 + math.sin(t * 1.5) * 4 + (random.random() - 0.5) * 3)
    hr = min(160, hr)

    # SpO2 slightly dips under heavy tachycardia
    spo2 = round(98 - progress * 3 + (random.random() - 0.5) * 1.0)
    spo2 = max(93, spo2)

    temp = round(36.7 + progress * 0.4 + (random.random() - 0.5) * 0.1, 1)  # mild exercise warmth
    gforce = round(1.0 + progress * 0.4 + (random.random() - 0.5) * 0.2, 2)  # restlessness

    accelX = round(0.1 * math.sin(t * 1.2) + progress * 0.15 * (random.random() - 0.5), 3)
    accelY = round(0.08 * math.sin(t * 0.9 + 0.5) + progress * 0.1 * (random.random() - 0.5), 3)
    accelZ = round(0.98 + 0.02 * math.sin(t * 0.4), 3)

    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
