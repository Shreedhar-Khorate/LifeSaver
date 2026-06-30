"""
Agent 2: Decomposer Agent
Breaks a task into subtasks using pattern match → cache → LLM fallback.
"""
import re
import hashlib
import json
from datetime import datetime, timezone, timedelta
from services.llm_orchestrator import orchestrator, AgentType
from models import DecompositionCache

PATTERNS = {
    r"ppt|slide|presentation|deck": (
        [
            {"name": "Create outline", "hours": 0.5, "is_core": True},
            {"name": "Build slides", "hours": 1.5, "is_core": True},
            {"name": "Add visuals", "hours": 1.0, "is_core": False},
            {"name": "Rehearse", "hours": 0.5, "is_core": True},
        ],
        "Keep text minimal, use strong visuals, and practice delivery twice."
    ),
    r"assignment|homework|project": (
        [
            {"name": "Research", "hours": 1.0, "is_core": True},
            {"name": "Draft", "hours": 2.0, "is_core": True},
            {"name": "Review", "hours": 0.5, "is_core": True},
            {"name": "Documentation", "hours": 0.5, "is_core": False},
        ],
        "Focus on core rubric requirements first, code sequentially, and verify before submission."
    ),
    r"interview": (
        [
            {"name": "Research company", "hours": 0.5, "is_core": True},
            {"name": "Practice answers", "hours": 1.0, "is_core": True},
            {"name": "Prepare questions", "hours": 0.25, "is_core": False},
        ],
        "Review the job description, prepare three storytelling responses, and ask insightful questions."
    ),
    r"gym|workout|exercise": (
        [
            {"name": "Warmup", "hours": 0.25, "is_core": True},
            {"name": "Workout", "hours": 0.75, "is_core": True},
            {"name": "Cooldown", "hours": 0.25, "is_core": False},
        ],
        "Stay hydrated, maintain consistent form, and target controlled repetitions."
    ),
}

CACHE_TTL_DAYS = 7


async def decompose(task_name: str, db) -> tuple[list, str]:
    """
    Resolve subtasks and completion tip via:
      1. Local pattern match (0 tokens)
      2. DB cache check with TTL (0 tokens)
      3. LLM call (tokens spent — last resort)
    
    Returns:
        tuple: (subtasks list, completion_tip string)
    """
    lower_name = task_name.lower().strip()

    # 1. Pattern match
    for pattern, value in PATTERNS.items():
        if re.search(pattern, lower_name):
            return value[0], value[1]

    # 2. Cache check with TTL
    key = hashlib.md5(lower_name.encode()).hexdigest()
    cached = db.query(DecompositionCache).filter_by(cache_key=key).first()
    if cached:
        age = datetime.now(timezone.utc) - cached.created_at.replace(tzinfo=timezone.utc)
        if age < timedelta(days=CACHE_TTL_DAYS):
            try:
                data = json.loads(cached.subtasks)
                if isinstance(data, dict) and "subtasks" in data:
                    return data["subtasks"], data.get("completion_tip", "Focus on completing the steps sequentially.")
                elif isinstance(data, list):
                    # Backward compatibility for old cache
                    return data, "Focus on completing the steps sequentially."
            except Exception:
                pass
        
        # Expired or corrupted — delete cache entry
        db.delete(cached)
        db.commit()

    # 3. AI call (last resort)
    result = await orchestrator.run(AgentType.DECOMPOSER, {"task_name": task_name})

    completion_tip = "Focus on completing the steps sequentially."
    subtasks_raw = []

    if isinstance(result, dict):
        completion_tip = result.get("completion_tip", completion_tip)
        if "subtasks" in result and isinstance(result["subtasks"], list):
            subtasks_raw = result["subtasks"]
        else:
            # Fallback if keys are missing
            for key_candidate in ["steps", "tasks", "items"]:
                if key_candidate in result and isinstance(result[key_candidate], list):
                    subtasks_raw = result[key_candidate]
                    break
            else:
                subtasks_raw = [result]
    elif isinstance(result, list):
        subtasks_raw = result

    # Normalize the subtasks list
    normalized = []
    for item in subtasks_raw:
        if not isinstance(item, dict):
            continue
        normalized.append({
            "name": item.get("name", item.get("subtask", "Subtask")),
            "hours": float(item.get("hours", 1.0)),
            "is_core": bool(item.get("is_core", True)),
        })

    # Save both subtasks and tip in the cache JSON
    cache_data = {
        "subtasks": normalized,
        "completion_tip": completion_tip
    }
    db.add(DecompositionCache(cache_key=key, subtasks=json.dumps(cache_data)))
    db.commit()

    return normalized, completion_tip
