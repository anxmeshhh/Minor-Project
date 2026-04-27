"""
simulation/scenarios/arrhythmia.py
=====================================
Scenario: Cardiac Arrhythmia (Irregular HR — Atrial Fibrillation-like)
Medical context: HR is irregular — jumping unpredictably between 60–140 BPM,
  modelling atrial fibrillation (AFib) with variable ventricular response.
  Unlike other scenarios, HR has no smooth trend — it's chaotic.
Research refs:
  - January CT et al. (2019). "2019 AHA/ACC/HRS Focused Update on AFib." JACC.
  - Fuster V et al. (2006). "ACC/AHA/ESC Guidelines for AFib Management." JACC.
Research gaps: G1 (continuous monitoring catches intermittent events), G6 (edge AI needed).
"""
import math, random


METADATA = {
    "id":          "arrhythmia",
    "label":       "Arrhythmia (AFib-like)",
    "description": "HR jumps irregularly between 60–140 BPM, mimicking AFib. "
                   "No smooth trend — random RR interval variation.",
    "medical_ref": "January CT et al. (2019) JACC — AFib: irregular irregular rhythm, no P waves",
    "gaps":        ["G1", "G6"],
    "expected_risk_range": [30, 75],
    "expected_escalation_tier": 1,
    "system_response": [
        "Irregular HR pattern visible in spark-line trend graph",
        "Groq AI notes the irregular pattern and recommends ECG",
        "Doctor dashboard flags high HR variability",
    ],
}

_last_hr = 75.0  # track state between calls for realism


def generate(tick: int, age_ticks: int) -> dict:
    global _last_hr
    t = tick / 10.0

    # AFib: random walk with drift + occasional PVC-like spikes
    step = (random.random() - 0.48) * 18  # biased slightly upward
    _last_hr = max(55.0, min(145.0, _last_hr + step))

    # Occasional compensatory pause (HR drops sharply then rebounds)
    if random.random() < 0.05:
        _last_hr = max(45.0, _last_hr - 30)
    elif random.random() < 0.05:
        _last_hr = min(150.0, _last_hr + 35)

    hr = round(_last_hr)

    spo2 = round(96 + (random.random() - 0.5) * 2)
    spo2 = max(92, spo2)
    temp = round(36.6 + (random.random() - 0.5) * 0.1, 1)
    gforce = round(1.0 + (random.random() - 0.5) * 0.1, 2)
    accelX = round(0.05 * math.sin(t * 0.83) + (random.random() - 0.5) * 0.03, 3)
    accelY = round(0.04 * math.sin(t * 0.61), 3)
    accelZ = round(0.98 + 0.01 * math.sin(t * 0.27), 3)

    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
