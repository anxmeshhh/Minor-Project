"""
config.py — All system constants in one place
"""
import os
from dotenv import load_dotenv
load_dotenv()

# ── Flask ──────────────────────────────────────────────────────────────────
FLASK_PORT   = int(os.getenv("FLASK_PORT", 5001))
SECRET_KEY   = os.getenv("SECRET_KEY", "vitalglove-dev")
ALLOWED_CORS = os.getenv("CORS_ORIGINS", "http://localhost:8080").split(",")

# ── MySQL ──────────────────────────────────────────────────────────────────
MYSQL_HOST   = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT   = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER   = os.getenv("MYSQL_USER", "root")
MYSQL_PASS   = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DB     = os.getenv("MYSQL_DB", "vitalglove")

# ── Groq AI ────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama3-70b-8192")

# ── Physiological thresholds (match glove.cpp defines) ────────────────────
HR_LOW          = 50
HR_HIGH         = 120
HR_CRITICAL_LOW = 40
HR_CRITICAL_HIGH= 150
SPO2_CAUTION    = 94
SPO2_CRITICAL   = 90
SPO2_SEVERE     = 85
TEMP_FEVER      = 38.0
TEMP_HIGH_FEVER = 38.5
TEMP_HYPO       = 35.0
FALL_G_THRESH   = 2.5
CRITICAL_G      = 4.0

# ── Escalation tiers ──────────────────────────────────────────────────────
ESCALATION_L1_RISK = 60   # Notify doctor
ESCALATION_L2_RISK = 80   # Notify family
ESCALATION_L3_RISK = 90   # Auto-call emergency (108)

# ── System timing (ms) ────────────────────────────────────────────────────
TELEMETRY_INTERVAL_MS = 500
ESP32_STALE_MS        = 6000   # mark device offline after this
