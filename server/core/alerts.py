"""
core/alerts.py — Tiered escalation engine
L1 → Doctor alert (risk ≥ 60)
L2 → Family alert (risk ≥ 80)
L3 → Emergency services (risk ≥ 90)
"""
from config import ESCALATION_L1_RISK, ESCALATION_L2_RISK, ESCALATION_L3_RISK
from core.risk import get_alert_reasons, get_level


def evaluate(reading: dict) -> dict:
    """
    Evaluate a reading and return full escalation context.
    Returns a dict with tier, reasons, and suggested actions.
    """
    risk  = int(reading.get("risk", 0))
    level = get_level(risk)
    reasons = get_alert_reasons(reading)

    tier = 0
    actions = []
    notifications = []

    if risk >= ESCALATION_L3_RISK:
        tier = 3
        actions    = ["Dispatch emergency services", "Call 108", "Alert nearest hospital"]
        notifications = ["patient", "doctor", "family", "emergency"]
    elif risk >= ESCALATION_L2_RISK:
        tier = 2
        actions    = ["Notify family immediately", "Doctor urgent review"]
        notifications = ["patient", "doctor", "family"]
    elif risk >= ESCALATION_L1_RISK:
        tier = 1
        actions    = ["Notify doctor", "Patient advised to rest"]
        notifications = ["doctor"]

    return {
        "tier":          tier,
        "risk":          risk,
        "level":         level,
        "reasons":       reasons,
        "actions":       actions,
        "notifications": notifications,
        "should_alert":  tier > 0,
    }


def describe_tier(tier: int) -> str:
    return {
        0: "No escalation — vitals normal",
        1: "L1 — Doctor notified",
        2: "L2 — Doctor + Family notified",
        3: "L3 — Emergency services dispatched",
    }.get(tier, "Unknown")
