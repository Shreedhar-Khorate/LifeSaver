"""
Agent 2: Decomposer Agent
Breaks a task into subtasks using pattern match → cache → LLM fallback.
"""
import re
import hashlib
import json
from services.llm_orchestrator import orchestrator, AgentType
from models import DecompositionCache

PATTERNS = {
    r"ppt|slide|presentation|deck": [
        {"name": "Create outline", "hours": 0.5, "is_core": True},
        {"name": "Build slides", "hours": 1.5, "is_core": True},
        {"name": "Add visuals", "hours": 1.0, "is_core": False},
        {"name": "Rehearse", "hours": 0.5, "is_core": True},
    ],
    r"assignment|homework|project": [
        {"name": "Research", "hours": 1.0, "is_core": True},
        {"name": "Draft", "hours": 2.0, "is_core": True},
        {"name": "Review", "hours": 0.5, "is_core": True},
        {"name": "Documentation", "hours": 0.5, "is_core": False},
    ],
    r"interview": [
        {"name": "Research company", "hours": 0.5, "is_core": True},
        {"name": "Practice answers", "hours": 1.0, "is_core": True},
        {"name": "Prepare questions", "hours": 0.25, "is_core": False},
    ],
    r"gym|workout|exercise": [
        {"name": "Warmup", "hours": 0.25, "is_core": True},
        {"name": "Workout", "hours": 0.75, "is_core": True},
        {"name": "Cooldown", "hours": 0.25, "is_core": False},
    ],
}


async def decompose(task_name: str, db) -> list:
    """
    Resolve subtasks via:
      1. Local pattern match (0 tokens)
      2. DB cache check (0 tokens)
      3. LLM call (tokens spent — last resort)
    """
    lower_name = task_name.lower().strip()

    # 1. Pattern match
    for pattern, subtasks in PATTERNS.items():
        if re.search(pattern, lower_name):
            return subtasks

    # 2. Cache check
    key = hashlib.md5(lower_name.encode()).hexdigest()
    cached = db.query(DecompositionCache).filter_by(cache_key=key).first()
    if cached:
        return json.loads(cached.subtasks)

    # 3. AI call (last resort)
    result = await orchestrator.run(AgentType.DECOMPOSER, {"task_name": task_name})

    # Normalize the result (ensure consistent key names)
    normalized = []
    for item in result:
        normalized.append({
            "name": item.get("name", item.get("subtask", "Subtask")),
            "hours": float(item.get("hours", 1.0)),
            "is_core": bool(item.get("is_core", True)),
        })

    # Save to cache
    db.add(DecompositionCache(cache_key=key, subtasks=json.dumps(normalized)))
    db.commit()

    return normalized
