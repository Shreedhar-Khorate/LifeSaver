import os
import json
import re
import logging
from enum import Enum
from dotenv import load_dotenv
import groq
import google.generativeai as genai

load_dotenv()

logger = logging.getLogger("lifesaver.llm_orchestrator")
logging.basicConfig(level=logging.INFO)

# Fetch keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def is_placeholder(key):
    return not key or "your_" in key.lower() or key.strip() == ""

has_groq = not is_placeholder(GROQ_API_KEY)
has_gemini = not is_placeholder(GEMINI_API_KEY)

class AgentType(Enum):
    PARSER     = "parser"      # NL text → structured tasks
    DECOMPOSER = "decomposer"  # task name → subtasks
    ADVISOR    = "advisor"     # rescue context → recommendation text

PARSER_PROMPT = """
Today: {now}. Parse tasks from text. Return JSON array only.
Schema: [{{"name":"","deadline":"YYYY-MM-DD HH:MM or null","importance":1-10,"estimated_hours":0}}]
Text: "{text}"
"""

DECOMPOSER_PROMPT = """
Decompose task into subtasks. Return JSON array only.
Schema: [{{"name":"","hours":0,"is_core":true}}]
Set is_core=false for: docs, polish, animations, optional.
Task: "{task_name}"
"""

ADVISOR_PROMPT = """
Give one motivational tip (max 15 words) for this situation.
Pending: {pending}, Hours left: {hours_left}, DNA: {dna_type}
Return JSON: {{"tip": ""}}
"""

class LLMOrchestrator:
    def __init__(self):
        self.groq_client = None
        self.gemini_configured = False
        
        if has_groq:
            try:
                self.groq_client = groq.Groq(api_key=GROQ_API_KEY)
                logger.info("Groq client initialized in Orchestrator.")
            except Exception as e:
                logger.error(f"Failed to init Groq client: {e}")
                
        if has_gemini:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                self.gemini_configured = True
                logger.info("Gemini configured in Orchestrator.")
            except Exception as e:
                logger.error(f"Failed to config Gemini: {e}")

    async def run(self, agent: AgentType, payload: dict) -> dict:
        """Single entry point for all AI calls."""
        prompt = self._build_prompt(agent, payload)
        
        # If no credentials, run in Mock mode immediately
        if not self.groq_client and not self.gemini_configured:
            logger.warning(f"No active LLM credentials. Running mock for agent: {agent.value}")
            return self._mock_run(agent, payload)

        raw = None
        # 1. Try Groq
        if self.groq_client:
            try:
                raw = await self._call_groq(prompt)
                logger.info("Successfully fetched response from Groq.")
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}. Falling back to Gemini...")

        # 2. Try Gemini
        if not raw and self.gemini_configured:
            try:
                raw = await self._call_gemini(prompt)
                logger.info("Successfully fetched response from Gemini.")
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}.")

        # 3. Fallback to mock if API calls failed
        if not raw:
            logger.warning(f"API calls failed or were unavailable. Falling back to mock for agent: {agent.value}")
            return self._mock_run(agent, payload)

        return self._parse_response(raw)

    def _build_prompt(self, agent: AgentType, payload: dict) -> str:
        prompts = {
            AgentType.PARSER: PARSER_PROMPT.format(**payload),
            AgentType.DECOMPOSER: DECOMPOSER_PROMPT.format(**payload),
            AgentType.ADVISOR: ADVISOR_PROMPT.format(**payload),
        }
        return prompts[agent]

    async def _call_groq(self, prompt: str) -> str:
        # Wrap the synchronous groq client call in a thread pool to keep it async-friendly
        import asyncio
        loop = asyncio.get_event_loop()
        
        def blocking_call():
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",   # Fast + generous free tier
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.1
            )
            return response.choices[0].message.content
            
        return await loop.run_in_executor(None, blocking_call)

    async def _call_gemini(self, prompt: str) -> str:
        import asyncio
        loop = asyncio.get_event_loop()
        
        def blocking_call():
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text
            
        return await loop.run_in_executor(None, blocking_call)

    def _parse_response(self, raw: str) -> dict:
        """Strip markdown fences, extract JSON safely."""
        raw = re.sub(r"```json|```", "", raw).strip()
        start = min(
            raw.find("{") if "{" in raw else len(raw),
            raw.find("[") if "[" in raw else len(raw)
        )
        return json.loads(raw[start:])

    def _mock_run(self, agent: AgentType, payload: dict) -> dict:
        """Fallback mock responses to keep app functional in offline/no-key states."""
        if agent == AgentType.PARSER:
            return [
                {
                    "name": "Hackathon PPT",
                    "deadline": "2026-06-23 20:00",
                    "importance": 10,
                    "estimated_hours": 3.0
                },
                {
                    "name": "AI Assignment",
                    "deadline": "2026-06-24 23:00",
                    "importance": 9,
                    "estimated_hours": 4.0
                },
                {
                    "name": "Interview Prep",
                    "deadline": "2026-06-27 09:00",
                    "importance": 8,
                    "estimated_hours": 2.0
                },
                {
                    "name": "Gym",
                    "deadline": None,
                    "importance": 4,
                    "estimated_hours": 1.0
                }
            ]
        elif agent == AgentType.DECOMPOSER:
            task_name = payload.get("task_name", "General Task")
            return [
                {"name": f"Research {task_name}", "hours": 1.0, "is_core": True},
                {"name": f"Build {task_name} features", "hours": 2.0, "is_core": True},
                {"name": f"Test {task_name}", "hours": 1.0, "is_core": True},
                {"name": f"Document {task_name}", "hours": 0.5, "is_core": False},
                {"name": f"Polish {task_name} animations", "hours": 0.5, "is_core": False}
            ]
        elif agent == AgentType.ADVISOR:
            dna = payload.get("dna_type", "consistent")
            tips = {
                "last_minute": "Under pressure? Focus purely on core implementation now. No polish!",
                "consistent": "You are on track. Maintain this steady pace.",
                "deep_focus": "Find a quiet space, turn off notifications, and work for 2 hours.",
                "overcommitter": "You took on too much. It's time to drop non-essentials."
            }
            return {"tip": tips.get(dna, "Prioritize core tasks and ignore optional polish.")}
        return {}

# Singleton instance
orchestrator = LLMOrchestrator()
