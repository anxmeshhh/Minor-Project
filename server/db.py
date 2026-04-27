"""
db.py — MySQL connection pool and all database helpers
"""
import os
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()

_pool: pooling.MySQLConnectionPool | None = None


def init():
    global _pool
    host     = os.getenv("MYSQL_HOST", "localhost")
    port     = int(os.getenv("MYSQL_PORT", 3306))
    user     = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "theanimesh2005")
    dbname   = os.getenv("MYSQL_DB", "vitalglove")

    # ── Step 1: Create the database if it doesn't exist ──────────────────────
    try:
        tmp = mysql.connector.connect(host=host, port=port, user=user, password=password)
        cur = tmp.cursor()
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{dbname}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        tmp.commit()
        cur.close(); tmp.close()
        print(f"[DB] Database '{dbname}' is ready")
    except Exception as e:
        print(f"[DB] WARNING: Could not create database - running without persistence. {e}")
        _pool = None
        return

    # ── Step 2: Connect the pool to the database ──────────────────────────────
    try:
        _pool = pooling.MySQLConnectionPool(
            pool_name="vg", pool_size=5,
            host=host, port=port, user=user, password=password, database=dbname,
        )
        print(f"[DB] Connected pool -> {host}:{port}/{dbname}")
        _create_tables()
    except Exception as e:
        print(f"[DB] WARNING: Pool creation failed - running without persistence. {e}")
        _pool = None


def _conn():
    if _pool is None:
        raise RuntimeError("DB pool not initialised")
    return _pool.get_connection()


def _create_tables():
    """Create tables if they don't exist (idempotent)."""
    ddl = """
    CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) DEFAULT 'Demo Patient',
        age INT DEFAULT 25,
        `condition` VARCHAR(200) DEFAULT 'Monitoring',
        doctor_id INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telemetry_readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL DEFAULT 1,
        timestamp BIGINT NOT NULL,
        hr INT, spo2 INT, temp FLOAT,
        gforce FLOAT, fall BOOLEAN,
        accel_x FLOAT DEFAULT 0, accel_y FLOAT DEFAULT 0, accel_z FLOAT DEFAULT 0,
        risk_score INT, alert_flag BOOLEAN,
        source ENUM('device','simulation') DEFAULT 'device',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT DEFAULT 1,
        type VARCHAR(50),
        severity ENUM('safe','caution','critical') DEFAULT 'safe',
        detail VARCHAR(200),
        reading_id INT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT DEFAULT 1,
        insight TEXT,
        urgency VARCHAR(20) DEFAULT 'safe',
        ml_class VARCHAR(50),
        ml_confidence FLOAT,
        risk_score INT,
        doctor_specialty VARCHAR(100),
        model VARCHAR(50) DEFAULT 'llama3-70b-8192',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS family_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_by INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS family_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        patient_id INT,
        name VARCHAR(100) NOT NULL,
        relation VARCHAR(50) DEFAULT 'self',
        role ENUM('admin','member') DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        category ENUM('symptoms','medications','medical_history','prescriptions','doctor_notes') NOT NULL,
        text TEXT NOT NULL,
        added_by VARCHAR(100) DEFAULT 'Self',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS doctor_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        member_name VARCHAR(100),
        status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        ai_summary TEXT,
        ai_urgency VARCHAR(20),
        ml_class VARCHAR(50),
        risk_score INT,
        doctor_specialty VARCHAR(100),
        doctor_name VARCHAR(100),
        doctor_notes TEXT,
        prescription TEXT,
        urgent_appointment VARCHAR(200),
        responded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT,
        member_id INT,
        type ENUM('alert','doctor_response','ai_scan','member_update','appointment') NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure at least one demo patient exists
    INSERT IGNORE INTO patients (id, name, age, `condition`) VALUES (1, 'Riya Sharma', 64, 'Cardiac Monitoring');

    -- Seed the demo family group
    INSERT IGNORE INTO family_groups (id, name, created_by) VALUES (1, 'The Sharma Family', 1);

    -- Seed family members
    INSERT IGNORE INTO family_members (id, group_id, patient_id, name, relation, role) VALUES
        (1, 1, 1, 'Riya Sharma', 'self', 'admin'),
        (2, 1, NULL, 'Priya Sharma', 'spouse', 'member'),
        (3, 1, NULL, 'Raj Sharma', 'son', 'member');
    """
    c = _conn()
    cur = c.cursor()
    for stmt in [s.strip() for s in ddl.split(";") if s.strip()]:
        cur.execute(stmt)
    c.commit()
    cur.close()
    c.close()
    print("[DB] All tables verified (patients, telemetry, alerts, ai_insights, family_groups, family_members, health_entries, doctor_requests, notifications)")


# ── write helpers ─────────────────────────────────────────────────────────────
def save_reading(r: dict) -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """INSERT INTO telemetry_readings
           (patient_id, timestamp, hr, spo2, temp, gforce, fall,
            accel_x, accel_y, accel_z, risk_score, alert_flag, source)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            r.get("patient_id", 1), r["timestamp"],
            r["hr"], r["spo2"], r["temp"], r["gforce"], r["fall"],
            r.get("accelX", 0), r.get("accelY", 0), r.get("accelZ", 0),
            r["risk"], r["alert"], r.get("source", "device"),
        ),
    )
    c.commit()
    row_id = cur.lastrowid
    cur.close(); c.close()
    return row_id


def save_alert(patient_id: int, alert: dict, reading_id: int):
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """INSERT INTO alerts (patient_id, type, severity, detail, reading_id)
           VALUES (%s,%s,%s,%s,%s)""",
        (patient_id, alert["type"], alert["severity"], alert["detail"], reading_id),
    )
    c.commit()
    cur.close(); c.close()


def save_insight(patient_id: int, insight: str, model: str = "llama3-70b-8192"):
    c = _conn()
    cur = c.cursor()
    cur.execute(
        "INSERT INTO ai_insights (patient_id, insight, model) VALUES (%s,%s,%s)",
        (patient_id, insight, model),
    )
    c.commit()
    cur.close(); c.close()


# ── read helpers ──────────────────────────────────────────────────────────────
def get_latest(patient_id: int = 1) -> dict | None:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM telemetry_readings WHERE patient_id=%s ORDER BY id DESC LIMIT 1",
        (patient_id,),
    )
    row = cur.fetchone()
    cur.close(); c.close()
    return row


def get_history(patient_id: int = 1, n: int = 60) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute(
        """SELECT timestamp, hr, spo2, temp, gforce, fall, risk_score AS risk, alert_flag AS alert
           FROM telemetry_readings WHERE patient_id=%s ORDER BY id DESC LIMIT %s""",
        (patient_id, n),
    )
    rows = cur.fetchall()
    cur.close(); c.close()
    return list(reversed(rows))


def get_alerts(patient_id: int = 1, limit: int = 20) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute(
        """SELECT id, type, severity, detail, resolved, created_at
           FROM alerts WHERE patient_id=%s ORDER BY id DESC LIMIT %s""",
        (patient_id, limit),
    )
    rows = cur.fetchall()
    cur.close(); c.close()
    return rows


def list_patients() -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT id, name, age, `condition` FROM patients ORDER BY id")
    rows = cur.fetchall()
    cur.close(); c.close()
    return rows
