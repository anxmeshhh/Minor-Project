"""
simulation/engine.py
======================
Central simulation engine and scenario registry.
All scenarios are registered here. The engine is the single call point
used by both Flask routes and the ML dataset generator.
"""
import time
from simulation.scenarios import (
    normal, hypoxia, fall, tachycardia, fever,
    bradycardia, sleep_apnea, arrhythmia, exercise,
)
from core.risk import compute as compute_risk

# ── Scenario registry ─────────────────────────────────────────────────────────
REGISTRY: dict[str, object] = {
    "normal":       normal,
    "hypoxia":      hypoxia,
    "fall":         fall,
    "tachycardia":  tachycardia,
    "fever":        fever,
    "bradycardia":  bradycardia,
    "sleep_apnea":  sleep_apnea,
    "arrhythmia":   arrhythmia,
    "exercise":     exercise,
}

# Label index (used for ML dataset)
LABEL_MAP: dict[str, int] = {k: i for i, k in enumerate(REGISTRY)}


def list_scenarios() -> list[dict]:
    """Return all scenario metadata for the API and Demo Panel."""
    return [mod.METADATA for mod in REGISTRY.values()]


def get_metadata(scenario_id: str) -> dict | None:
    mod = REGISTRY.get(scenario_id)
    return mod.METADATA if mod else None


def build(tick: int, scenario_id: str | None, age_ticks: int = 0) -> dict:
    """
    Generate one vitals reading for the given scenario and tick.
    Falls back to 'normal' if scenario_id is None or unknown.
    """
    mod = REGISTRY.get(scenario_id or "normal", normal)
    raw = mod.generate(tick, age_ticks)

    # Compute derived fields consistent with glove.cpp logic
    hr, spo2, temp = raw["hr"], raw["spo2"], raw["temp"]
    gforce, fall_f = raw["gforce"], raw["fall"]

    risk  = compute_risk(hr, spo2, temp, gforce, fall_f)
    alert = hr < 50 or hr > 120 or spo2 < 94 or fall_f

    return {
        "timestamp":  int(time.time() * 1000),
        "patient_id": 1,
        "hr":         hr,
        "spo2":       spo2,
        "temp":       temp,
        "gforce":     gforce,
        "fall":       fall_f,
        "accelX":     raw.get("accelX", 0.0),
        "accelY":     raw.get("accelY", 0.0),
        "accelZ":     raw.get("accelZ", 1.0),
        "finger":     True,
        "ir":         150000,
        "alert":      alert,
        "risk":       risk,
        "source":     "simulation",
        "scenario":   scenario_id or "normal",
    }


def generate_dataset(samples_per_scenario: int = 500) -> tuple[list, list]:
    """
    Generate a labelled dataset for ML training.
    Returns (X, y) where X is a list of feature vectors and y is label indices.
    Called by ml/trainer.py.
    """
    X, y = [], []
    for sid, mod in REGISTRY.items():
        label = LABEL_MAP[sid]
        for i in range(samples_per_scenario):
            reading = build(tick=i, scenario_id=sid, age_ticks=i % 90)
            features = [
                reading["hr"],
                reading["spo2"],
                reading["temp"],
                reading["gforce"],
                float(reading["fall"]),
                reading["accelX"],
                reading["accelY"],
                reading["accelZ"],
                reading["risk"],
            ]
            X.append(features)
            y.append(label)
    return X, y
