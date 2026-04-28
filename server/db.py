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
    """Create all tables if they don't exist (idempotent).
    Covers all 11 modules: Users, Family, Patient Profile, Medications,
    Checkups, Documents, Prescriptions, Sensor Data, ML Results, AI Results,
    Doctor Requests, Notifications.
    """
    ddl = """
    -- ═══════════════════ MODULE 1: USERS ═══════════════════
    CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) DEFAULT 'Demo Patient',
        age INT DEFAULT 25,
        `condition` VARCHAR(200) DEFAULT 'Monitoring',
        role ENUM('patient','family','doctor','admin') DEFAULT 'patient',
        email VARCHAR(200),
        doctor_id INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════ MODULE 1b: SENSOR DATA ═══════════════════
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

    -- ═══════════════════ MODULE 1c: AI INSIGHTS (LEGACY) ═══════════════════
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

    -- ═══════════════════ MODULE 2: FAMILY HUB ═══════════════════
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

    -- ═══════════════════ MODULE 3: HEALTH ENTRIES (UNIFIED CRUD) ═══════════════════
    CREATE TABLE IF NOT EXISTS health_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        category ENUM('symptoms','medications','medical_history','prescriptions','doctor_notes') NOT NULL,
        text TEXT NOT NULL,
        added_by VARCHAR(100) DEFAULT 'Self',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 4: PATIENT PROFILE ═══════════════════
    CREATE TABLE IF NOT EXISTS patient_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        age INT,
        gender VARCHAR(20),
        blood_group VARCHAR(10),
        height_cm FLOAT,
        weight_kg FLOAT,
        allergies TEXT,
        emergency_contact VARCHAR(100),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 5: CHECKUPS ═══════════════════
    CREATE TABLE IF NOT EXISTS checkups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        date DATE NOT NULL,
        report_notes TEXT,
        status ENUM('upcoming','done','cancelled') DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 6: DOCUMENTS ═══════════════════
    CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        file_name VARCHAR(200) NOT NULL,
        file_type VARCHAR(50) DEFAULT 'pdf',
        file_path VARCHAR(500),
        description TEXT,
        uploaded_by VARCHAR(100) DEFAULT 'Self',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 7: ML RESULTS (SEPARATE) ═══════════════════
    CREATE TABLE IF NOT EXISTS ml_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        prediction VARCHAR(100) NOT NULL,
        confidence FLOAT NOT NULL,
        risk_score INT,
        input_summary TEXT,
        model_version VARCHAR(50) DEFAULT 'rf_v1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 8: AI RESULTS (SEPARATE) ═══════════════════
    CREATE TABLE IF NOT EXISTS ai_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id INT NOT NULL,
        advice TEXT NOT NULL,
        urgency ENUM('safe','visit','emergency') DEFAULT 'safe',
        timeline TEXT,
        doctor_suggestion VARCHAR(200),
        ml_result_id INT,
        input_sources TEXT,
        model VARCHAR(50) DEFAULT 'llama3-70b-8192',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
    );

    -- ═══════════════════ MODULE 9: DOCTOR REQUESTS ═══════════════════
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

    -- ═══════════════════ MODULE 10: NOTIFICATIONS ═══════════════════
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

    -- ═══════════════════ MODULE 11: DOCTOR PROFILES ═══════════════════
    CREATE TABLE IF NOT EXISTS doctor_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        specialization VARCHAR(200),
        experience_years INT DEFAULT 0,
        availability VARCHAR(100) DEFAULT 'Available',
        hospital VARCHAR(200),
        phone VARCHAR(20),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    -- ═══════════════════ SEED DATA ═══════════════════
    -- Demo patient
    INSERT IGNORE INTO patients (id, name, age, `condition`, role) VALUES (1, 'Riya Sharma', 64, 'Cardiac Monitoring', 'patient');
    INSERT IGNORE INTO patients (id, name, age, `condition`, role) VALUES (2, 'Dr. Mehra', 45, 'Cardiologist', 'doctor');

    -- Family group
    INSERT IGNORE INTO family_groups (id, name, created_by) VALUES (1, 'The Sharma Family', 1);

    -- Family members
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

    # Seed health entries, checkups, profile, and initial ML/AI results if empty
    _seed_data()
    print("[DB] All 16 tables verified (patients, telemetry, alerts, ai_insights, family_groups, family_members, "
          "health_entries, patient_profiles, checkups, documents, ml_results, ai_results, doctor_requests, notifications, doctor_profiles)")


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


# ── ML + AI result helpers (Module 7 & 8) ─────────────────────────────────────
def save_ml_result(member_id: int, prediction: str, confidence: float,
                   risk_score: int = 0, input_summary: str = "") -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """INSERT INTO ml_results (member_id, prediction, confidence, risk_score, input_summary)
           VALUES (%s,%s,%s,%s,%s)""",
        (member_id, prediction, confidence, risk_score, input_summary),
    )
    c.commit()
    rid = cur.lastrowid
    cur.close(); c.close()
    return rid


def save_ai_result(member_id: int, advice: str, urgency: str = "safe",
                   timeline: str = "", doctor_suggestion: str = "",
                   ml_result_id: int = None, input_sources: str = "") -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """INSERT INTO ai_results (member_id, advice, urgency, timeline, doctor_suggestion,
           ml_result_id, input_sources)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (member_id, advice, urgency, timeline, doctor_suggestion, ml_result_id, input_sources),
    )
    c.commit()
    rid = cur.lastrowid
    cur.close(); c.close()
    return rid


def get_ml_results(member_id: int, limit: int = 10) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM ml_results WHERE member_id=%s ORDER BY id DESC LIMIT %s", (member_id, limit))
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"): r["created_at"] = str(r["created_at"])
    return rows


def get_ai_results(member_id: int, limit: int = 10) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM ai_results WHERE member_id=%s ORDER BY id DESC LIMIT %s", (member_id, limit))
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"): r["created_at"] = str(r["created_at"])
    return rows


# ── Checkup helpers ───────────────────────────────────────────────────────────
def get_checkups(member_id: int) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM checkups WHERE member_id=%s ORDER BY date DESC", (member_id,))
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("date"): r["date"] = str(r["date"])
        if r.get("created_at"): r["created_at"] = str(r["created_at"])
    return rows


def add_checkup(member_id: int, title: str, date: str, notes: str = "", status: str = "upcoming") -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute("INSERT INTO checkups (member_id, title, date, report_notes, status) VALUES (%s,%s,%s,%s,%s)",
                (member_id, title, date, notes, status))
    c.commit()
    cid = cur.lastrowid
    cur.close(); c.close()
    return cid


def delete_checkup(checkup_id: int):
    c = _conn()
    cur = c.cursor()
    cur.execute("DELETE FROM checkups WHERE id=%s", (checkup_id,))
    c.commit()
    cur.close(); c.close()


# ── Patient profile helpers ───────────────────────────────────────────────────
def get_profile(member_id: int) -> dict | None:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM patient_profiles WHERE member_id=%s", (member_id,))
    row = cur.fetchone()
    cur.close(); c.close()
    if row and row.get("updated_at"):
        row["updated_at"] = str(row["updated_at"])
    return row


def upsert_profile(member_id: int, data: dict):
    c = _conn()
    cur = c.cursor()
    existing = get_profile(member_id)
    if existing:
        cur.execute(
            """UPDATE patient_profiles SET age=%s, gender=%s, blood_group=%s,
               height_cm=%s, weight_kg=%s, allergies=%s, emergency_contact=%s
               WHERE member_id=%s""",
            (data.get("age"), data.get("gender"), data.get("blood_group"),
             data.get("height_cm"), data.get("weight_kg"), data.get("allergies"),
             data.get("emergency_contact"), member_id)
        )
    else:
        cur.execute(
            """INSERT INTO patient_profiles (member_id, age, gender, blood_group,
               height_cm, weight_kg, allergies, emergency_contact)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (member_id, data.get("age"), data.get("gender"), data.get("blood_group"),
             data.get("height_cm"), data.get("weight_kg"), data.get("allergies"),
             data.get("emergency_contact"))
        )
    c.commit()
    cur.close(); c.close()


# ── Doctor profile helpers ────────────────────────────────────────────────────
def get_doctor_profile(user_id: int) -> dict | None:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM doctor_profiles WHERE user_id=%s", (user_id,))
    row = cur.fetchone()
    cur.close(); c.close()
    if row and row.get("updated_at"):
        row["updated_at"] = str(row["updated_at"])
    return row


def upsert_doctor_profile(user_id: int, data: dict):
    c = _conn()
    cur = c.cursor()
    existing = get_doctor_profile(user_id)
    if existing:
        cur.execute(
            """UPDATE doctor_profiles SET name=%s, specialization=%s, experience_years=%s,
               availability=%s, hospital=%s, phone=%s WHERE user_id=%s""",
            (data.get("name"), data.get("specialization"), data.get("experience_years"),
             data.get("availability"), data.get("hospital"), data.get("phone"), user_id)
        )
    else:
        cur.execute(
            """INSERT INTO doctor_profiles (user_id, name, specialization, experience_years,
               availability, hospital, phone)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (user_id, data.get("name"), data.get("specialization"), data.get("experience_years"),
             data.get("availability"), data.get("hospital"), data.get("phone"))
        )
    c.commit()
    cur.close(); c.close()


def get_all_doctor_profiles() -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM doctor_profiles ORDER BY id")
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("updated_at"): r["updated_at"] = str(r["updated_at"])
    return rows


# ── Admin stats helpers ───────────────────────────────────────────────────────
def get_admin_stats() -> dict:
    c = _conn()
    cur = c.cursor()
    stats = {}
    for key, sql in [
        ("total_patients", "SELECT COUNT(*) FROM patients"),
        ("total_family_members", "SELECT COUNT(*) FROM family_members"),
        ("total_family_groups", "SELECT COUNT(*) FROM family_groups"),
        ("total_health_entries", "SELECT COUNT(*) FROM health_entries"),
        ("total_checkups", "SELECT COUNT(*) FROM checkups"),
        ("total_documents", "SELECT COUNT(*) FROM documents"),
        ("total_ml_results", "SELECT COUNT(*) FROM ml_results"),
        ("total_ai_results", "SELECT COUNT(*) FROM ai_results"),
        ("total_doctor_requests", "SELECT COUNT(*) FROM doctor_requests"),
        ("pending_requests", "SELECT COUNT(*) FROM doctor_requests WHERE status='pending'"),
        ("total_notifications", "SELECT COUNT(*) FROM notifications"),
        ("unread_notifications", "SELECT COUNT(*) FROM notifications WHERE is_read=FALSE"),
        ("total_telemetry", "SELECT COUNT(*) FROM telemetry_readings"),
        ("total_alerts", "SELECT COUNT(*) FROM alerts"),
        ("total_doctors", "SELECT COUNT(*) FROM doctor_profiles"),
    ]:
        cur.execute(sql)
        stats[key] = cur.fetchone()[0]
    cur.close(); c.close()
    return stats


def get_admin_activity_log(limit: int = 50) -> list[dict]:
    """Combine notifications + doctor requests into a unified activity log."""
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("""
        (SELECT 'notification' AS source, type AS sub_type, title, message AS detail, created_at
         FROM notifications ORDER BY id DESC LIMIT %s)
        UNION ALL
        (SELECT 'doctor_request' AS source, status AS sub_type,
         CONCAT('Request for ', member_name) AS title,
         COALESCE(ai_summary, CONCAT('ML: ', COALESCE(ml_class,'—'), ' | Risk: ', COALESCE(risk_score,0))) AS detail,
         created_at
         FROM doctor_requests ORDER BY id DESC LIMIT %s)
        ORDER BY created_at DESC LIMIT %s
    """, (limit, limit, limit))
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"): r["created_at"] = str(r["created_at"])
    return rows


def get_all_members_with_stats() -> list[dict]:
    """Get all family members with their entry counts for admin view."""
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("""
        SELECT fm.id, fm.group_id, fm.name, fm.relation, fm.role,
               fg.name AS group_name, fm.created_at,
               (SELECT COUNT(*) FROM health_entries WHERE member_id=fm.id) AS entry_count,
               (SELECT COUNT(*) FROM checkups WHERE member_id=fm.id) AS checkup_count,
               (SELECT COUNT(*) FROM ml_results WHERE member_id=fm.id) AS ml_count,
               (SELECT COUNT(*) FROM ai_results WHERE member_id=fm.id) AS ai_count
        FROM family_members fm
        LEFT JOIN family_groups fg ON fm.group_id = fg.id
        ORDER BY fm.id
    """)
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"): r["created_at"] = str(r["created_at"])
    return rows


# ── Seed demo data (only if empty) ───────────────────────────────────────────
def _seed_data():
    c = _conn()
    cur = c.cursor()
    cur.execute("SELECT COUNT(*) FROM health_entries")
    count = cur.fetchone()[0]
    if count > 0:
        cur.close(); c.close()
        return  # Already seeded

    seeds = [
        # Symptoms
        (1, "symptoms", "Mild chest tightness after walking", "Self"),
        (1, "symptoms", "Slight dizziness on standing", "Self"),
        # Medications
        (1, "medications", "Metoprolol 50mg — 1 tablet, 8:00 AM", "Dr. Mehra"),
        (1, "medications", "Aspirin 75mg — 1 tablet, 1:00 PM", "Dr. Mehra"),
        (1, "medications", "Atorvastatin 20mg — 1 tablet, 9:00 PM", "Dr. Mehra"),
        (1, "medications", "Vitamin D3 60K — weekly", "Self"),
        # Medical history
        (1, "medical_history", "Hypertension (diagnosed 2022)", "Dr. Mehra"),
        (1, "medical_history", "Type-2 Diabetes (managed with diet)", "Dr. Gupta"),
        (1, "medical_history", "Previous MI (2024) — stent placed", "Dr. Mehra"),
        # Prescriptions
        (1, "prescriptions", "Metoprolol 50mg — morning, empty stomach", "Dr. Mehra"),
        (1, "prescriptions", "Aspirin 75mg — after lunch", "Dr. Mehra"),
        (1, "prescriptions", "Atorvastatin 20mg — bedtime", "Dr. Mehra"),
        # Doctor notes
        (1, "doctor_notes", "BP 140/90 — advised salt reduction and daily walking", "Dr. Mehra"),
        (1, "doctor_notes", "Lipid panel elevated — started Atorvastatin 20mg", "Dr. Mehra"),
        (1, "doctor_notes", "Post-MI follow-up: stable, continue current regimen", "Dr. Mehra"),
    ]
    for member_id, cat, text, by in seeds:
        cur.execute("INSERT INTO health_entries (member_id, category, text, added_by) VALUES (%s,%s,%s,%s)",
                    (member_id, cat, text, by))

    # Seed patient profile
    cur.execute("""INSERT IGNORE INTO patient_profiles
        (member_id, age, gender, blood_group, height_cm, weight_kg, allergies, emergency_contact)
        VALUES (1, 64, 'Female', 'B+', 162, 68, 'Penicillin', 'Priya Sharma: +91-9876543210')""")

    # Seed checkups
    cur.execute("INSERT INTO checkups (member_id, title, date, status) VALUES (1, 'Cardiology Follow-up', '2026-05-05', 'upcoming')")
    cur.execute("INSERT INTO checkups (member_id, title, date, status) VALUES (1, 'Blood Work (CBC + Lipid)', '2026-05-12', 'upcoming')")
    cur.execute("INSERT INTO checkups (member_id, title, date, report_notes, status) VALUES (1, 'ECG Stress Test', '2026-04-20', 'Normal sinus rhythm', 'done')")

    # Seed an initial ML result
    cur.execute("""INSERT INTO ml_results (member_id, prediction, confidence, risk_score, input_summary)
        VALUES (1, 'normal_sinus', 0.87, 22, 'HR=72, SpO2=97, Temp=36.8, GForce=1.0')""")

    # Seed an initial AI result
    cur.execute("""INSERT INTO ai_results (member_id, advice, urgency, timeline, doctor_suggestion, ml_result_id, input_sources)
        VALUES (1, 'Vitals are within normal range. Continue prescribed medications. Next checkup in 2 weeks.',
                'safe', '2 weeks follow-up', 'General Physician', 1,
                'vitals, medications, medical_history, symptoms, family_health')""")

    # Seed doctor request
    cur.execute("""INSERT INTO doctor_requests
        (member_id, member_name, status, ai_summary, ai_urgency, ml_class, risk_score, doctor_specialty,
         doctor_name, doctor_notes, prescription, responded_at)
        VALUES (1, 'Riya Sharma', 'accepted',
                'Patient stable post-MI. ML: normal_sinus (87%). Current medications adequate.',
                'safe', 'normal_sinus', 22, 'Cardiologist',
                'Dr. Mehra', 'Continue current regimen. ECG follow-up in 2 weeks.',
                'Metoprolol 50mg — morning\\nAspirin 75mg — afternoon', NOW())""")

    # Seed notifications
    notifs = [
        (1, 1, "ai_scan", "AI Health Scan Complete", "Your health scan shows all vitals normal. Risk score: 22/100."),
        (1, 1, "member_update", "Family Hub Updated", "Priya added an observation about your morning routine."),
        (1, 1, "doctor_response", "Dr. Mehra Responded", "Continue current regimen. ECG follow-up in 2 weeks."),
    ]
    for gid, mid, ntype, title, msg in notifs:
        cur.execute("INSERT INTO notifications (group_id, member_id, type, title, message) VALUES (%s,%s,%s,%s,%s)",
                    (gid, mid, ntype, title, msg))

    # Seed doctor profile
    cur.execute("""INSERT IGNORE INTO doctor_profiles
        (user_id, name, specialization, experience_years, availability, hospital, phone)
        VALUES (2, 'Dr. Mehra', 'Cardiology', 15, 'Available', 'Apollo Hospital, Delhi', '+91-9988776655')""")

    c.commit()
    cur.close(); c.close()
    print("[DB] Seeded demo data: 15 health entries, 1 profile, 3 checkups, 1 ML result, 1 AI result, 1 doctor request, 3 notifications, 1 doctor profile")
