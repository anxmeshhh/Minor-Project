"""
simulation/scenarios/hypoxia.py
=================================
Scenario: Progressive Hypoxia (Oxygen Desaturation Event)
Medical context: SpO₂ falls progressively from 97% → 82% over ~40s,
  simulating respiratory distress, high-altitude exposure, or COPD exacerbation.
  Compensatory tachycardia raises HR (75 → 103 BPM).
Research refs:
  - Jubran A. (2015). "Pulse oximetry." Critical Care, 19(1), 272.
  - WHO pulse oximetry training manual (2011).
Research gaps: G4 (emergency escalation), G7 (doctor integration).
"""
import math, random


METADATA = {
    "id":          "hypoxia",
    "label":       "Hypoxia Event",
    "description": "SpO₂ drops progressively to 82% over 40s. Compensatory HR rise to ~103 BPM. "
                   "Triggers L2 escalation (doctor + family notified).",
    "medical_ref": "Jubran A. (2015) Critical Care 19:272 — SpO₂ <90% = critical hypoxia",
    "gaps":        ["G4", "G7"],
    "expected_risk_range": [55, 95],
    "expected_escalation_tier": 2,
    "system_response": [
        "Risk score crosses 60 → L1: Doctor alerted",
        "Risk score crosses 80 → L2: Family notified",
        "Groq AI generates alert explanation",
    ],
}


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    # SpO₂ falls from 97 toward 82 over 40 ticks, then stabilises
    progress = min(age_ticks / 40.0, 1.0)
    spo2 = max(82, round(97 - progress * 15 + (random.random() - 0.5) * 1.5))
    # Compensatory tachycardia
    hr   = round(75 + progress * 28 + math.sin(t) * 3 + (random.random() - 0.5) * 2)
    temp = round(36.7 + (random.random() - 0.5) * 0.1, 1)
    gforce = round(1.0 + (random.random() - 0.5) * 0.1, 2)
    accelX = round(0.06 * math.sin(t * 0.83), 3)
    accelY = round(0.05 * math.sin(t * 0.61), 3)
    accelZ = round(0.98 + 0.01 * math.sin(t * 0.27), 3)
    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
