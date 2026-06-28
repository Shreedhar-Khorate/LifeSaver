# LifeSaver — Issues & Fixes Guide

> A complete list of all identified issues, their root causes, and exact code-level solutions.  
> Also includes a full **Supabase migration guide** to replace the local SQLite database.

---

## Table of Contents

1. [🔴 Critical Issues](#-critical-issues)
2. [🟠 Major Issues](#-major-issues)
3. [🟡 Moderate Issues](#-moderate-issues)
4. [🟢 Minor Issues](#-minor-issues)
5. [🗄️ Supabase Migration Guide](#️-supabase-migration-guide)

---

## 🔴 Critical Issues

---

### Issue 1 — Debug API Has No Auth Guard (Anyone Can Wipe Your DB)

**File:** `backend/routes/debug.py`  
**Risk:** Any person on the internet can call `POST /api/debug/reset` and delete every row in your database.

**Fix — Add an env-based secret key guard:**

```python
# backend/routes/debug.py

import os
from fastapi import APIRouter, Depends, HTTPException, Header

router = APIRouter(prefix="/api/debug", tags=["Debug"])

def verify_debug_key(x_debug_key: str = Header(...)):
    expected = os.getenv("DEBUG_SECRET_KEY", "")
    if not expected or x_debug_key != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/seed")
def seed_demo(db: Session = Depends(get_db), _=Depends(verify_debug_key)):
    ...

@router.post("/reset")
def reset_data(db: Session = Depends(get_db), _=Depends(verify_debug_key)):
    ...
```

**Add to `.env`:**
```env
DEBUG_SECRET_KEY=some-very-long-random-secret-string-here
```

**Frontend — pass the header when calling seed/reset:**
```js
// frontend/src/services/api.js
export const seedDemo = () =>
  api.post('/debug/seed', {}, {
    headers: { 'X-Debug-Key': import.meta.env.VITE_DEBUG_KEY }
  });
```

---

### Issue 2 — Timezone Mismatch (`utcnow` vs `now`)

**Files:** `debug.py`, `priority_engine.py`, `risk_predictor.py`, `dna_analyzer.py`, `models.py`  
**Root cause:** `debug.py` seeds tasks using `datetime.now()` (local IST time), but all engines compare against `datetime.utcnow()`. In IST (+5:30), this creates a **5.5-hour error** in priority scores and deadline countdowns.

**Fix — Use timezone-aware UTC everywhere:**

```python
# Replace ALL occurrences of:
from datetime import datetime
now = datetime.utcnow()        # ❌ deprecated, naive
now = datetime.now()           # ❌ local time, inconsistent

# With:
from datetime import datetime, timezone
now = datetime.now(timezone.utc)   # ✅ aware, consistent
```

**Specifically update these files:**

```python
# models.py — fix default timestamps
created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

# priority_engine.py
def score(task, now=None):
    now = now or datetime.now(timezone.utc)

# risk_predictor.py
def calculate(tasks, now=None):
    now = now or datetime.now(timezone.utc)

# debug.py
now = datetime.now(timezone.utc)
```

---

### Issue 3 — No Pinned Dependency Versions

**File:** `backend/requirements.txt`  
**Risk:** A `pip install` 3 months from now can pull a breaking version of FastAPI, SQLAlchemy, or Pydantic.

**Fix — Pin all versions:**

```txt
# requirements.txt
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
pydantic==2.10.3
python-dotenv==1.0.1
groq==0.12.0
google-generativeai==0.8.3
pytest==8.3.4
httpx==0.28.0          # needed for FastAPI TestClient
psycopg2-binary==2.9.10  # for Supabase/PostgreSQL
```

> Run `pip freeze > requirements.txt` after installing to capture exact versions.

---

### Issue 4 — `@app.on_event("startup")` is Deprecated

**File:** `backend/main.py` (line 53)  
**Risk:** Will be removed in a future FastAPI version.

**Fix — Use the `lifespan` context manager:**

```python
# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter_by(id=1).first():
            db.add(User(id=1, name="Demo User"))
            db.commit()
    finally:
        db.close()

    yield  # App runs here

    # Shutdown logic (if needed)
    # e.g., close connection pools

app = FastAPI(
    title="Life Saver API",
    lifespan=lifespan,   # ✅ pass lifespan here
)
```

---

## 🟠 Major Issues

---

### Issue 5 — Priority Score Formula Broken for No-Deadline Tasks

**File:** `backend/services/priority_engine.py` (line 14)  
**Problem:** Tasks without a deadline are capped at `importance × 4.5 = max 45`, while any task with a deadline (even days away) gets urgency scores that push it above 45. A critical importance-10 task with no deadline always loses to a trivial task with any deadline.

**Fix — Normalize the formula so importance matters equally:**

```python
def score(task, now=None):
    now = now or datetime.now(timezone.utc)
    importance = task.importance * 10  # 10–100

    if not task.deadline:
        # No deadline → pure importance, no urgency penalty
        return round(importance * 0.70, 1)  # max 70

    hours_left = max(0.1, (task.deadline - now).total_seconds() / 3600)
    time_ratio = min(1.0, (task.estimated_hours or 1.0) / hours_left)
    urgency = max(0, min(100, 100 - hours_left))
    effort_risk = time_ratio * 100

    return round(
        urgency     * 0.40 +
        importance  * 0.35 +
        effort_risk * 0.25,
        1
    )
```

---

### Issue 6 — `rescue_engine` Marks Dropped Subtasks as `completed` (Wrong Semantics)

**File:** `backend/routes/rescue.py` (lines 57–60)  
**Problem:** Dropped, non-essential subtasks are marked `completed=True`. This contaminates your DNA analytics — your history says you "completed" tasks you actually skipped.

**Fix — Add a `dropped` status field to `Subtask`, or use a separate column:**

```python
# models.py — add a dropped flag
class Subtask(Base):
    ...
    dropped = Column(Boolean, default=False)  # ✅ new field

# routes/rescue.py — use the correct flag
for sub in subtasks:
    if not sub.is_core:
        sub.dropped = True      # ✅ mark as dropped, NOT completed
db.commit()
```

**Also run a DB migration** (or drop and recreate) after adding the column.

---

### Issue 7 — DNA Analyzer `_was_late` Logic is Incorrect

**File:** `backend/services/dna_analyzer.py` (lines 46–50)  
**Problem:** The function doesn't check if a task was completed after its deadline. It checks if `estimated_hours > 80% of time given`. A 3-hour task with a 2-day window is never flagged as late, even if submitted after the deadline.

**Fix — Track actual completion time (requires a `completed_at` timestamp):**

```python
# models.py — add completed_at
class Task(Base):
    ...
    completed_at = Column(DateTime(timezone=True), nullable=True)

# routes/tasks.py — set completed_at when status changes to completed
if value == "completed":
    task.completed_at = datetime.now(timezone.utc)

# dna_analyzer.py — real lateness check
def _was_late(task) -> bool:
    if not task.deadline or not task.completed_at:
        return False
    return task.completed_at > task.deadline  # ✅ actual comparison
```

---

### Issue 8 — `asyncio.get_event_loop()` Deprecated in Python 3.10+

**File:** `backend/services/llm_orchestrator.py` (lines 114, 129)

**Fix — Use `asyncio.to_thread()` (cleaner and modern):**

```python
# Before (deprecated):
loop = asyncio.get_event_loop()
return await loop.run_in_executor(None, blocking_call)

# After (Python 3.9+):
import asyncio
return await asyncio.to_thread(blocking_call)
```

Apply to both `_call_groq` and `_call_gemini` methods.

---

## 🟡 Moderate Issues

---

### Issue 9 — `test_api.py` is Not a Real Test

**File:** `backend/test_api.py`  
**Problem:** This is a one-off script, not pytest tests. `pytest` is in requirements but has zero coverage.

**Fix — Create proper pytest tests:**

```python
# backend/tests/test_priority_engine.py
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
from services.priority_engine import score

def make_task(importance=5, estimated_hours=2.0, deadline_hours=None, status="pending"):
    task = MagicMock()
    task.importance = importance
    task.estimated_hours = estimated_hours
    task.status = status
    task.deadline = (
        datetime.now(timezone.utc) + timedelta(hours=deadline_hours)
        if deadline_hours else None
    )
    return task

def test_score_no_deadline():
    task = make_task(importance=10)
    result = score(task)
    assert 0 <= result <= 100

def test_score_urgent_deadline():
    task = make_task(importance=8, estimated_hours=3, deadline_hours=1)
    result = score(task)
    assert result > 70, "Should be high priority with 1h deadline"

def test_score_distant_deadline():
    task = make_task(importance=5, estimated_hours=1, deadline_hours=200)
    result = score(task)
    assert result < 60, "Should be low priority with 200h deadline"
```

```bash
# Run tests
cd backend
pytest tests/ -v
```

---

### Issue 10 — No Loading State After Delete (Dashboard Flicker)

**File:** `frontend/src/pages/Dashboard.jsx` (line 54)  
**Problem:** Deleting a task re-fetches the whole list. User sees the task for ~300ms after clicking delete.

**Fix — Optimistic UI update (remove locally before API confirms):**

```jsx
const handleDelete = async (taskId) => {
  // Optimistically remove from UI immediately
  setTasks(prev => prev.filter(t => t.id !== taskId));

  try {
    await deleteTask(taskId);
    // Optionally re-fetch to sync
  } catch (err) {
    console.error('Delete failed:', err);
    // Rollback — re-fetch the real state
    fetchData();
  }
};
```

---

### Issue 11 — `DecompositionCache` Is Never Invalidated

**File:** `backend/agents/decomposer_agent.py` (lines 52–55)  
**Problem:** Once cached, a decomposition lives forever. Bad LLM output gets permanently stuck.

**Fix — Add a TTL (time-to-live) check and a cache-bust endpoint:**

```python
# models.py — add TTL awareness (cache entry expires after 7 days)
CACHE_TTL_DAYS = 7

# decomposer_agent.py
from datetime import datetime, timezone, timedelta

cached = db.query(DecompositionCache).filter_by(cache_key=key).first()
if cached:
    age = datetime.now(timezone.utc) - cached.created_at.replace(tzinfo=timezone.utc)
    if age < timedelta(days=CACHE_TTL_DAYS):
        return json.loads(cached.subtasks)
    else:
        db.delete(cached)  # Expired — delete and re-run LLM
        db.commit()
```

**Add a cache-bust route:**

```python
# routes/tasks.py
@router.delete("/{task_id}/decompose/cache")
def bust_decompose_cache(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404)
    key = hashlib.md5(task.task_name.lower().strip().encode()).hexdigest()
    db.query(DecompositionCache).filter_by(cache_key=key).delete()
    db.commit()
    return {"message": "Cache cleared"}
```

---

### Issue 12 — No Input Length Validation on AI Parse

**File:** `backend/routes/tasks.py` (line 58)  
**Problem:** User can paste 10,000 words into the text box, sending a massive prompt to Groq/Gemini — causing slow responses and potential cost abuse.

**Fix — Add `max_length` to the schema:**

```python
# schemas.py
from pydantic import BaseModel, Field

class TaskParseRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=2000)
```

**Also add frontend character counter:**

```jsx
// pages/AddTask.jsx
<textarea
  maxLength={2000}
  value={text}
  onChange={(e) => setText(e.target.value)}
/>
<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
  {text.length}/2000
</div>
```

---

## 🟢 Minor Issues

---

### Issue 13 — Direct DOM Mutation in Timeline (Anti-pattern in React)

**File:** `frontend/src/components/Timeline.jsx` (lines 69–70)

```jsx
// ❌ Bad — bypasses React
onMouseEnter={(e) => e.target.style.opacity = '1'}

// ✅ Fix — use state
const [hoveredIndex, setHoveredIndex] = useState(null);

<div
  onMouseEnter={() => setHoveredIndex(i)}
  onMouseLeave={() => setHoveredIndex(null)}
  style={{ opacity: hoveredIndex === i ? 1 : 0.85 }}
>
```

---

### Issue 14 — No React Error Boundary

**Problem:** Any unhandled JS error in a component causes a blank white screen with no feedback.

**Fix — Add a global error boundary:**

```jsx
// frontend/src/components/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state glass-card" style={{ margin: '2rem' }}>
          <span className="emoji">💥</span>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// frontend/src/main.jsx
import ErrorBoundary from './components/ErrorBoundary';
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
```

---

### Issue 15 — Vite Has No API Proxy (Hardcoded URL)

**File:** `frontend/src/services/api.js` (line 6)  
**Problem:** `http://localhost:8000` is hardcoded. Breaks on any deployment.

**Fix — Use env variable + Vite proxy:**

```js
// frontend/src/services/api.js
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
```

```js
// frontend/vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
});
```

```env
# frontend/.env
VITE_API_BASE=/api
```

---

### Issue 16 — README.md is Empty

**File:** `README.md` (11 bytes — just a title)  
**Fix:** See the template below.

```markdown
# 🚨 LifeSaver

> AI-powered deadline crisis management app built with FastAPI + React.

## Quick Start

### Backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                             # fill in your keys
uvicorn main:app --reload

### Frontend
cd frontend
npm install
npm run dev
```

---

---

## 🗄️ Supabase Migration Guide

Supabase is a hosted PostgreSQL platform. Migrating from SQLite takes **4 steps**.

---

### Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **"New Project"** and fill in the project name, password, and region.
3. Wait ~2 minutes for provisioning.
4. Go to **Project Settings → Database** and copy the **Connection String** (URI format):

```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

> ⚠️ Replace `[YOUR-PASSWORD]` with the password you set during project creation.

---

### Step 2 — Update `.env`

```env
# backend/.env

GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
DEBUG_SECRET_KEY=your_debug_secret_here

# ✅ Replace the old SQLite line with this:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

---

### Step 3 — Update `requirements.txt`

Add `psycopg2-binary` (the PostgreSQL driver for SQLAlchemy):

```txt
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
pydantic==2.10.3
python-dotenv==1.0.1
groq==0.12.0
google-generativeai==0.8.3
pytest==8.3.4
httpx==0.28.0
psycopg2-binary==2.9.10     # ← NEW — PostgreSQL driver
```

Install it:

```bash
pip install psycopg2-binary
```

---

### Step 4 — Update `database.py`

Replace the entire file:

```python
# backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# SQLite needs check_same_thread; PostgreSQL does not — handle both
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_size=5,          # Max persistent connections (PostgreSQL)
    max_overflow=10,      # Extra connections allowed under load
    pool_pre_ping=True,   # Test connection before using from pool
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

---

### Step 5 — Update `models.py` for PostgreSQL Compatibility

PostgreSQL uses `TEXT` by default for `String` — no length needed. But `DateTime` should be timezone-aware:

```python
# backend/models.py

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, default=1)
    name = Column(String, default="Demo User")
    dna_type = Column(String, default="consistent")
    available_hours = Column(Float, default=6.0)
    peak_hours = Column(String, default='["09:00-12:00","14:00-18:00"]')
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    task_name = Column(String, nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=True)        # ✅ timezone=True
    importance = Column(Integer, default=5)
    estimated_hours = Column(Float, default=1.0)
    priority_score = Column(Float, default=0)
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)    # ✅ new field
    user = relationship("User", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="task", cascade="all, delete-orphan")


class Subtask(Base):
    __tablename__ = "subtasks"
    id = Column(Integer, primary_key=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    name = Column(String, nullable=False)
    hours = Column(Float, default=1.0)
    is_core = Column(Boolean, default=True)
    completed = Column(Boolean, default=False)
    dropped = Column(Boolean, default=False)                         # ✅ new field
    order_index = Column(Integer, default=0)
    task = relationship("Task", back_populates="subtasks")


class Schedule(Base):
    __tablename__ = "schedule"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), default=1)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_rescued = Column(Boolean, default=False)
    user = relationship("User", back_populates="schedules")
    task = relationship("Task", back_populates="schedules")


class DecompositionCache(Base):
    __tablename__ = "decomposition_cache"
    id = Column(Integer, primary_key=True)
    cache_key = Column(String, unique=True, nullable=False)
    subtasks = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
```

---

### Step 6 — Run the App and Let SQLAlchemy Auto-Create Tables

```bash
cd backend
uvicorn main:app --reload
```

On startup, `Base.metadata.create_all(bind=engine)` will automatically create all tables in your Supabase PostgreSQL database.

You can verify the tables were created in the **Supabase Dashboard → Table Editor**.

---

### Step 7 — Verify Connection in Supabase Dashboard

1. Go to your Supabase project.
2. Open **Table Editor** — you should see: `users`, `tasks`, `subtasks`, `schedule`, `decomposition_cache`.
3. Click **"Load Demo"** in your app — the rows should appear in Supabase's table editor in real-time.

---

### Troubleshooting Supabase

| Error | Cause | Fix |
|---|---|---|
| `could not connect to server` | Wrong connection string | Double-check the URI in `.env` |
| `SSL connection required` | Supabase requires SSL | Add `?sslmode=require` to the end of your `DATABASE_URL` |
| `password authentication failed` | Wrong password | Reset DB password in Supabase → Settings → Database |
| `psycopg2 not found` | Driver not installed | `pip install psycopg2-binary` |
| Tables not created | `create_all` silently failed | Check terminal for SQLAlchemy errors on startup |

**SSL fix if needed:**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require
```

---

## 📋 Summary — All Issues at a Glance

| # | Severity | Issue | File | Status |
|---|---|---|---|---|
| 1 | 🔴 Critical | Debug API has no auth guard | `routes/debug.py` | Fix with secret key header |
| 2 | 🔴 Critical | `utcnow` vs `now` timezone mismatch | multiple | Fix with `datetime.now(timezone.utc)` |
| 3 | 🔴 Critical | No pinned dependency versions | `requirements.txt` | Pin all versions |
| 4 | 🔴 Critical | `on_event` startup is deprecated | `main.py` | Use `lifespan` context manager |
| 5 | 🟠 Major | Priority formula broken for no-deadline tasks | `priority_engine.py` | Normalize importance weight |
| 6 | 🟠 Major | Dropped subtasks wrongly marked `completed` | `routes/rescue.py` | Add `dropped` boolean field |
| 7 | 🟠 Major | DNA `_was_late` logic incorrect | `dna_analyzer.py` | Add `completed_at` timestamp |
| 8 | 🟠 Major | `asyncio.get_event_loop()` deprecated | `llm_orchestrator.py` | Use `asyncio.to_thread()` |
| 9 | 🟡 Moderate | No real pytest tests | `test_api.py` | Create `tests/` directory |
| 10 | 🟡 Moderate | No optimistic delete on dashboard | `Dashboard.jsx` | Remove locally before API call |
| 11 | 🟡 Moderate | Decomposition cache never invalidated | `decomposer_agent.py` | Add TTL + cache-bust endpoint |
| 12 | 🟡 Moderate | No input length limit on AI parse | `schemas.py` | Add `max_length=2000` |
| 13 | 🟢 Minor | Direct DOM style mutation in Timeline | `Timeline.jsx` | Use React `useState` for hover |
| 14 | 🟢 Minor | No React Error Boundary | `main.jsx` | Add `<ErrorBoundary>` wrapper |
| 15 | 🟢 Minor | Hardcoded `localhost:8000` in frontend | `api.js` | Use env var + Vite proxy |
| 16 | 🟢 Minor | README is empty | `README.md` | Write proper setup instructions |

---

*Generated by pro-level code review — 2026-06-28*
