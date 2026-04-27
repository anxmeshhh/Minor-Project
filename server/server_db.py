"""
server_db.py — All database CRUD helpers for the CRUD API.
Every function talks to MySQL directly. Zero hardcoding.
"""
from db import _conn


# ═══════════════════ FAMILY GROUP ═══════════════════
def db_get_family(group_id: int = 1) -> dict | None:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM family_groups WHERE id=%s", (group_id,))
    row = cur.fetchone()
    cur.close(); c.close()
    return row


def db_get_members(group_id: int = 1) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT id, group_id, patient_id, name, relation, role, created_at FROM family_members WHERE group_id=%s ORDER BY id", (group_id,))
    rows = cur.fetchall()
    cur.close(); c.close()
    # Convert datetime to string
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


def db_add_member(group_id: int, name: str, relation: str, role: str = "member") -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute("INSERT INTO family_members (group_id, name, relation, role) VALUES (%s,%s,%s,%s)",
                (group_id, name, relation, role))
    c.commit()
    mid = cur.lastrowid
    cur.close(); c.close()
    return mid


def db_delete_member(member_id: int):
    c = _conn()
    cur = c.cursor()
    cur.execute("DELETE FROM family_members WHERE id=%s", (member_id,))
    c.commit()
    cur.close(); c.close()


# ═══════════════════ HEALTH ENTRIES ═══════════════════
def db_get_entries(member_id: int, category: str) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute(
        "SELECT id, member_id, category, text, added_by, created_at FROM health_entries WHERE member_id=%s AND category=%s ORDER BY id DESC",
        (member_id, category)
    )
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


def db_add_entry(member_id: int, category: str, text: str, added_by: str = "Self") -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute("INSERT INTO health_entries (member_id, category, text, added_by) VALUES (%s,%s,%s,%s)",
                (member_id, category, text, added_by))
    c.commit()
    eid = cur.lastrowid
    cur.close(); c.close()
    return eid


def db_update_entry(entry_id: int, text: str):
    c = _conn()
    cur = c.cursor()
    cur.execute("UPDATE health_entries SET text=%s WHERE id=%s", (text, entry_id))
    c.commit()
    cur.close(); c.close()


def db_delete_entry(entry_id: int):
    c = _conn()
    cur = c.cursor()
    cur.execute("DELETE FROM health_entries WHERE id=%s", (entry_id,))
    c.commit()
    cur.close(); c.close()


# ═══════════════════ DOCTOR REQUESTS ═══════════════════
def db_get_requests() -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM doctor_requests ORDER BY id DESC")
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        for k in ("created_at", "responded_at"):
            if r.get(k):
                r[k] = str(r[k])
    return rows


def db_add_request(member_id: int, member_name: str,
                   ai_summary=None, ai_urgency=None, ml_class=None,
                   risk_score=None, doctor_specialty=None) -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """INSERT INTO doctor_requests
           (member_id, member_name, ai_summary, ai_urgency, ml_class, risk_score, doctor_specialty)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (member_id, member_name, ai_summary, ai_urgency, ml_class, risk_score, doctor_specialty)
    )
    c.commit()
    rid = cur.lastrowid
    cur.close(); c.close()
    return rid


def db_respond_request(req_id: int, doctor_name: str, notes: str,
                       prescription: str = None, urgent_appointment: str = None):
    c = _conn()
    cur = c.cursor()
    cur.execute(
        """UPDATE doctor_requests SET
           status='accepted', doctor_name=%s, doctor_notes=%s,
           prescription=%s, urgent_appointment=%s, responded_at=NOW()
           WHERE id=%s""",
        (doctor_name, notes, prescription, urgent_appointment, req_id)
    )
    c.commit()
    cur.close(); c.close()


# ═══════════════════ NOTIFICATIONS ═══════════════════
def db_get_notifications(limit: int = 20) -> list[dict]:
    c = _conn()
    cur = c.cursor(dictionary=True)
    cur.execute("SELECT * FROM notifications ORDER BY id DESC LIMIT %s", (limit,))
    rows = cur.fetchall()
    cur.close(); c.close()
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
    return rows


def db_add_notification(group_id: int, member_id: int, ntype: str, title: str, message: str) -> int:
    c = _conn()
    cur = c.cursor()
    cur.execute(
        "INSERT INTO notifications (group_id, member_id, type, title, message) VALUES (%s,%s,%s,%s,%s)",
        (group_id, member_id, ntype, title, message)
    )
    c.commit()
    nid = cur.lastrowid
    cur.close(); c.close()
    return nid


def db_mark_read(notif_id: int):
    c = _conn()
    cur = c.cursor()
    cur.execute("UPDATE notifications SET is_read=TRUE WHERE id=%s", (notif_id,))
    c.commit()
    cur.close(); c.close()
