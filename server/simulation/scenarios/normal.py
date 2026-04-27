"""
simulation/scenarios/normal.py
================================
Scenario: Normal Resting Monitoring
Medical context: Healthy adult at rest. HR 65–80, SpO₂ 96–99%, temp 36.4–36.8°C, G ≈ 1.0.
Research gap demonstrated: G1 (real deployment), G6 (edge+cloud hybrid).
"""
import math, random


METADATA = {
    "id":          "normal",
    "label":       "Normal Monitoring",
    "description": "Healthy baseline vitals — resting adult. HR 65–80 BPM, SpO₂ 97–99%.",
    "medical_ref": "WHO normal vitals (2023): HR 60–100, SpO₂ >95%, Temp 36.1–37.2°C",
    "gaps":        ["G1", "G2", "G6"],
    "expected_risk_range": [5, 20],
    "expected_escalation_tier": 0,
}


def generate(tick: int, age_ticks: int) -> dict:
    """Generate one vitals sample for the normal scenario."""
    t = tick / 10.0
    hr     = round(72 + math.sin(t * 0.83) * 7 + (random.random() - 0.5) * 3)
    spo2   = round(98 + math.sin(t * 0.31) * 0.8 + (random.random() - 0.5) * 0.5)
    temp   = round(36.6 + math.sin(t * 0.19) * 0.15 + (random.random() - 0.5) * 0.05, 1)
    gforce = round(1.0  + math.sin(t * 0.47) * 0.08 + (random.random() - 0.5) * 0.05, 2)
    accelX = round(0.06 * math.sin(t * 0.83) + 0.02 * math.sin(t * 2.1), 3)
    accelY = round(0.05 * math.sin(t * 0.61 + 0.5) + 0.02 * math.sin(t * 1.9), 3)
    accelZ = round(0.98 + 0.01 * math.sin(t * 0.27), 3)
    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
