"""
simulation/scenarios/exercise.py
====================================
Scenario: Exercise / Physical Exertion
Medical context: HR rises from resting (72) → peak exercise (155 BPM),
  SpO₂ dips slightly, temperature rises from sweating, G-force increases markedly
  from arm/hand motion. Models a brisk walk → jog → cool-down cycle (~2 min total).
Research refs:
  - Bhambhani Y et al. (1994). "SpO₂ during maximal exercise." Eur J Applied Physiology.
  - ACSM Guidelines for Exercise Testing (2022), 11th edition.
Research gaps: G1 (real-world activity monitoring), G3 (multi-profile scalability).
"""
import math, random


METADATA = {
    "id":          "exercise",
    "label":       "Physical Exercise",
    "description": "Brisk walk → jog → cool-down. HR peaks at 155 BPM, temp rises to 37.6°C, "
                   "G-force fluctuates with arm motion. Models a 2-minute exercise bout.",
    "medical_ref": "ACSM Guidelines (2022) — max HR ≈ 220 - age; exercise SpO₂ can dip 1–3%",
    "gaps":        ["G1", "G3"],
    "expected_risk_range": [15, 55],
    "expected_escalation_tier": 0,
    "system_response": [
        "HR > 100 → 'caution' badge, no alert (normal exercise)",
        "G-force spikes visible in motion trend",
        "Groq AI notes this is likely exertion, not a cardiac event",
    ],
}

_RAMP_UP   = 40   # ticks to reach peak
_PEAK      = 60   # ticks at peak
_COOL_DOWN = 80   # ticks to recover


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0

    if age_ticks < _RAMP_UP:
        phase = age_ticks / _RAMP_UP
        label = "warmup"
    elif age_ticks < _RAMP_UP + _PEAK:
        phase = 1.0
        label = "peak"
    else:
        phase = 1.0 - min((age_ticks - _RAMP_UP - _PEAK) / _COOL_DOWN, 1.0)
        label = "cooldown"

    hr     = round(72 + phase * 83 + math.sin(t * 2) * 5 + (random.random() - 0.5) * 4)
    hr     = max(60, min(165, hr))
    spo2   = round(98 - phase * 2.5 + (random.random() - 0.5) * 1.0)
    spo2   = max(94, spo2)
    temp   = round(36.6 + phase * 1.0 + (random.random() - 0.5) * 0.1, 1)

    # Arm motion: rhythmic gait pattern
    gforce  = round(1.0 + phase * 0.8 + math.sin(t * 3.5) * 0.5 * phase + (random.random() - 0.5) * 0.2, 2)
    accelX  = round(phase * 0.35 * math.sin(t * 3.5) + (random.random() - 0.5) * 0.05, 3)
    accelY  = round(phase * 0.25 * math.sin(t * 3.5 + 0.5) + (random.random() - 0.5) * 0.05, 3)
    accelZ  = round(gforce * 0.85 + (random.random() - 0.5) * 0.05, 3)

    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=False,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
