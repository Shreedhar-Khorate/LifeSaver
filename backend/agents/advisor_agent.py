"""
Agent 3: Advisor Agent
Generates a short motivational tip based on the user's current rescue context.
"""
from services.llm_orchestrator import orchestrator, AgentType


async def get_rescue_tip(pending: int, hours_left: float, dna: str) -> str:
    """Get a short motivational tip (max 15 words) from the LLM."""
    result = await orchestrator.run(AgentType.ADVISOR, {
        "pending": pending,
        "hours_left": hours_left,
        "dna_type": dna
    })
    return result.get("tip", "Focus on core deliverables first.")
