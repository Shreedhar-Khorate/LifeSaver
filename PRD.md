# PRD: Life Saver
**Version:** 1.0  
**Type:** Hackathon Build (24–48 hrs)  
**Status:** Ready to Build  
**Tagline:** *We don't remind users. We rescue them before they fail.*

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [System Architecture](#5-system-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Frontend Pages](#9-frontend-pages)
10. [AI Strategy & Token Management](#10-ai-strategy--token-management)
11. [Formulas & Logic](#11-formulas--logic)
12. [Folder Structure](#12-folder-structure)
13. [Known Problems & Solutions](#13-known-problems--solutions)
14. [Demo Flow](#14-demo-flow)
15. [Build Timeline](#15-build-timeline)
16. [Out of Scope](#16-out-of-scope)

---

## 1. Problem Statement

### The Real Problem

Students and professionals consistently miss deadlines — not because they forget them, but because they **don't know how to respond when things go wrong.**

Existing tools fail at the critical moment:

| Tool | What it does | Where it fails |
|---|---|---|
| Google Calendar | Shows the deadline | Doesn't help when you're behind |
| Todoist / Notion | Stores tasks | Doesn't prioritize or adapt |
| Reminder apps | Sends notifications | Notifying ≠ rescuing |
| ChatGPT | Answers questions | Requires manual input every time |

### The Gap

No existing tool answers the question a student actually asks at 9 PM:

> *"I have 5 tasks and 4 hours left. What do I do right now to not fail?"*

### Why This Matters

- 87% of students report deadline-related stress regularly
- The problem is not lack of awareness — it is lack of **real-time adaptive planning**
- A system that *rescues* the day is fundamentally more valuable than one that *reminds* about the day

---

## 2. Solution Overview

**The Last Minute Life Saver** is an AI productivity co-pilot that:

1. **Understands** tasks from natural language input
2. **Decomposes** tasks into subtasks with time estimates
3. **Prioritizes** using a weighted formula (no AI wasted here)
4. **Schedules** work blocks into available hours
5. **Rescues** the plan when time runs out — dropping non-essentials and recalculating success probability

### The Core Loop

```
User inputs tasks (natural language)
        ↓
AI parses into structured data (1 API call)
        ↓
AI decomposes into subtasks with hours (cached, 1 call per unique task type)
        ↓
Priority Engine scores all tasks (pure Python)
        ↓
Scheduler Engine fits tasks into available hours (pure Python)
        ↓
Risk & Success scores calculated (pure Python)
        ↓
User falls behind → clicks 🚨 Rescue Me
        ↓
Rescue Engine drops non-essentials, reschedules, recalculates
        ↓
Success probability shown: Before 38% → After 87%
```

---

## 3. Target Users

**Primary:** College students with multiple concurrent deadlines  
**Secondary:** Working professionals managing overlapping projects

### User Persona

**Name:** Arjun, 20, Engineering student  
**Situation:** Has an ML assignment due tomorrow, a hackathon PPT tonight, and an interview Friday  
**Pain:** Opens Notion, sees everything, freezes, does nothing  
**Need:** Someone to tell him exactly what to do in the next 4 hours  

---

## 4. Core Features

### Module 1: Smart Task Intake

**What it does:** Converts natural language into structured task data using one AI call.

**Input (user types):**
```
I have:
AI assignment tomorrow 11 PM
Hackathon PPT today 8 PM
Interview Friday
Gym everyday
```

**Output (AI returns JSON):**
```json
[
  {
    "name": "AI Assignment",
    "deadline": "2026-06-24 23:00",
    "importance": 9,
    "estimated_hours": 4
  },
  {
    "name": "Hackathon PPT",
    "deadline": "2026-06-23 20:00",
    "importance": 10,
    "estimated_hours": 3
  },
  {
    "name": "Interview Prep",
    "deadline": "2026-06-27 09:00",
    "importance": 8,
    "estimated_hours": 2
  },
  {
    "name": "Gym",
    "deadline": null,
    "importance": 4,
    "estimated_hours": 1
  }
]
```

**Token strategy:** Single batched call. Parse + estimate in one prompt.

---

### Module 2: AI Task Decomposer

**What it does:** Breaks a task into subtasks with time estimates.

**Input:** `"Build a machine learning project"`

**Output:**
```json
[
  { "subtask": "Collect dataset", "hours": 1 },
  { "subtask": "Clean and preprocess data", "hours": 2 },
  { "subtask": "Train model", "hours": 2 },
  { "subtask": "Build UI", "hours": 3 },
  { "subtask": "Testing", "hours": 1 },
  { "subtask": "Documentation", "hours": 1 }
]
```

**Token strategy:**
- MD5 hash the task name → check cache in DB first
- Match against known patterns (presentation, assignment, interview, gym) → return without AI call
- Only call AI for unknown task types
- Result: ~80% of calls never reach the API

---

### Module 3: Priority Engine

**What it does:** Scores every task on a 0–100 scale using pure Python. No AI.

**Formula:**
```python
def calculate_priority(task):
    hours_to_deadline = (task.deadline - now()).total_seconds() / 3600
    time_available_ratio = min(1.0, task.estimated_hours / max(1, hours_to_deadline))

    urgency    = max(0, 100 - hours_to_deadline)           # 0-100
    importance = task.importance * 10                       # 0-100
    effort     = time_available_ratio * 100                 # higher = more at risk
    dependency = 10 if task.has_dependencies else 0         # 0 or 10

    priority = (
        urgency    * 0.40 +
        importance * 0.30 +
        effort     * 0.20 +
        dependency * 0.10
    )
    return round(min(100, priority), 1)
```

**Example output:**

| Task | Priority Score |
|---|---|
| Hackathon PPT | 98.2 |
| AI Assignment | 94.7 |
| Interview Prep | 89.1 |
| Gym | 42.3 |

Tasks are stored sorted descending by priority.

---

### Module 4: Dynamic Scheduler

**What it does:** Fits tasks into user's available hours for today.

**Input:** Available hours (user selects how many free hours they have today)

**Algorithm (pure Python):**
```python
def schedule(tasks, available_hours):
    schedule = []
    remaining = available_hours
    current_time = get_current_time()

    for task in sorted_by_priority(tasks):
        if remaining <= 0:
            break
        allocated = min(task.estimated_hours, remaining)
        schedule.append({
            "task": task.name,
            "start": current_time,
            "end": current_time + timedelta(hours=allocated),
            "hours": allocated
        })
        current_time += timedelta(hours=allocated)
        remaining -= allocated

    return schedule
```

**Output (timeline displayed in UI):**
```
09:00 – 11:00   Hackathon PPT        (2 hrs)
11:00 – 12:00   AI Assignment        (1 hr)
14:00 – 16:00   AI Assignment cont.  (2 hrs)
16:00 – 17:00   Interview Prep       (1 hr)
```

---

### Module 5: Rescue Mode ⭐ (Hero Feature)

**What it does:** When the user is running out of time, AI drops non-essential work and recalculates what's actually achievable.

**Trigger:** User clicks `🚨 Rescue Me` button

**Input state:**
```json
{
  "tasks_pending": 5,
  "hours_remaining": 4,
  "completed_subtasks": ["Dataset collection", "Data cleaning"]
}
```

**Rescue Engine logic (pure Python):**
```python
def rescue(pending_tasks, hours_remaining):
    # Step 1: Mark non-essentials
    droppable = ["Documentation", "Animations", "Optional features", "Polish"]
    
    # Step 2: Identify core deliverables
    core = ["Core implementation", "Testing", "Submission"]
    
    # Step 3: Recalculate time needed
    core_hours = sum(t.hours for t in pending_tasks if t.subtask in core)
    
    # Step 4: Fit into remaining hours
    if core_hours <= hours_remaining:
        success = calculate_success(core_hours, hours_remaining)
    
    return {
        "dropped": droppable_tasks,
        "focus": core_tasks,
        "new_schedule": reschedule(core_tasks, hours_remaining),
        "success_probability": success
    }
```

**Output displayed to user:**

```
❌ Drop These:        ✅ Focus On:
Documentation         Core implementation
Animations            Testing
Optional features     Submission

Before Rescue: 38%   →   After Rescue: 87%
```

**What-if Slider (bonus feature):**  
Drag slider for "I can work X more hours" → success probability updates in real time. Pure math, no API call.

---

### Module 6: Deadline DNA (Bonus — Memorable Feature)

**What it does:** Profiles each user's work pattern and adapts recommendations.

**Types:**
```
⚡ Last Minute Worker    — Does best work under pressure. Schedule dense blocks near deadline.
🔥 Consistent Worker    — Steady output. Spread tasks evenly across days.
🎯 Deep Focus Worker    — Needs long uninterrupted sessions. Avoid fragmented scheduling.
🌀 Overcommitter        — Takes on too much. Warn when task load exceeds capacity.
```

**Determination logic:** Based on:
- Average time between task creation and first subtask completion
- Ratio of tasks completed before vs after 80% of deadline has passed
- Historical completion rate

**How it affects the system:**
- Last Minute Worker → scheduler clusters tasks closer to deadline
- Overcommitter → system warns "You have 24 hrs of work in 8 hrs. Remove 2 tasks."
- Deep Focus Worker → scheduler creates 2-hr minimum blocks, avoids 30-min slots

---

## 5. System Architecture

```
┌─────────────────────────────────────────────┐
│               React Frontend                │
│   Dashboard │ Add Task │ Schedule │ Rescue  │
└──────────────────┬──────────────────────────┘
                   │ HTTP / SSE (streaming)
┌──────────────────▼──────────────────────────┐
│              FastAPI Backend                │
│                                             │
│  Routes: /tasks  /schedule  /rescue         │
│          /decompose  /dashboard             │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │    Services Layer   │
        │                     │
        │  priority_engine    │  ← Pure Python
        │  scheduler_engine   │  ← Pure Python
        │  risk_predictor     │  ← Pure Python
        │  rescue_engine      │  ← Pure Python
        │  task_decomposer    │  ← AI (cached)
        │  task_parser        │  ← AI (batched)
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │      Database       │
        │   SQLite (hackathon)│
        │   Supabase (prod)   │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │     AI Service      │
        │  Groq (primary)     │
        │  Gemini Flash (fb)  │
        └─────────────────────┘
```

---

## 6. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React | UI framework |
| Tailwind CSS | Styling |
| Shadcn UI | Component library |
| Chart.js | Risk meter, success gauge |
| Lucide Icons | Icons |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API |
| Python 3.11+ | Business logic |
| SQLAlchemy | ORM |
| Pydantic | Data validation |

### Database
| Option | When to use |
|---|---|
| SQLite | Hackathon (zero setup) |
| Supabase PostgreSQL | If deploying publicly |

### AI
| Service | Role | Why |
|---|---|---|
| Groq (Llama 3.1) | Primary AI | Free, very fast (<1s), generous limits |
| Gemini 1.5 Flash | Fallback | 1M token context, generous free tier |

### Other
| Technology | Purpose |
|---|---|
| Server-Sent Events | Streaming AI responses |
| Browser Notification API | Optional alerts (cut if time is short) |

---

## 7. Database Schema

### users
```sql
CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    peak_hours  TEXT,                    -- JSON: ["09:00-12:00", "14:00-18:00"]
    dna_type    TEXT,                    -- last_minute / consistent / deep_focus / overcommitter
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### tasks
```sql
CREATE TABLE tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    task_name       TEXT NOT NULL,
    deadline        DATETIME,
    importance      INTEGER CHECK(importance BETWEEN 1 AND 10),
    estimated_hours FLOAT,
    priority_score  FLOAT,
    status          TEXT DEFAULT 'pending',  -- pending / in_progress / completed / dropped
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### subtasks
```sql
CREATE TABLE subtasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER REFERENCES tasks(id),
    name        TEXT NOT NULL,
    hours       FLOAT,
    is_core     BOOLEAN DEFAULT TRUE,   -- FALSE = droppable in rescue mode
    completed   BOOLEAN DEFAULT FALSE,
    order_index INTEGER
);
```

### schedule
```sql
CREATE TABLE schedule (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    task_id     INTEGER REFERENCES tasks(id),
    start_time  DATETIME,
    end_time    DATETIME,
    date        DATE,
    is_rescued  BOOLEAN DEFAULT FALSE   -- TRUE if created by rescue engine
);
```

### decomposition_cache
```sql
CREATE TABLE decomposition_cache (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key   TEXT UNIQUE NOT NULL,   -- MD5 hash of normalized task name
    task_type   TEXT,
    subtasks    TEXT NOT NULL,          -- JSON array
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. API Endpoints

### Tasks
```
POST   /api/tasks/parse          → Parse natural language into tasks (AI call)
POST   /api/tasks                → Create task manually
GET    /api/tasks                → Get all tasks for user
PATCH  /api/tasks/{id}           → Update task status
DELETE /api/tasks/{id}           → Delete task
```

### Decomposition
```
POST   /api/decompose            → Decompose task into subtasks (AI, cached)
POST   /api/decompose/stream     → Same but streamed via SSE
```

### Schedule
```
GET    /api/schedule/today       → Get today's schedule
POST   /api/schedule/generate    → Generate schedule from tasks + available hours
```

### Rescue
```
POST   /api/rescue               → Trigger rescue mode
GET    /api/rescue/simulate      → Simulate rescue with X extra hours (for slider)
```

### Dashboard
```
GET    /api/dashboard            → Tasks today, risk score, success probability, DNA type
```

---

## 9. Frontend Pages

### Page 1: Dashboard (`/`)
**Shows:**
- Today's tasks with priority badges
- Current success probability gauge (0–100%)
- Risk meter (low / medium / high / critical)
- Upcoming deadlines in next 24 hrs
- Deadline DNA badge
- Quick action: `🚨 Rescue Me` (always visible if risk > 60)

**Components:**
- `<SuccessGauge />` — circular progress chart
- `<RiskMeter />` — color-coded bar
- `<TaskCard />` — task with priority score + deadline countdown
- `<DNABadge />` — user's work personality

---

### Page 2: Add Task (`/add`)
**Fields:**
- Natural language input (textarea): *"I have ML assignment tomorrow 11 PM..."*
- OR manual form: Task Name, Deadline (datetime picker), Importance (1–10 slider), Estimated Hours
- Available hours today (simple number input: "I have X hours free today")

**Flow:**
1. User pastes tasks in natural language
2. Clicks "Parse with AI"
3. AI returns structured list (streamed)
4. User reviews, edits if needed
5. Clicks "Add All Tasks"

---

### Page 3: Schedule (`/schedule`)
**Shows:**
- Timeline view of today's schedule (horizontal blocks)
- Color-coded by task priority (red = high, yellow = medium, green = low)
- Estimated completion time per task
- Toggle: "Show rescued plan" vs "Show original plan"

---

### Page 4: Rescue (`/rescue`)
**Shows:**
- Current state: X tasks pending, Y hours left
- What will be dropped (red, strikethrough)
- What to focus on (green, checkmark)
- Before/After success probability
- `What-if Slider`: "If I get X more hours..." → live probability update
- New timeline after rescue

**CTA:** Big red `🚨 Rescue Me` button

---

## 10. AI Strategy & Token Management

### Rule: AI is a surgeon, not a janitor

Only call AI when no other approach works.

### What uses AI

| Feature | AI usage | Tokens per call |
|---|---|---|
| Natural language task parsing | Yes | ~50 tokens |
| Task decomposition (uncached) | Yes | ~80 tokens |
| Task decomposition (cached) | No | 0 |
| Task decomposition (known pattern) | No | 0 |

### What does NOT use AI

Priority scoring, scheduling, risk calculation, success probability, rescue logic, dashboard stats — all pure Python.

---

### Strategy 1: Local Pattern Classifier (Before Any API Call)

```python
KNOWN_PATTERNS = {
    "presentation|ppt|slides|deck": [
        {"subtask": "Create outline", "hours": 0.5},
        {"subtask": "Build slides", "hours": 1.5},
        {"subtask": "Add visuals", "hours": 1.0},
        {"subtask": "Rehearse", "hours": 0.5}
    ],
    "assignment|homework|project": [
        {"subtask": "Research", "hours": 1.0},
        {"subtask": "Outline", "hours": 0.5},
        {"subtask": "Write/Build", "hours": 2.0},
        {"subtask": "Review", "hours": 0.5},
        {"subtask": "Submit", "hours": 0.25}
    ],
    "interview": [
        {"subtask": "Research company", "hours": 0.5},
        {"subtask": "Review resume", "hours": 0.5},
        {"subtask": "Practice answers", "hours": 1.0},
        {"subtask": "Prepare questions", "hours": 0.25}
    ],
    "gym|workout|exercise": [
        {"subtask": "Warmup", "hours": 0.25},
        {"subtask": "Main workout", "hours": 0.75},
        {"subtask": "Cooldown", "hours": 0.25}
    ]
}
```

Result: ~80% of tasks never reach the API.

---

### Strategy 2: MD5 Cache for Unknown Tasks

```python
import hashlib

def get_cache_key(task_name: str) -> str:
    normalized = task_name.lower().strip()
    return hashlib.md5(normalized.encode()).hexdigest()

async def decompose(task_name: str):
    # 1. Pattern match (0 tokens)
    match = pattern_match(task_name)
    if match:
        return match

    # 2. Cache check (0 tokens)
    key = get_cache_key(task_name)
    cached = db.query(DecompositionCache).filter_by(key=key).first()
    if cached:
        return json.loads(cached.subtasks)

    # 3. AI call (tokens spent)
    result = await call_ai(task_name)
    
    # 4. Save to cache
    db.add(DecompositionCache(key=key, subtasks=json.dumps(result)))
    db.commit()
    
    return result
```

---

### Strategy 3: Compressed Prompts

**Task parsing prompt (~40 tokens input):**
```
Parse tasks from this text. Return JSON only, no explanation.
Schema: [{"name":"","deadline":"YYYY-MM-DD HH:MM or null","importance":1-10,"estimated_hours":0}]
Text: "{user_input}"
```

**Task decomposition prompt (~30 tokens input):**
```
Decompose: "{task_name}"
Return JSON only: [{"subtask":"","hours":0,"is_core":true}]
Mark is_core false for: docs, animations, polish, optional features.
```

---

### Strategy 4: Groq Primary, Gemini Fallback

```python
async def call_ai(prompt: str) -> str:
    try:
        return await call_groq(prompt)
    except RateLimitError:
        return await call_gemini_flash(prompt)
    except Exception as e:
        raise AIServiceError(str(e))
```

**Groq:** Free, Llama 3.1 70B, <1 second responses, 14,400 requests/day free  
**Gemini Flash:** 1M context, 15 RPM free, fallback when Groq is rate-limited

---

### Strategy 5: Streaming for UX

```python
@router.post("/decompose/stream")
async def stream_decompose(task: TaskInput):
    async def generate():
        async for chunk in groq_stream(task.name):
            yield f"data: {chunk}\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
```

Even a 2-second AI call feels instant when text appears progressively. Judges see "live AI" which is memorable.

---

### Estimated API usage for full demo session

| Action | Calls | Source |
|---|---|---|
| Parse all tasks (batch) | 1 | Groq |
| Decompose Hackathon PPT | 0 | Pattern match |
| Decompose AI Assignment | 0 | Pattern match |
| Decompose Interview | 0 | Pattern match |
| Decompose unknown task | 1 | Groq |
| Rescue mode | 0 | Pure Python |
| **Total** | **2–3 calls** | |

---

## 11. Formulas & Logic

### Priority Score
```python
def priority(task, now):
    hours_left = max(0.1, (task.deadline - now).seconds / 3600)
    time_ratio  = min(1.0, task.estimated_hours / hours_left)
    urgency     = max(0, min(100, 100 - hours_left))
    importance  = task.importance * 10
    effort_risk = time_ratio * 100
    dependency  = 10 if task.has_dependencies else 0

    return round(
        urgency    * 0.40 +
        importance * 0.30 +
        effort_risk * 0.20 +
        dependency * 0.10,
        1
    )
```

### Risk Score
```python
def risk(pending_tasks, now):
    score = 0
    for task in pending_tasks:
        hours_left = (task.deadline - now).seconds / 3600
        score += (5 * len(pending_tasks))
        score += (8 * max(0, 10 - hours_left))
        score += (3 * task.estimated_hours)
    return min(100, score)
```

### Success Probability
```python
def success_probability(risk_score, completion_history):
    BASE_BONUS = 20   # Neutral baseline for new users
    history_bonus = min(30, completion_history * 3)
    return max(0, min(100, 100 - risk_score + BASE_BONUS + history_bonus))
```

### Rescue Success Probability
```python
def rescue_probability(core_hours, hours_remaining, user_dna):
    if hours_remaining <= 0:
        return 5
    
    fit_ratio = min(1.0, hours_remaining / core_hours)
    base = fit_ratio * 100
    
    dna_bonus = {
        "last_minute": 10,
        "consistent": 5,
        "deep_focus": 7,
        "overcommitter": -5
    }.get(user_dna, 0)
    
    return round(min(97, base + dna_bonus), 0)
```

---

## 12. Folder Structure

### Backend
```
backend/
├── main.py
├── database.py
├── models.py
├── schemas.py
├── routes/
│   ├── tasks.py
│   ├── scheduler.py
│   ├── rescue.py
│   └── dashboard.py
└── services/
    ├── ai_service.py          ← Groq + Gemini, fallback, streaming
    ├── task_parser.py         ← Natural language → structured tasks
    ├── task_decomposer.py     ← Pattern match → cache → AI
    ├── priority_engine.py     ← Pure Python priority scoring
    ├── scheduler_engine.py    ← Pure Python scheduling
    ├── risk_predictor.py      ← Pure Python risk calculation
    ├── rescue_engine.py       ← Pure Python rescue logic
    └── dna_analyzer.py        ← User behavior profiling
```

### Frontend
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── AddTask.jsx
│   │   ├── Schedule.jsx
│   │   └── Rescue.jsx
│   ├── components/
│   │   ├── SuccessGauge.jsx
│   │   ├── RiskMeter.jsx
│   │   ├── TaskCard.jsx
│   │   ├── Timeline.jsx
│   │   ├── DNABadge.jsx
│   │   └── WhatIfSlider.jsx
│   ├── services/
│   │   └── api.js
│   └── App.jsx
```

---

## 13. Known Problems & Solutions

This section documents every technical problem you will likely hit during the hackathon build, and how to solve it before it costs you time.

---

### Problem 1: AI returns malformed JSON

**When it happens:** AI sometimes adds a preamble like "Sure! Here is the JSON:" before the actual JSON.

**Solution:**
```python
import re, json

def safe_parse_json(raw: str) -> dict:
    # Strip markdown code fences
    raw = re.sub(r"```json|```", "", raw).strip()
    # Find first { or [ 
    start = min(
        (raw.find("{") if "{" in raw else len(raw)),
        (raw.find("[") if "[" in raw else len(raw))
    )
    raw = raw[start:]
    return json.loads(raw)
```

---

### Problem 2: Groq rate limit hit during demo

**When it happens:** Free tier is 30 requests/minute. If you demo rapidly you may hit it.

**Solution:** Implement fallback chain:
```python
async def call_ai(prompt):
    try:
        return await groq_call(prompt)
    except RateLimitError:
        await asyncio.sleep(1)
        return await gemini_flash_call(prompt)
```

Also: Pre-cache your demo tasks before presenting. Run the demo once privately — all decompositions will be cached and zero calls will be made during the live demo.

---

### Problem 3: Deadline parsing fails for relative dates

**When it happens:** User types "tomorrow 11 PM" and the AI returns `"tomorrow 11 PM"` instead of a proper datetime.

**Solution:** Always include today's date in the parsing prompt:
```python
prompt = f"""
Today is {datetime.now().strftime('%Y-%m-%d %H:%M')}.
Parse tasks. Convert all relative dates to absolute YYYY-MM-DD HH:MM format.
...
"""
```

---

### Problem 4: Priority score doesn't change visibly during demo

**When it happens:** If all tasks have similar deadlines, scores cluster and the UI looks static.

**Solution:** Add demo seed data with a spread of deadlines (2 hours from now, 24 hours, 3 days, 1 week). This ensures the priority list looks dynamic and meaningful.

---

### Problem 5: Schedule overlaps when user has gaps in availability

**When it happens:** Scheduler places tasks back-to-back including lunch/break hours.

**Solution:** Ask for total free hours, not specific time slots. Let the scheduler handle distribution. Keep it simple for hackathon:
```python
# User inputs: "I have 6 free hours today"
# Scheduler distributes starting from now, ignoring wall clock
```

---

### Problem 6: React state gets stale after rescue

**When it happens:** User clicks Rescue, backend updates tasks, but frontend still shows old schedule.

**Solution:** After every rescue API call, invalidate and refetch both tasks and schedule:
```javascript
const handleRescue = async () => {
    await api.post('/rescue');
    await Promise.all([
        refetchTasks(),
        refetchSchedule(),
        refetchDashboard()
    ]);
};
```

---

### Problem 7: Success probability starts at 0% for new users

**When it happens:** `completion_history = 0` for fresh accounts, making initial probability look pessimistic.

**Solution:** Add a `BASE_BONUS = 20` to the formula. New users start at neutral, not pessimistic. This also prevents the "After Rescue" number from being artificially dramatic for the wrong reason.

---

### Problem 8: CORS errors between React (port 5173) and FastAPI (port 8000)

**When it happens:** Always, first time you connect frontend to backend.

**Solution (add to main.py immediately):**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Problem 9: SSE streaming breaks on some browsers

**When it happens:** EventSource in browser doesn't reconnect cleanly.

**Solution:** Use a simple polling fallback if SSE fails. For hackathon, non-streamed response is acceptable. Only add streaming if core features are done by hour 36.

---

### Problem 10: SQLite doesn't support concurrent writes

**When it happens:** If two requests write simultaneously (unlikely in hackathon).

**Solution:** Add `check_same_thread=False` and use a connection pool:
```python
engine = create_engine(
    "sqlite:///./app.db",
    connect_args={"check_same_thread": False}
)
```

---

## 14. Demo Flow

**This is the story you tell. Practice it 3 times before presenting.**

### Step 1 — Show the problem (30 seconds)
Open the app. Dashboard shows 0 tasks. "This is what every student sees at 6 PM."

### Step 2 — Natural language input (30 seconds)
Type into the input box:
```
I have ML assignment tomorrow 11 PM, hackathon PPT tonight 8 PM, interview Friday, gym daily
```
Click "Parse". Watch structured tasks appear with deadlines and importance scores.

### Step 3 — AI decomposition (30 seconds)
Click on "Hackathon PPT". Watch it decompose live (stream it).  
Show: "Create outline → Build slides → Add visuals → Rehearse"

### Step 4 — Priority + Schedule (30 seconds)
Show the priority table. Hackathon PPT is 98.2, Gym is 42.3.  
Click "Generate Schedule". Show the timeline.

### Step 5 — Crisis moment (15 seconds)
Say: "Now it's 7 PM. We lost 2 hours. We still have 5 tasks."  
Show risk meter jump to CRITICAL (red). Success probability drops to 38%.

### Step 6 — Rescue Mode (45 seconds)
Click `🚨 Rescue Me`.  
Show what gets dropped (Documentation, Animations).  
Show what to focus on (Core implementation, Testing, Submission).  
Show: **Before: 38% → After: 87%**  
Move the "What-if Slider" — watch the number change live.

### Step 7 — Deadline DNA (15 seconds)
Show the badge: `⚡ Last Minute Worker`  
Say: "The system knows this user works best under pressure, so it clusters tasks near the deadline."

**Total demo time: ~3.5 minutes**

---

## 15. Build Timeline

| Hours | What to Build | Priority |
|---|---|---|
| 0–2 | FastAPI setup, SQLite, models, CORS | Must |
| 2–5 | Task CRUD, Priority Engine, basic `/dashboard` endpoint | Must |
| 5–8 | AI Service (Groq + fallback), task parser, decomposer with cache | Must |
| 8–13 | React setup, Dashboard page, Add Task page | Must |
| 13–18 | Scheduler Engine, Schedule page (timeline UI) | Must |
| 18–24 | Rescue Engine, Rescue page, before/after probability display | Must |
| 24–30 | Deadline DNA logic + badge, What-if Slider | Should |
| 30–36 | Streaming decomposition, Chart.js gauges, polish UI | Should |
| 36–42 | Demo data seeding, edge case testing, mobile check | Should |
| 42–48 | Rehearse demo flow 3x, fix anything that breaks in demo | Must |

---

## 16. Out of Scope

Do NOT build these. They will cost time and win nothing.

| Feature | Why excluded |
|---|---|
| User authentication / login | Not needed for hackathon demo |
| Email/SMS notifications | Browser badge is enough |
| Google Calendar sync | High integration cost, low demo value |
| Recurring tasks with complex rules | Adds edge cases, no visual payoff |
| Multi-user / team features | Solo user demo is cleaner |
| Mobile app | Web responsive is sufficient |
| Dark/light mode toggle | Style polish after features |
| Detailed settings page | No judges ask about settings |

---

## Appendix: Environment Variables

```env
# .env
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=any_random_string_for_hackathon
FRONTEND_URL=http://localhost:5173
```

---

## Appendix: Quick Start Commands

```bash
# Backend
cd backend
pip install fastapi uvicorn sqlalchemy pydantic python-dotenv groq google-generativeai
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm create vite@latest . -- --template react
npm install tailwindcss @shadcn/ui lucide-react chart.js axios
npm run dev
```

---

*PRD Version 1.0 — Built for 24–48 hour hackathon. Prioritize Modules 1–5. Module 6 (Deadline DNA) is bonus. Ship rescue mode before anything else.*
