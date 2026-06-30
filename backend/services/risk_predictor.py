"""
Risk Predictor — Pure Python, no AI.
Calculates overall risk score and success probability.
"""
from datetime import datetime, timezone


def calculate(tasks, now=None):
    """
    Calculate aggregate risk score (0–100) from pending tasks.
    Higher = more danger of missing deadlines.
    """
    now = now or datetime.now(timezone.utc)
    score = 0

    for t in tasks:
        if t.status != "pending":
            continue

        if t.deadline:
            deadline = t.deadline
            if deadline.tzinfo is None and now.tzinfo is not None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            elif deadline.tzinfo is not None and now.tzinfo is None:
                now = now.replace(tzinfo=timezone.utc)
            hours_left = max(0.0, (deadline - now).total_seconds() / 3600)
        else:
            hours_left = 48  # No deadline = low urgency

        score += 5                                     # Base risk per pending task
        score += 8 * max(0, 10 - hours_left)           # Urgency penalty
        score += 3 * (t.estimated_hours or 1)          # Effort penalty

    return min(100, round(score))


def success(risk_score: float, completed_count: int, dna_type: str) -> float:
    """
    Estimate success probability (5–97%) based on risk, history, and DNA type.
    """
    BASE = 20
    history = min(30, completed_count * 3)
    dna_bonus = {
        "last_minute":   5,
        "consistent":    8,
        "deep_focus":    6,
        "overcommitter": -5,
    }.get(dna_type, 0)

    return max(5, min(97, round(100 - risk_score + BASE + history + dna_bonus)))
