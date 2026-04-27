"""
api/ml_routes.py — ML model endpoints
GET  /api/ml/info       — model metadata (accuracy, features)
POST /api/ml/predict    — classify a single reading
POST /api/ml/train      — trigger retraining (admin)
"""
from flask import Blueprint, request, jsonify
import ml.predictor as predictor

bp = Blueprint("ml", __name__)


@bp.route("/api/ml/info", methods=["GET"])
def ml_info():
    return jsonify(predictor.get_meta())


@bp.route("/api/ml/predict", methods=["POST"])
def ml_predict():
    reading = request.get_json(silent=True) or {}
    return jsonify(predictor.predict(reading))


@bp.route("/api/ml/train", methods=["POST"])
def ml_train():
    """Trigger model retraining in background (for research demos)."""
    import threading
    from ml.trainer import train

    def _run():
        try:
            meta = train(samples_per_scenario=600)
            predictor._model = None   # force reload on next predict
            print(f"[ML] Retrain complete — CV accuracy: {meta['cv_accuracy']}")
        except Exception as e:
            print(f"[ML] Retrain failed: {e}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return jsonify({"ok": True, "message": "Training started in background"})
