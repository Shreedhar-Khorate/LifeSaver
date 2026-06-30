"""
Rescue Engine — Pure Python, no AI.
Drops non-core subtasks and recalculates success probability.
"""


def rescue(tasks, subtasks, hours_remaining: float, dna_type: str):
    """
    Separate core vs droppable subtasks and calculate improved success probability.
    
    Args:
        tasks: list of Task objects
        subtasks: list of Subtask objects (across all tasks)
        hours_remaining: how many hours the user has left
        dna_type: user's deadline DNA type
    
    Returns:
        dict with dropped, focus, core_hours, after_success
    """
    dropped = [s for s in subtasks if not s.is_core]
    core = [s for s in subtasks if s.is_core]

    core_hours = sum(s.hours for s in core)
    fit_ratio = min(1.0, hours_remaining / max(0.1, core_hours))

    dna_bonus = {
        "last_minute":   10,
        "consistent":    5,
        "deep_focus":    7,
        "overcommitter": -5,
    }.get(dna_type, 0)

    after_prob = round(min(97, fit_ratio * 100 + dna_bonus))

    return {
        "dropped":       [s.name for s in dropped],
        "focus":         [s.name for s in core],
        "core_hours":    round(core_hours, 2),
        "after_success": max(5, after_prob),
    }


def simulate(core_hours: float, extra_hours: float, dna_type: str, hours_remaining: float = 0.0) -> float:
    """
    For the what-if slider. Pure math, instant response.
    
    Args:
        core_hours: total hours of core subtasks
        extra_hours: how many additional hours the user can add
        dna_type: user's deadline DNA type
        hours_remaining: the baseline hours remaining
    
    Returns:
        Simulated success probability (5–97%)
    """
    total_hours = hours_remaining + extra_hours
    fit = min(1.0, total_hours / max(0.1, core_hours))
    bonus = {
        "last_minute":   10,
        "consistent":    5,
        "deep_focus":    7,
        "overcommitter": -5,
    }.get(dna_type, 0)

    return max(5, round(min(97, fit * 100 + bonus)))
