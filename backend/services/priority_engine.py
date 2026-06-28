"""
Priority Engine — Pure Python, no AI.
Scores every task on a 0–100 scale.
"""
from datetime import datetime, timezone


def score(task, now=None):
    """Calculate priority score for a single task."""
    now = now or datetime.now(timezone.utc)
    importance = task.importance * 10  # 10–100

    if not task.deadline:
        # No deadline → pure importance, no urgency penalty
        return round(importance * 0.70, 1)  # max 70

    hours_left = max(0.1, (task.deadline - now).total_seconds() / 3600)
    time_ratio = min(1.0, (task.estimated_hours or 1.0) / hours_left)
    urgency = max(0, min(100, 100 - hours_left))
    effort_risk = time_ratio * 100

    return round(
        urgency     * 0.40 +
        importance  * 0.35 +
        effort_risk * 0.25,
        1
    )


def rank(tasks, now=None):
    """Sort tasks by priority score, descending."""
    now = now or datetime.now(timezone.utc)
    return sorted(tasks, key=lambda t: score(t, now), reverse=True)
