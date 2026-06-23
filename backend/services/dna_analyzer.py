"""
DNA Analyzer — Pure Python, no AI.
Classifies user's "Deadline DNA" based on task completion patterns.
"""


def analyze(completed_tasks: list) -> str:
    """
    Determine DNA type from completion history.
    
    Types:
        - last_minute:   completes most tasks near/after deadline
        - consistent:    steady pace, rarely late
        - deep_focus:    long work sessions, moderate punctuality
        - overcommitter: takes on too many tasks, often late
    
    Returns:
        DNA type string
    """
    if len(completed_tasks) < 3:
        return "consistent"  # Safe default for new users

    late_count = sum(1 for t in completed_tasks if _was_late(t))
    late_ratio = late_count / len(completed_tasks)
    total_tasks = len(completed_tasks)

    if late_ratio > 0.6:
        return "last_minute"
    if total_tasks > 10 and late_ratio < 0.2:
        return "consistent"
    if _avg_session_length(completed_tasks) > 3:
        return "deep_focus"
    if total_tasks > 15:
        return "overcommitter"

    return "consistent"


def _was_late(task) -> bool:
    """Check if a task was completed after its deadline."""
    if not task.deadline:
        return False
    if not task.created_at:
        return False
    # If status is completed, compare the timeline
    # A task is "late" if its estimated_hours exceed the time between creation and deadline
    from datetime import datetime
    now = datetime.utcnow()
    hours_given = (task.deadline - task.created_at).total_seconds() / 3600
    return task.estimated_hours > hours_given * 0.8


def _avg_session_length(tasks) -> float:
    """Estimate average work session length from task estimated hours."""
    if not tasks:
        return 0.0
    return sum(t.estimated_hours or 1.0 for t in tasks) / len(tasks)


# DNA display config — used by frontend and dashboard
DNA_CONFIG = {
    "last_minute":   {"emoji": "⚡", "label": "Last Minute Worker",  "color": "yellow"},
    "consistent":    {"emoji": "🔥", "label": "Consistent Worker",   "color": "green"},
    "deep_focus":    {"emoji": "🎯", "label": "Deep Focus Worker",   "color": "blue"},
    "overcommitter": {"emoji": "🌀", "label": "Overcommitter",       "color": "red"},
}
