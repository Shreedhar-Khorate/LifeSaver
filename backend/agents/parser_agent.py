"""
Agent 1: Parser Agent
Converts natural language text into structured task JSON using the LLM Orchestrator.
"""
from datetime import datetime, timezone
from services.llm_orchestrator import orchestrator, AgentType


async def parse_tasks(raw_text: str) -> list:
    """Parse unstructured user text into a list of task dicts."""
    result = await orchestrator.run(AgentType.PARSER, {
        "now": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "text": raw_text
    })

    if isinstance(result, dict):
        for key in ["tasks", "items", "subtasks"]:
            if key in result and isinstance(result[key], list):
                return result[key]
        return [result]

    if not isinstance(result, list):
        return []

    return result
