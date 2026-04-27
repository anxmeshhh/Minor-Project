"""
app.py — VitalGlove Flask entry point
Thin wiring layer: sets up Flask, registers blueprints, starts Socket.IO.
All route logic lives in api/
"""
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import config, db

app = Flask(__name__)
app.config["SECRET_KEY"] = config.SECRET_KEY
CORS(app, origins=config.ALLOWED_CORS)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Shared socketio ref used by blueprints
app.config["SOCKETIO"] = socketio

# ── Register API blueprints ───────────────────────────────────────────────────
from api.telemetry  import bp as telemetry_bp
from api.vitals     import bp as vitals_bp
from api.demo       import bp as demo_bp
from api.ai_routes  import bp as ai_bp
from api.patients   import bp as patients_bp
from api.ml_routes  import bp as ml_bp
from api.emergency  import bp as emergency_bp

app.register_blueprint(telemetry_bp)
app.register_blueprint(vitals_bp)
app.register_blueprint(demo_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(patients_bp)
app.register_blueprint(ml_bp)
app.register_blueprint(emergency_bp)

# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return {"status": "ok", "service": "VitalGlove Backend"}

# ── Socket.IO ─────────────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print("[WS] Client connected")

if __name__ == "__main__":
    print(f"[VitalGlove] Starting Flask on port {config.FLASK_PORT}")
    db.init()
    socketio.run(app, host="0.0.0.0", port=config.FLASK_PORT, debug=True, use_reloader=False)
