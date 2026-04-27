"""
simulation/scenarios/bradycardia.py
=====================================
Scenario: Bradycardia (Abnormally Low Heart Rate)
Medical context: HR drops from 72 → 38 BPM, simulating
  sick sinus syndrome, high vagal tone, or drug-induced bradycardia.
  SpO2 may drop due to reduced cardiac output.
Research refs:
  - Mangrum JM & DiMarco JP. (2000). "The evaluation and management of bradycardia."
    NEJM 342(10):703-709.
Research gaps: G2 (patient-facing alerts), G4 (emergency escalation).
"""
import math, random


METADATA = {
    "id":          "bradycardia",
    "label":       "Bradycardia",
    "description": "HR drops from 72 → 38 BPM. SpO₂ mild dip from reduced cardiac output. "
                   "Triggers L1 escalation (doctor notified).",
    "medical_ref": "Mangrum & DiMarco (2000) NEJM — HR <50 = symptomatic bradycardia",
    "gaps":        ["G2", "G4"],
    "expected_risk_range": [35, 75],
    "expected_escalation_tier": 1,
}


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    progress = min(age_ticks / 50.0, 1.0)
    hr   = round(72 - progress * 34 + math.sin(t * 0.5) * 3 + (random.random() - 0.5) * 2)
    hr   = max(30, hr)
    spo2 = round(98 - progress * 4 + (random.random() - 0.5) * 1.0)
    spo2 = max(91, spo2)
    temp = round(36.5 + (random.random() - 0.5) * 0.1, 1)
    gforce = round(1.0 + (random.random() - 0.5) * 0.06, 2)
    accelX = round(0.04 * math.sin(t * 0.83), 3)
    accelY = round(0.03 * math.sin(t * 0.61), 3)
    accelZ = round(0.98, 3)
    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
