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
Today is {now}. Parse tasks from this text: "{text}"

Return a JSON array of parsed tasks using this schema:
[{{"name":"","deadline":"YYYY-MM-DD HH:MM or null","importance":1-10,"estimated_hours":0.0}}]

Rules:
1. If a task has a time but no date (e.g. "till 8pm"), assume it is due TODAY (the date in {now}) at that time.
2. If a task is "due tomorrow" without a specific time, set the deadline to tomorrow's date at 23:59.
3. If a task is recurring or has no deadline, set the deadline to null.
4. Output ONLY the raw JSON array. Do not write python code, do not write explanations.
"""

DECOMPOSER_PROMPT = """
Decompose task into subtasks and provide one tip. Return JSON object only.
Schema:
{{
  "subtasks": [{{"name":"","hours":0.0,"is_core":true}}],
  "completion_tip": "Short motivational/efficiency tip (max 15 words) for completing this task"
}}
Set is_core=false for optional items like docs, polish, animations.
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
        if agent == AgentType.PARSER:
            return PARSER_PROMPT.format(**payload)
        elif agent == AgentType.DECOMPOSER:
            return DECOMPOSER_PROMPT.format(**payload)
        elif agent == AgentType.ADVISOR:
            return ADVISOR_PROMPT.format(**payload)
        return ""

    async def _call_groq(self, prompt: str) -> str:
        # Use asyncio.to_thread (Python 3.9+) instead of deprecated get_event_loop
        import asyncio

        def blocking_call():
            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",   # Fast + generous free tier
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.1
            )
            return response.choices[0].message.content

        return await asyncio.to_thread(blocking_call)

    async def _call_gemini(self, prompt: str) -> str:
        import asyncio

        def blocking_call():
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text

        return await asyncio.to_thread(blocking_call)

    def _parse_response(self, raw: str) -> dict:
        """Strip markdown fences, extract JSON safely."""
        logger.info(f"Raw LLM Response:\n{raw}")
        
        # 1. Try to find content inside a ```json block first (highest precedence)
        json_block_match = re.search(r"```json\s*(.*?)\s*```", raw, flags=re.DOTALL | re.IGNORECASE)
        if json_block_match:
            try:
                return json.loads(json_block_match.group(1).strip())
            except json.JSONDecodeError:
                pass

        # 2. Clean up markdown code blocks of other languages (python, js, etc.) to avoid collision
        cleaned = re.sub(r"```(?:python|py|javascript|js|bash|sh|css|html).*?```", "", raw, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"```(json)?", "", cleaned, flags=re.IGNORECASE).replace("```", "").strip()

        # Try to parse the entire cleaned string
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Scan for matching opening and closing brackets from left-to-right
        first_empty = None
        for start_char, end_char in [('[', ']'), ('{', '}')]:
            pos = 0
            while True:
                start_idx = cleaned.find(start_char, pos)
                if start_idx == -1:
                    break

                depth = 0
                for i in range(start_idx, len(cleaned)):
                    if cleaned[i] == start_char:
                        depth += 1
                    elif cleaned[i] == end_char:
                        depth -= 1
                        if depth == 0:
                            candidate = cleaned[start_idx:i+1]
                            try:
                                val = json.loads(candidate)
                                # If it's empty, keep it as fallback but search for non-empty first
                                if val == [] or val == {}:
                                    if first_empty is None:
                                        first_empty = val
                                else:
                                    return val
                            except json.JSONDecodeError:
                                pass
                pos = start_idx + 1

        if first_empty is not None:
            return first_empty

        logger.error(f"Failed to find or parse JSON in response: {raw}")
        raise ValueError("Could not parse JSON from LLM response")

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
            return {
                "subtasks": [
                    {"name": f"Research {task_name}", "hours": 1.0, "is_core": True},
                    {"name": f"Build {task_name} features", "hours": 2.0, "is_core": True},
                    {"name": f"Test {task_name}", "hours": 1.0, "is_core": True},
                    {"name": f"Document {task_name}", "hours": 0.5, "is_core": False},
                    {"name": f"Polish {task_name} animations", "hours": 0.5, "is_core": False}
                ],
                "completion_tip": f"Start by drafting the core layout of {task_name} to lock in early progress."
            }
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
