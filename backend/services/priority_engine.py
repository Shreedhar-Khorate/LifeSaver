"""
Priority Engine — Pure Python, no AI.
Scores every task on a 0–100 scale.
"""
from datetime import datetime


def score(task, now=None):
    """Calculate priority score for a single task."""
    now = now or datetime.utcnow()

    if not task.deadline:
        # No deadline = importance-only score (lower priority)
        return round(task.importance * 4.5, 1)

    hours_left = max(0.1, (task.deadline - now).total_seconds() / 3600)
    time_ratio = min(1.0, (task.estimated_hours or 1.0) / hours_left)
    urgency = max(0, min(100, 100 - hours_left))
    importance = task.importance * 10
    effort_risk = time_ratio * 100

    return round(
        urgency * 0.40 +
        importance * 0.30 +
        effort_risk * 0.20,
        1
    )


def rank(tasks, now=None):
    """Sort tasks by priority score, descending."""
    now = now or datetime.utcnow()
    return sorted(tasks, key=lambda t: score(t, now), reverse=True)
