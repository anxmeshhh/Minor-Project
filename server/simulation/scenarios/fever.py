"""
simulation/scenarios/fever.py
================================
Scenario: Fever Progression
Medical context: Core body temperature rises from 36.6°C to 38.9°C over ~60s,
  modelling an infectious fever curve. HR rises proportionally (1 BPM per 0.5°C).
  SpO₂ stable until high fever causes mild respiratory compromise.
Research refs:
  - Dinarello CA & Porat R. (2022). "Fever." Harrison's Principles of Internal Medicine.
  - Laupland KB (2009). "Fever in the critically ill medical patient." CCM.
Research gaps: G2 (patient interface), G3 (scalability across patient profiles).
"""
import math, random


METADATA = {
    "id":          "fever",
    "label":       "Fever Progression",
    "description": "Temp rises from 36.6°C → 38.9°C over 60s. HR increases proportionally. "
                   "Triggers caution alert at 38°C, critical at 38.5°C.",
    "medical_ref": "Dinarello CA (2022) Harrison's — >38°C = fever, >39.5°C = high fever",
    "gaps":        ["G2", "G3"],
    "expected_risk_range": [20, 65],
    "expected_escalation_tier": 1,
    "system_response": [
        "Temp > 38°C → caution badge on patient dashboard",
        "Temp > 38.5°C → Risk score rises, L1 escalation",
        "Groq AI generates fever-specific health advice",
    ],
}

_PEAK_TEMP   = 38.9
_RAMP_TICKS  = 60.0


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    # Fever curve: sigmoid-like rise, with slight oscillation (chills)
    progress = min(age_ticks / _RAMP_TICKS, 1.0)
    base_temp = 36.6 + progress * (_PEAK_TEMP - 36.6)
    # Add realistic fever oscillation (chills = temp dips by 0.2°C every ~10s)
    chill_wave = 0.15 * math.sin(t * 0.9 + 1.2) if progress > 0.2 else 0
    temp = round(base_temp + chill_wave + (random.random() - 0.5) * 0.08, 1)

    # Proportional tachycardia: +10 BPM per 1°C above 37°C
    hr_delta = max(0, (temp - 37.0) * 10)
    hr = round(70 + hr_delta + math.sin(t * 0.7) * 3 + (random.random() - 0.5) * 2)

    # SpO2 stable until temp > 38.5°C (mild respiratory effect)
    spo2_drop = max(0, (temp - 38.5) * 2)
    spo2 = round(98 - spo2_drop + (random.random() - 0.5) * 0.5)
    spo2 = max(93, spo2)

    gforce = round(1.0 + (random.random() - 0.5) * 0.12, 2)
    accelX = round(0.06 * math.sin(t * 0.83), 3)
    accelY = round(0.05 * math.sin(t * 0.61), 3)
    accelZ = round(0.98 + 0.01 * math.sin(t * 0.27), 3)

    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
