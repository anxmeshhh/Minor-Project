"""
crud.py — Full CRUD API for all modules:
Family Hub, Health Entries, Patient Profile, Checkups, ML Results, AI Results,
Doctor Requests, Notifications.
All data flows through the database — zero hardcoding.
"""
from flask import Blueprint, request, jsonify
from server_db import (
    db_get_family, db_get_members, db_add_member, db_delete_member,
    db_get_entries, db_add_entry, db_update_entry, db_delete_entry,
    db_get_requests, db_add_request, db_respond_request,
    db_get_notifications, db_add_notification, db_mark_read,
)
from db import (
    get_profile, upsert_profile,
    get_checkups, add_checkup, delete_checkup,
    get_ml_results, save_ml_result,
    get_ai_results, save_ai_result,
    get_doctor_profile, upsert_doctor_profile, get_all_doctor_profiles,
    get_admin_stats, get_admin_activity_log, get_all_members_with_stats,
)

bp = Blueprint("crud", __name__, url_prefix="/api")


# ═══════════════════ FAMILY ═══════════════════
@bp.route("/family", methods=["GET"])
def get_family():
    """Get the family group + all members."""
    fam = db_get_family()
    members = db_get_members(fam["id"]) if fam else []
    return jsonify({"family": fam, "members": members})


@bp.route("/family/members", methods=["POST"])
def add_member():
    d = request.json
    mid = db_add_member(d["group_id"], d["name"], d.get("relation", "other"), d.get("role", "member"))
    return jsonify({"id": mid, "status": "created"}), 201


@bp.route("/family/members/<int:mid>", methods=["DELETE"])
def delete_member(mid):
    db_delete_member(mid)
    return jsonify({"status": "deleted"})


# ═══════════════════ HEALTH ENTRIES (CRUD) ═══════════════════
@bp.route("/health/<int:member_id>", methods=["GET"])
def get_health(member_id):
    """Get ALL health entries for a member, grouped by category."""
    cats = ["symptoms", "medications", "medical_history", "prescriptions", "doctor_notes"]
    out = {}
    for cat in cats:
        out[cat] = db_get_entries(member_id, cat)
    return jsonify(out)


@bp.route("/health/<int:member_id>/<category>", methods=["GET"])
def get_health_cat(member_id, category):
    return jsonify(db_get_entries(member_id, category))


@bp.route("/health/<int:member_id>/<category>", methods=["POST"])
def add_health(member_id, category):
    d = request.json
    eid = db_add_entry(member_id, category, d["text"], d.get("added_by", "Self"))
    # Auto-notify family
    db_add_notification(1, member_id, "member_update",
        f"New {category.replace('_',' ')} added",
        f"{d.get('added_by','Self')} added: {d['text'][:80]}")
    return jsonify({"id": eid, "status": "created"}), 201


@bp.route("/health/entry/<int:entry_id>", methods=["PUT"])
def update_health(entry_id):
    d = request.json
    db_update_entry(entry_id, d["text"])
    return jsonify({"status": "updated"})


@bp.route("/health/entry/<int:entry_id>", methods=["DELETE"])
def delete_health(entry_id):
    db_delete_entry(entry_id)
    return jsonify({"status": "deleted"})


# ═══════════════════ PATIENT PROFILE ═══════════════════
@bp.route("/profile/<int:member_id>", methods=["GET"])
def get_prof(member_id):
    profile = get_profile(member_id)
    return jsonify(profile or {})


@bp.route("/profile/<int:member_id>", methods=["PUT"])
def update_prof(member_id):
    d = request.json
    upsert_profile(member_id, d)
    return jsonify({"status": "updated"})


# ═══════════════════ CHECKUPS (CRUD) ═══════════════════
@bp.route("/checkups/<int:member_id>", methods=["GET"])
def get_checks(member_id):
    return jsonify(get_checkups(member_id))


@bp.route("/checkups/<int:member_id>", methods=["POST"])
def add_check(member_id):
    d = request.json
    cid = add_checkup(member_id, d["title"], d["date"], d.get("notes", ""), d.get("status", "upcoming"))
    db_add_notification(1, member_id, "appointment",
        f"New checkup: {d['title']}", f"Scheduled for {d['date']}")
    return jsonify({"id": cid, "status": "created"}), 201


@bp.route("/checkups/<int:cid>", methods=["DELETE"])
def del_check(cid):
    delete_checkup(cid)
    return jsonify({"status": "deleted"})


# ═══════════════════ ML RESULTS (SEPARATE MODULE) ═══════════════════
@bp.route("/ml-results/<int:member_id>", methods=["GET"])
def get_ml(member_id):
    return jsonify(get_ml_results(member_id))


@bp.route("/ml-results/<int:member_id>", methods=["POST"])
def add_ml(member_id):
    d = request.json
    rid = save_ml_result(member_id, d["prediction"], d["confidence"],
                         d.get("risk_score", 0), d.get("input_summary", ""))
    return jsonify({"id": rid, "status": "created"}), 201


# ═══════════════════ AI RESULTS (SEPARATE MODULE) ═══════════════════
@bp.route("/ai-results/<int:member_id>", methods=["GET"])
def get_ai(member_id):
    return jsonify(get_ai_results(member_id))


@bp.route("/ai-results/<int:member_id>", methods=["POST"])
def add_ai(member_id):
    d = request.json
    rid = save_ai_result(member_id, d["advice"], d.get("urgency", "safe"),
                         d.get("timeline", ""), d.get("doctor_suggestion", ""),
                         d.get("ml_result_id"), d.get("input_sources", ""))
    return jsonify({"id": rid, "status": "created"}), 201


# ═══════════════════ DOCTOR REQUESTS ═══════════════════
@bp.route("/doctor-requests", methods=["GET"])
def get_requests():
    return jsonify(db_get_requests())


@bp.route("/doctor-requests", methods=["POST"])
def add_request():
    d = request.json
    rid = db_add_request(d["member_id"], d["member_name"],
        d.get("ai_summary"), d.get("ai_urgency"), d.get("ml_class"),
        d.get("risk_score"), d.get("doctor_specialty"))
    # Notify
    db_add_notification(1, d["member_id"], "alert",
        "Doctor Request Sent",
        f"Consultation request for {d['member_name']} submitted with full health data.")
    return jsonify({"id": rid, "status": "created"}), 201


@bp.route("/doctor-requests/<int:rid>/respond", methods=["POST"])
def respond_request(rid):
    d = request.json
    db_respond_request(rid, d["doctor_name"], d["notes"], d.get("prescription"), d.get("urgent_appointment"))
    # Get the request to know which member
    reqs = db_get_requests()
    req = next((r for r in reqs if r["id"] == rid), None)
    if req:
        mid = req["member_id"]
        # Add doctor notes to patient record
        if d.get("notes"):
            db_add_entry(mid, "doctor_notes", d["notes"], d["doctor_name"])
        # Add prescriptions
        if d.get("prescription"):
            for line in d["prescription"].split("\n"):
                if line.strip():
                    db_add_entry(mid, "prescriptions", line.strip(), d["doctor_name"])
        # Notify patient + family
        db_add_notification(1, mid, "doctor_response",
            f"{d['doctor_name']} Responded",
            f"{d['notes']}" + (f"\n📅 Urgent: {d['urgent_appointment']}" if d.get("urgent_appointment") else ""))
    return jsonify({"status": "responded"})


# ═══════════════════ NOTIFICATIONS ═══════════════════
@bp.route("/notifications", methods=["GET"])
def get_notifs():
    return jsonify(db_get_notifications())


@bp.route("/notifications/<int:nid>/read", methods=["POST"])
def mark_notif_read(nid):
    db_mark_read(nid)
    return jsonify({"status": "read"})


# ═══════════════════ DOCTOR PROFILE ═══════════════════
@bp.route("/doctor-profile/<int:user_id>", methods=["GET"])
def get_doc_profile(user_id):
    profile = get_doctor_profile(user_id)
    return jsonify(profile or {})


@bp.route("/doctor-profile/<int:user_id>", methods=["PUT"])
def update_doc_profile(user_id):
    d = request.json
    upsert_doctor_profile(user_id, d)
    return jsonify({"status": "updated"})


@bp.route("/doctor-profiles", methods=["GET"])
def get_all_doc_profiles():
    return jsonify(get_all_doctor_profiles())


# ═══════════════════ ADMIN PANEL (DB-BACKED) ═══════════════════
@bp.route("/admin/stats", methods=["GET"])
def admin_stats():
    """System-wide stats from real database tables."""
    return jsonify(get_admin_stats())


@bp.route("/admin/users", methods=["GET"])
def admin_users():
    """All family members with entry/checkup/ML/AI counts."""
    return jsonify(get_all_members_with_stats())


@bp.route("/admin/logs", methods=["GET"])
def admin_logs():
    """Unified activity log from notifications + doctor requests."""
    limit = int(request.args.get("limit", 50))
    return jsonify(get_admin_activity_log(limit))


@bp.route("/admin/doctors", methods=["GET"])
def admin_doctors():
    """All doctor profiles for admin view."""
    return jsonify(get_all_doctor_profiles())
