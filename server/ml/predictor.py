"""
ml/predictor.py
=================
Loads the trained model and provides real-time inference.
Handles both scaled (SVM/MLP) and unscaled (RF/GBT) models transparently.
"""
import os, pickle, json
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
META_PATH  = os.path.join(os.path.dirname(__file__), "model_meta.json")

_model = None
_scaler = None
_needs_scaling = False
_meta  = None


def _load():
    global _model, _scaler, _needs_scaling, _meta
    if not os.path.exists(MODEL_PATH):
        return False
    try:
        with open(MODEL_PATH, "rb") as f:
            obj = pickle.load(f)
        if isinstance(obj, dict):
            _model = obj["model"]
            _scaler = obj.get("scaler")
            _needs_scaling = obj.get("needs_scaling", False)
        else:
            _model = obj  # backwards compat with old model.pkl
            _scaler = None
            _needs_scaling = False
        with open(META_PATH, "r") as f:
            _meta = json.load(f)
        return True
    except Exception as e:
        print(f"[ML] Could not load model: {e}")
        return False


def is_ready() -> bool:
    return _model is not None or _load()


def predict(reading: dict) -> dict:
    """
    Classify a reading into one of the 9 scenario classes.
    Returns: { predicted_class, confidence, probabilities }
    """
    if not is_ready():
        return {"predicted_class": "unknown", "confidence": 0.0, "model_ready": False}

    features = np.array([[
        reading.get("hr", 0),
        reading.get("spo2", 0),
        reading.get("temp", 36.5),
        reading.get("gforce", 1.0),
        float(reading.get("fall", False)),
        reading.get("accelX", 0.0),
        reading.get("accelY", 0.0),
        reading.get("accelZ", 1.0),
        reading.get("risk", 10),
    ]])

    if _needs_scaling and _scaler is not None:
        features = _scaler.transform(features)

    proba   = _model.predict_proba(features)[0]
    classes = _meta["classes"]
    idx     = int(np.argmax(proba))

    return {
        "predicted_class": classes[idx],
        "confidence":      round(float(proba[idx]), 4),
        "probabilities":   {c: round(float(p), 4) for c, p in zip(classes, proba)},
        "model_ready":     True,
        "algorithm":       _meta.get("best_algorithm", "unknown"),
    }


def get_meta() -> dict:
    if not is_ready():
        return {"model_ready": False, "hint": "Run: python ml/trainer.py"}
    return {**_meta, "model_ready": True}
