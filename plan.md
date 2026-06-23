# Implementation Plan: Last Minute Life Saver
**Stack:** FastAPI · SQLite · Groq (Llama 3.1) · Gemini Flash · React · Tailwind · Shadcn UI  
**Pattern:** Multi-Agent LLM Orchestration  
**Build Time:** 24–48 hrs

---

## Architecture Overview: Agent-Based Design

Rather than calling AI randomly, this app uses a **3-agent orchestration pattern**. Each agent has one job, one prompt, and one output schema. An orchestrator decides which agent runs and when.

```
User Input
    ↓
┌─────────────────────────────────────┐
│         LLM Orchestrator            │  ← Routes to correct agent
│         (routes/orchestrator.py)    │    Never calls AI directly
└──────┬──────────┬────────────┬──────┘
       ↓          ↓            ↓
┌──────────┐ ┌─────────┐ ┌──────────┐
│  Agent 1 │ │ Agent 2 │ │ Agent 3  │
│  Parser  │ │Decomposer│ │ Advisor  │
│          │ │          │ │          │
│NL → JSON │ │Task→Steps│ │Rescue tip│
└──────────┘ └─────────┘ └──────────┘
       ↓          ↓            ↓
┌─────────────────────────────────────┐
│         Pure Python Engines         │
│  Priority · Scheduler · Rescue      │  ← No AI. Fast. Reliable.
└─────────────────────────────────────┘
```

**Why this matters for the demo:** You can say *"our system uses multi-agent LLM orchestration where each AI agent is specialized and stateless"* — and it's true, not just a buzzword.

---

## Phase 1: Backend Foundation
**Target: Hours 0–8**

### 1.1 Project Setup (30 min)
```bash
mkdir -p backend/{routes,services,agents,tests}
cd backend
pip install fastapi uvicorn sqlalchemy pydantic \
            python-dotenv groq google-generativeai pytest
```

`.env`
```env
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
DATABASE_URL=sqlite:///./app.db
```

---

### 1.2 Database Layer (1 hr)

**`database.py`**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = create_engine(
    "sqlite:///./app.db",
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**`models.py`** — 5 tables, exact schema:
```python
class User(Base):
    __tablename__ = "users"
    id               = Column(Integer, primary_key=True, default=1)
    name             = Column(String, default="Demo User")
    dna_type         = Column(String, default="consistent")
    available_hours  = Column(Float, default=6.0)
    peak_hours       = Column(String, default='["09:00-12:00","14:00-18:00"]')

class Task(Base):
    __tablename__ = "tasks"
    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"), default=1)
    task_name       = Column(String)
    deadline        = Column(DateTime, nullable=True)
    importance      = Column(Integer)        # 1–10
    estimated_hours = Column(Float)
    priority_score  = Column(Float, default=0)
    status          = Column(String, default="pending")  # pending/completed/dropped
    created_at      = Column(DateTime, default=datetime.utcnow)

class Subtask(Base):
    __tablename__ = "subtasks"
    id          = Column(Integer, primary_key=True)
    task_id     = Column(Integer, ForeignKey("tasks.id"))
    name        = Column(String)
    hours       = Column(Float)
    is_core     = Column(Boolean, default=True)   # False = droppable in rescue
    completed   = Column(Boolean, default=False)
    order_index = Column(Integer)

class Schedule(Base):
    __tablename__ = "schedule"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), default=1)
    task_id     = Column(Integer, ForeignKey("tasks.id"))
    start_time  = Column(DateTime)
    end_time    = Column(DateTime)
    is_rescued  = Column(Boolean, default=False)

class DecompositionCache(Base):
    __tablename__ = "decomposition_cache"
    id         = Column(Integer, primary_key=True)
    cache_key  = Column(String, unique=True)   # MD5 of normalized task name
    subtasks   = Column(String)                # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
```

**`main.py`** — startup seed:
```python
@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if not db.query(User).filter_by(id=1).first():
        db.add(User(id=1, name="Demo User"))
        db.commit()
    db.close()
```

---

### 1.3 LLM Orchestrator (1.5 hrs)

This is the core architectural piece. One class manages all AI calls.

**`services/llm_orchestrator.py`**
```python
"""
LLM Orchestrator — central controller for all AI agents.
No route or service calls AI directly. Everything goes through here.

Flow:
  1. Check if task needs AI at all (pattern match)
  2. Check cache
  3. Select model (Groq first, Gemini fallback)
  4. Call correct agent
  5. Parse + validate response
  6. Cache result
"""

import groq, google.generativeai as genai
import json, re, asyncio
from enum import Enum

class AgentType(Enum):
    PARSER     = "parser"      # NL text → structured tasks
    DECOMPOSER = "decomposer"  # task name → subtasks
    ADVISOR    = "advisor"     # rescue context → recommendation text

class LLMOrchestrator:
    def __init__(self):
        self.groq   = groq.Groq(api_key=GROQ_API_KEY)
        self.gemini = genai.GenerativeModel("gemini-1.5-flash")

    async def run(self, agent: AgentType, payload: dict) -> dict:
        """Single entry point for all AI calls."""
        prompt = self._build_prompt(agent, payload)
        
        try:
            raw = await self._call_groq(prompt)
        except Exception:
            raw = await self._call_gemini(prompt)   # fallback
        
        return self._parse_response(raw)

    def _build_prompt(self, agent: AgentType, payload: dict) -> str:
        prompts = {
            AgentType.PARSER: PARSER_PROMPT.format(**payload),
            AgentType.DECOMPOSER: DECOMPOSER_PROMPT.format(**payload),
            AgentType.ADVISOR: ADVISOR_PROMPT.format(**payload),
        }
        return prompts[agent]

    async def _call_groq(self, prompt: str) -> str:
        response = self.groq.chat.completions.create(
            model="llama-3.1-8b-instant",   # Fast + generous free tier
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1                 # Low temp = consistent JSON
        )
        return response.choices[0].message.content

    async def _call_gemini(self, prompt: str) -> str:
        response = self.gemini.generate_content(prompt)
        return response.text

    def _parse_response(self, raw: str) -> dict:
        """Strip markdown fences, extract JSON safely."""
        raw = re.sub(r"```json|```", "", raw).strip()
        start = min(
            raw.find("{") if "{" in raw else len(raw),
            raw.find("[") if "[" in raw else len(raw)
        )
        return json.loads(raw[start:])

# Singleton — import this everywhere
orchestrator = LLMOrchestrator()
```

**Compressed agent prompts** (tokens matter):

```python
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
```

---

### 1.4 AI Agents (1 hr)

Each agent is a thin wrapper. All intelligence is in the orchestrator.

**`agents/parser_agent.py`**
```python
from services.llm_orchestrator import orchestrator, AgentType
from datetime import datetime

async def parse_tasks(raw_text: str) -> list:
    return await orchestrator.run(AgentType.PARSER, {
        "now": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "text": raw_text
    })
```

**`agents/decomposer_agent.py`**
```python
import hashlib, json
from services.llm_orchestrator import orchestrator, AgentType

PATTERNS = {
    r"ppt|slide|presentation|deck": [
        {"name": "Create outline",  "hours": 0.5, "is_core": True},
        {"name": "Build slides",    "hours": 1.5, "is_core": True},
        {"name": "Add visuals",     "hours": 1.0, "is_core": False},
        {"name": "Rehearse",        "hours": 0.5, "is_core": True},
    ],
    r"assignment|homework|project": [
        {"name": "Research",        "hours": 1.0, "is_core": True},
        {"name": "Draft",           "hours": 2.0, "is_core": True},
        {"name": "Review",          "hours": 0.5, "is_core": True},
        {"name": "Documentation",   "hours": 0.5, "is_core": False},
    ],
    r"interview": [
        {"name": "Research company","hours": 0.5, "is_core": True},
        {"name": "Practice answers","hours": 1.0, "is_core": True},
        {"name": "Prepare questions","hours": 0.25,"is_core": False},
    ],
    r"gym|workout|exercise": [
        {"name": "Warmup",          "hours": 0.25,"is_core": True},
        {"name": "Workout",         "hours": 0.75,"is_core": True},
        {"name": "Cooldown",        "hours": 0.25,"is_core": False},
    ],
}

async def decompose(task_name: str, db) -> list:
    import re
    # 1. Pattern match (0 tokens)
    for pattern, subtasks in PATTERNS.items():
        if re.search(pattern, task_name.lower()):
            return subtasks

    # 2. Cache check (0 tokens)
    key = hashlib.md5(task_name.lower().strip().encode()).hexdigest()
    cached = db.query(DecompositionCache).filter_by(cache_key=key).first()
    if cached:
        return json.loads(cached.subtasks)

    # 3. AI call (tokens spent — last resort)
    result = await orchestrator.run(AgentType.DECOMPOSER, {"task_name": task_name})
    db.add(DecompositionCache(cache_key=key, subtasks=json.dumps(result)))
    db.commit()
    return result
```

**`agents/advisor_agent.py`**
```python
from services.llm_orchestrator import orchestrator, AgentType

async def get_rescue_tip(pending: int, hours_left: float, dna: str) -> str:
    result = await orchestrator.run(AgentType.ADVISOR, {
        "pending": pending,
        "hours_left": hours_left,
        "dna_type": dna
    })
    return result.get("tip", "Focus on core deliverables first.")
```

---

### 1.5 Pure Python Engines (2 hrs)

No AI. Fast. Always reliable.

**`services/priority_engine.py`**
```python
from datetime import datetime

def score(task, now=None):
    now = now or datetime.utcnow()
    if not task.deadline:
        return task.importance * 4.5  # No deadline = low-ish priority

    hours_left   = max(0.1, (task.deadline - now).total_seconds() / 3600)
    time_ratio   = min(1.0, task.estimated_hours / hours_left)
    urgency      = max(0, min(100, 100 - hours_left))
    importance   = task.importance * 10
    effort_risk  = time_ratio * 100

    return round(urgency*0.40 + importance*0.30 + effort_risk*0.20, 1)

def rank(tasks):
    return sorted(tasks, key=lambda t: score(t), reverse=True)
```

**`services/scheduler_engine.py`**
```python
from datetime import datetime, timedelta

def build(tasks, available_hours: float, start: datetime = None):
    start    = start or datetime.now()
    slots    = []
    cursor   = start
    remaining = available_hours

    for task in tasks:
        if remaining <= 0:
            break
        alloc = min(task.estimated_hours or 1.0, remaining)
        slots.append({
            "task_id":    task.id,
            "task_name":  task.task_name,
            "start_time": cursor,
            "end_time":   cursor + timedelta(hours=alloc),
            "hours":      alloc,
        })
        cursor    += timedelta(hours=alloc)
        remaining -= alloc

    return slots
```

**`services/risk_predictor.py`**
```python
from datetime import datetime

def calculate(tasks, now=None):
    now   = now or datetime.utcnow()
    score = 0
    for t in tasks:
        if t.status != "pending":
            continue
        hours_left = max(0, (t.deadline - now).total_seconds() / 3600) if t.deadline else 48
        score += 5
        score += 8 * max(0, 10 - hours_left)
        score += 3 * (t.estimated_hours or 1)
    return min(100, round(score))

def success(risk_score: float, completed_count: int, dna_type: str) -> float:
    BASE      = 20
    history   = min(30, completed_count * 3)
    dna_bonus = {"last_minute": 5, "consistent": 8, "deep_focus": 6, "overcommitter": -5}.get(dna_type, 0)
    return max(5, min(97, round(100 - risk_score + BASE + history + dna_bonus)))
```

**`services/rescue_engine.py`**
```python
def rescue(tasks, subtasks, hours_remaining: float, dna_type: str):
    dropped = [s for s in subtasks if not s.is_core]
    core    = [s for s in subtasks if s.is_core]
    
    core_hours  = sum(s.hours for s in core)
    fit_ratio   = min(1.0, hours_remaining / max(0.1, core_hours))
    dna_bonus   = {"last_minute": 10, "consistent": 5, "deep_focus": 7, "overcommitter": -5}.get(dna_type, 0)
    after_prob  = round(min(97, fit_ratio * 100 + dna_bonus))

    return {
        "dropped":       [s.name for s in dropped],
        "focus":         [s.name for s in core],
        "core_hours":    core_hours,
        "after_success": after_prob,
    }

def simulate(core_hours: float, extra_hours: float, dna_type: str) -> float:
    """For the what-if slider. Pure math, instant."""
    fit      = min(1.0, extra_hours / max(0.1, core_hours))
    bonus    = {"last_minute": 10, "consistent": 5, "deep_focus": 7, "overcommitter": -5}.get(dna_type, 0)
    return round(min(97, fit * 100 + bonus))
```

**`services/dna_analyzer.py`**
```python
def analyze(completed_tasks: list) -> str:
    if len(completed_tasks) < 3:
        return "consistent"   # Safe default for new users

    late_count  = sum(1 for t in completed_tasks if _was_late(t))
    late_ratio  = late_count / len(completed_tasks)
    total_tasks = len(completed_tasks)

    if late_ratio > 0.6:  return "last_minute"
    if total_tasks > 10 and late_ratio < 0.2: return "consistent"
    if _avg_session_length(completed_tasks) > 3: return "deep_focus"
    if total_tasks > 15: return "overcommitter"
    return "consistent"
```

---

## Phase 2: API Routes
**Target: Hours 8–13**

**`routes/tasks.py`** — key endpoints:
```python
@router.post("/parse")           # NL → tasks via parser_agent
@router.post("/")                # Manual create
@router.get("/")                 # List all tasks
@router.patch("/{id}")           # Update status
@router.post("/{id}/decompose")  # Decompose via decomposer_agent
```

**`routes/scheduler.py`**
```python
@router.get("/today")            # Return today's Schedule rows
@router.post("/generate")        # Run scheduler_engine.build(), save to DB
```

**`routes/rescue.py`**
```python
@router.post("/")                # Run rescue_engine.rescue(), save dropped tasks
@router.get("/simulate")         # rescue_engine.simulate(extra_hours) — no DB write
```

**`routes/dashboard.py`**
```python
@router.get("/")
# Returns: tasks_today, risk_score, success_probability, dna_type, dna_tip (advisor_agent)
```

**`routes/debug.py`** — seed for demo:
```python
@router.post("/seed")
# Loads preset "7 PM Crisis" state:
# - 5 tasks, 3 overdue, risk=78, success=31%
# - Perfect starting point for Rescue Mode demo
```

---

## Phase 3: Frontend
**Target: Hours 13–30**

### Component Map
```
App.jsx (sidebar nav + routing)
├── Dashboard.jsx
│   ├── <SuccessGauge />       ← Chart.js doughnut
│   ├── <RiskMeter />          ← colored progress bar
│   ├── <TaskCard />           ← priority badge + countdown
│   └── <DNABadge />           ← emoji + label + tip
├── AddTask.jsx
│   ├── <NLInput />            ← textarea + "Parse with AI" button
│   ├── <ParsedPreview />      ← editable list before saving
│   └── <ManualForm />         ← fallback if AI fails
├── Schedule.jsx
│   ├── <Timeline />           ← horizontal colored blocks
│   └── <HoursInput />         ← "Available hours today" → regenerate
└── Rescue.jsx
    ├── <RescuePanel />        ← dropped (red) + focus (green) lists
    ├── <ProbabilityFlip />    ← before → after animation
    └── <WhatIfSlider />       ← drag → calls /rescue/simulate
```

### SSE Streaming for Decompose
```javascript
// AddTask.jsx — use EventSource, NOT axios for streaming
const streamDecompose = (taskName) => {
    const es = new EventSource(
        `http://localhost:8000/api/tasks/${taskId}/decompose/stream`
    );
    es.onmessage = (e) => {
        setSubtasks(prev => [...prev, JSON.parse(e.data)]);
    };
    es.onerror = () => es.close();
};
```

### Error States (Required — will fail otherwise)
```javascript
// Every API call needs this pattern
const [state, setState] = useState({ data: null, loading: false, error: null });

const callAPI = async (fn) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
        const data = await fn();
        setState({ data, loading: false, error: null });
    } catch (e) {
        setState(s => ({ ...s, loading: false, error: e.message }));
    }
};

// AddTask: if AI parse fails → show ManualForm automatically
// Rescue: if endpoint fails → show "Retry" button
// Dashboard: if slow → show last cached data
```

---

## Phase 4: Polish & Demo Prep
**Target: Hours 30–48**

### Hour 30–36: Deadline DNA UI
```jsx
const DNA_CONFIG = {
    last_minute:  { emoji: "⚡", label: "Last Minute Worker",  color: "yellow" },
    consistent:   { emoji: "🔥", label: "Consistent Worker",   color: "green"  },
    deep_focus:   { emoji: "🎯", label: "Deep Focus Worker",   color: "blue"   },
    overcommitter:{ emoji: "🌀", label: "Overcommitter",       color: "red"    },
};
// Badge shows emoji + label + AI advisor tip from advisor_agent
```

### Hour 36–42: What-If Slider
```jsx
<input
    type="range" min={0} max={12} step={0.5}
    onChange={async (e) => {
        const res = await api.get(`/rescue/simulate?extra_hours=${e.target.value}`);
        setSimulatedSuccess(res.data.success_probability);
    }}
/>
// Calls /rescue/simulate — pure Python, instant response, no AI
```

### Hour 42–48: Demo Rehearsal
1. Run `/api/debug/seed` → loads "7 PM Crisis" state
2. Show dashboard: Risk = CRITICAL, Success = 31%
3. Go to Add Task → show streaming decompose
4. Go to Rescue → click 🚨 Rescue Me
5. Show: **31% → 87%**
6. Drag What-if Slider
7. Show DNA badge: `⚡ Last Minute Worker`

**Rehearse 3 times. Time it. Should be under 4 minutes.**

---

## Folder Structure (Final)

```
LifeSaver/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── .env
│   ├── agents/
│   │   ├── parser_agent.py       ← Agent 1: NL → tasks
│   │   ├── decomposer_agent.py   ← Agent 2: task → subtasks
│   │   └── advisor_agent.py      ← Agent 3: context → tip
│   ├── services/
│   │   ├── llm_orchestrator.py   ← Central AI controller
│   │   ├── priority_engine.py
│   │   ├── scheduler_engine.py
│   │   ├── risk_predictor.py
│   │   ├── rescue_engine.py
│   │   └── dna_analyzer.py
│   ├── routes/
│   │   ├── tasks.py
│   │   ├── scheduler.py
│   │   ├── rescue.py
│   │   ├── dashboard.py
│   │   └── debug.py
│   └── tests/
│       ├── test_priority.py
│       ├── test_scheduler.py
│       └── test_rescue.py
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── services/api.js
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── AddTask.jsx
    │   │   ├── Schedule.jsx
    │   │   └── Rescue.jsx
    │   └── components/
    │       ├── SuccessGauge.jsx
    │       ├── RiskMeter.jsx
    │       ├── TaskCard.jsx
    │       ├── Timeline.jsx
    │       ├── DNABadge.jsx
    │       └── WhatIfSlider.jsx
    └── package.json
```

---

## Quick Reference: What Uses AI vs Python

| Feature | How | Why |
|---|---|---|
| Parse natural language | Agent 1 (Groq) | Only AI can do this |
| Decompose tasks | Agent 2 → pattern → cache → Groq | AI only for unknown tasks |
| Rescue tip text | Agent 3 (Groq) | Short, <15 words, 1 call |
| Priority scoring | Pure Python | Formula, no ambiguity |
| Scheduling | Pure Python | Deterministic packing |
| Risk score | Pure Python | Formula |
| Success probability | Pure Python | Formula |
| Rescue logic | Pure Python | Must never fail |
| What-if slider | Pure Python | Must be instant |
| DNA analysis | Pure Python | Rule-based |

**Estimated AI calls for full demo: 3–5 total.**

---

## Tests (Run Before Demo)

```python
# tests/test_priority.py
def test_urgent_task_scores_high():
    task = MockTask(deadline=now()+timedelta(hours=2), importance=9, estimated_hours=3)
    assert priority_engine.score(task) > 85

# tests/test_rescue.py
def test_rescue_improves_probability():
    before = risk_predictor.success(risk_score=70, completed=0, dna="consistent")
    result = rescue_engine.rescue(tasks, subtasks, hours_remaining=4, dna="consistent")
    assert result["after_success"] > before

# tests/test_scheduler.py
def test_schedule_fits_available_hours():
    slots = scheduler_engine.build(tasks, available_hours=6)
    total = sum(s["hours"] for s in slots)
    assert total <= 6
```

```bash
cd backend && python -m pytest tests/ -v
```

---

*Hand this file to your AI coding agent. Start with Phase 1.2 (models), then 1.3 (orchestrator), then agents, then engines. Routes and frontend come last. Never skip the startup seed.*