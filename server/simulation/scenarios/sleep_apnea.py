"""
simulation/scenarios/sleep_apnea.py
=====================================
Scenario: Obstructive Sleep Apnea (OSA) Pattern
Medical context: Periodic SpO₂ dips occurring every ~30s, each lasting ~10s.
  HR shows cyclic bradycardia during apnea, then rebound tachycardia.
  This models the classic "sawtooth" waveform seen in overnight oximetry studies.
Research refs:
  - Lévy P et al. (2015). "Obstructive sleep apnoea syndrome." Nature Reviews Disease Primers.
  - McNicholas WT (2008). "Diagnosis of obstructive sleep apnea in adults." AJRCCM.
Research gaps: G1 (continuous real-time deployment), G6 (edge detection of periodic pattern).
"""
import math, random


METADATA = {
    "id":          "sleep_apnea",
    "label":       "Sleep Apnea Pattern",
    "description": "Periodic SpO₂ dips every 30s (classic OSA sawtooth waveform). "
                   "HR shows cyclic bradycardia then rebound tachycardia.",
    "medical_ref": "Lévy P et al. (2015) Nature Reviews — SpO₂ dip >4% from baseline = OSA event",
    "gaps":        ["G1", "G6"],
    "expected_risk_range": [15, 55],
    "expected_escalation_tier": 1,
    "system_response": [
        "Periodic caution alerts at each apnea nadir",
        "Groq AI identifies the repeating pattern as OSA",
        "Doctor dashboard shows cyclical SpO₂ trough in trend graph",
    ],
}

_APNEA_PERIOD = 30   # ticks between apnea events
_APNEA_DEPTH  = 10   # seconds of SpO₂ nadir


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    # Cyclical dip using a clipped sine wave
    phase = (age_ticks % _APNEA_PERIOD) / _APNEA_PERIOD
    # Negative half of sine = apnea event
    apnea_depth = max(0.0, -math.sin(phase * 2 * math.pi))

    spo2 = round(97 - apnea_depth * 9 + (random.random() - 0.5) * 0.8)
    spo2 = max(85, spo2)

    # Cyclic HR: bradycardia during apnea, rebound after
    hr_variation = -8 * apnea_depth + 12 * math.sin(phase * 2 * math.pi + math.pi)
    hr = round(68 + hr_variation + (random.random() - 0.5) * 3)
    hr = max(45, min(110, hr))

    temp = round(36.5 + (random.random() - 0.5) * 0.05, 1)
    gforce = round(1.0 + apnea_depth * 0.1 + (random.random() - 0.5) * 0.05, 2)
    # Very small body movement (patient is sleeping)
    accelX = round(0.015 * math.sin(t * 0.31) + (random.random() - 0.5) * 0.01, 3)
    accelY = round(0.012 * math.sin(t * 0.25 + 0.3) + (random.random() - 0.5) * 0.01, 3)
    accelZ = round(0.99 + 0.005 * math.sin(t * 0.15), 3)

    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
