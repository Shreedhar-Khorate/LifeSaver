"""
Scheduler Engine — Pure Python, no AI.
Packs priority-ranked tasks into available time slots.
"""
from datetime import datetime, timedelta, timezone


def build(tasks, available_hours: float, start: datetime = None):
    """
    Build a schedule from ranked tasks.
    
    Args:
        tasks: list of Task objects, already sorted by priority (highest first)
        available_hours: total hours the user has today
        start: when to start scheduling (defaults to now)
    
    Returns:
        list of slot dicts: {task_id, task_name, start_time, end_time, hours}
    """
    start = start or datetime.now(timezone.utc)
    slots = []
    cursor = start
    remaining = available_hours

    for task in tasks:
        if remaining <= 0:
            break
        if task.status != "pending":
            continue

        alloc = min(task.estimated_hours or 1.0, remaining)
        slots.append({
            "task_id":    task.id,
            "task_name":  task.task_name,
            "start_time": cursor,
            "end_time":   cursor + timedelta(hours=alloc),
            "hours":      round(alloc, 2),
        })
        cursor    += timedelta(hours=alloc)
        remaining -= alloc

    return slots
