"""
simulation/scenarios/fall.py
==============================
Scenario: Fall Detection Event
Medical context: Sudden free-fall followed by impact. G-force spikes to 4–6G for 200–500ms,
  followed by post-fall stillness. Based on MPU6050 accelerometer data patterns.
  Models the exact same waveform that glove.cpp detects using totalG > FALL_THRESHOLD_G.
Research refs:
  - Mubashir M. et al. (2013). "A survey on fall detection." Pervasive and Mobile Computing.
  - Igual R. et al. (2013). "Challenges, issues and trends in fall detection systems." BioMed Eng.
Research gaps: G1 (real hardware), G4 (emergency escalation → L3 auto-call).
"""
import math, random


METADATA = {
    "id":          "fall",
    "label":       "Fall Detection",
    "description": "G-force spikes to 4–6G for 5 ticks (impact), then post-fall stillness. "
                   "HR elevates due to shock response. Triggers L3 escalation.",
    "medical_ref": "Mubashir et al. (2013) Pervasive & Mobile Computing — G>2.5 = fall threshold",
    "gaps":        ["G1", "G4"],
    "expected_risk_range": [85, 100],
    "expected_escalation_tier": 3,
    "system_response": [
        "OLED vibration alert fires on ESP32 (VIBRO_PIN)",
        "fallDetected flag = true in glove.cpp",
        "Risk score → 90+ → L3: Emergency services dispatched",
        "Groq explains fall in plain English to patient",
    ],
}

# Waveform phases
_IMPACT_TICKS   = 5    # How long the G-force spike lasts
_RECOVERY_TICKS = 20   # Post-fall elevated HR period


def generate(tick: int, age_ticks: int) -> dict:
    t = tick / 10.0
    fall   = age_ticks < _IMPACT_TICKS

    if age_ticks < _IMPACT_TICKS:
        # ── Impact phase: free-fall then impact spike ──────────────────
        gforce = round(4.5 + random.random() * 1.8, 2)
        accelX = round((random.random() - 0.5) * 3.0, 3)
        accelY = round((random.random() - 0.5) * 2.5, 3)
        accelZ = round(gforce * (0.8 + random.random() * 0.2), 3)
        hr     = round(85 + random.random() * 10)   # initial shock
    elif age_ticks < _RECOVERY_TICKS:
        # ── Post-fall phase: patient is still, HR elevated (shock) ─────
        progress = (age_ticks - _IMPACT_TICKS) / _RECOVERY_TICKS
        gforce = round(1.1 + (1.0 - progress) * 0.8 + (random.random() - 0.5) * 0.1, 2)
        accelX = round((random.random() - 0.5) * 0.3, 3)
        accelY = round((random.random() - 0.5) * 0.2, 3)
        accelZ = round(gforce * 0.97, 3)
        hr     = round(110 - progress * 25 + (random.random() - 0.5) * 5)
    else:
        # ── Recovery phase: gradually returning to normal ──────────────
        gforce = round(1.05 + (random.random() - 0.5) * 0.08, 2)
        accelX = round(0.06 * math.sin(t * 0.83), 3)
        accelY = round(0.05 * math.sin(t * 0.61), 3)
        accelZ = round(0.98, 3)
        hr     = round(78 + (random.random() - 0.5) * 5)

    spo2 = round(97 + (random.random() - 0.5) * 1.0)
    temp = round(36.8 + (random.random() - 0.5) * 0.1, 1)
    return dict(hr=hr, spo2=spo2, temp=temp, gforce=gforce, fall=fall,
                accelX=accelX, accelY=accelY, accelZ=accelZ)
