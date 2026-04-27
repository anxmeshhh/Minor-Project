"""
simulation.py — Software simulation engine for demo scenarios.
Generates realistic, time-varying vitals without any hardware.
Mirrors the Vite mock plugin logic so both modes behave identically.
"""
import math, random, time


def build(tick: int, scenario: str | None) -> dict:
    """Return a single VitalsReading dict for the current tick and scenario."""
    t = tick / 10.0

    # Base sinusoidal mock (normal healthy adult)
    hr     = round(78 + math.sin(t) * 8 + (random.random() - 0.5) * 4)
    spo2   = round(97 + math.sin(t / 3) * 1 + (random.random() - 0.5) * 1)
    temp   = round(36.6 + math.sin(t / 5) * 0.4 + (random.random() - 0.5) * 0.2, 1)
    gforce = round(1.0 + abs(math.sin(t / 2)) * 0.3 + (random.random() - 0.5) * 0.2, 2)
    fall   = False
    accelX = round(0.09 * math.sin(t * 0.83) + 0.04 * math.sin(t * 2.17 + 1.1), 2)
    accelY = round(0.07 * math.sin(t * 0.61 + 0.5) + 0.03 * math.sin(t * 1.91 + 2.3), 2)
    accelZ = round(0.975 + 0.015 * math.sin(t * 0.27 + 0.2), 2)

    # Overlay scenario effects
    if scenario:
        # Use tick as age proxy (resets when scenario changes)
        age = tick % 120  # reset every 120 ticks to keep demo fresh

        if scenario == "hypoxia":
            spo2   = max(82, round(97 - (age / 40) * 15 + (random.random() - 0.5) * 2))
            hr     = round(75 + min(age / 40, 1) * 28 + (random.random() - 0.5) * 3)

        elif scenario == "fall":
            fall   = age < 5
            gforce = round(4.5 + random.random() * 1.5, 2) if age < 5 else round(1.2 + random.random() * 0.2, 2)

        elif scenario == "tachycardia":
            hr     = round(100 + min(age * 1.5, 50) + (random.random() - 0.5) * 5)

        elif scenario == "fever":
            temp   = round(36.6 + min(age / 30, 1) * 2.4 + (random.random() - 0.5) * 0.1, 1)

    # Clamp values to physiological limits
    hr   = max(30, min(220, hr))
    spo2 = max(70, min(100, spo2))

    # Compute derived fields
    import risk
    r     = risk.compute(hr, spo2, temp, gforce, fall)
    alert = hr < 50 or hr > 120 or spo2 < 94 or fall

    return {
        "timestamp": int(time.time() * 1000),
        "patient_id": 1,
        "hr": hr, "spo2": spo2, "temp": temp,
        "gforce": gforce, "fall": fall,
        "accelX": accelX, "accelY": accelY, "accelZ": accelZ,
        "finger": True, "ir": 150000,
        "alert": alert, "risk": r,
        "source": "simulation",
    }
