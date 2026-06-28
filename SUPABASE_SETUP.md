# 🗄️ LifeSaver — Supabase Setup Guide

> Complete step-by-step guide to create your PostgreSQL database on Supabase  
> and connect it to the LifeSaver backend. No prior database experience needed.

---

## Prerequisites

- A free Supabase account (sign up at https://supabase.com)
- Python + pip installed
- Your LifeSaver backend project open

---

## PART 1 — Create the Supabase Project

---

### Step 1 — Sign Up / Log In

1. Open your browser and go to → **https://supabase.com**
2. Click **"Start your project"**
3. Sign in with **GitHub** (recommended) or Email

---

### Step 2 — Create a New Project

1. After login, you land on the **Dashboard**
2. Click the green **"New project"** button
3. Fill in the form:

   | Field | What to Enter |
   |---|---|
   | **Name** | `lifesaver` |
   | **Database Password** | Create a strong password — **SAVE IT SOMEWHERE SAFE** |
   | **Region** | Pick the closest to you (e.g., `South Asia (Mumbai)` for India) |
   | **Plan** | `Free` is enough |

4. Click **"Create new project"**
5. ⏳ Wait **1–2 minutes** while Supabase provisions your database

---

### Step 3 — Get Your Database Connection String

1. In your project, click **"Project Settings"** (gear icon ⚙️ in the left sidebar)
2. Click **"Database"** in the settings menu
3. Scroll down to **"Connection string"**
4. Click the **"URI"** tab
5. Copy the full string — it looks like this:

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

6. **Replace `[YOUR-PASSWORD]`** with the password you set in Step 2

> 💡 Also copy the **Project Reference ID** shown at the top of Settings — it's the `xxxxxxxxxxxx` part in the URL above.

---

## PART 2 — Create the Tables

You have **two options**. Choose ONE:

- **Option A** — Let SQLAlchemy auto-create tables (easiest ✅)
- **Option B** — Run SQL manually in Supabase (gives full control)

---

### Option A — Auto-Create via SQLAlchemy (Recommended)

Just update your backend connection string and run the server — SQLAlchemy will automatically create all tables on startup.

Skip to **PART 3** and come back here to verify.

---

### Option B — Create Tables Manually via SQL Editor

1. In your Supabase project, click **"SQL Editor"** in the left sidebar (icon looks like `</>`)
2. Click **"New query"**
3. Paste the entire SQL below and click **"Run"** (or press `Ctrl+Enter`)

```sql
-- ============================================================
-- LifeSaver Database Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. USERS table
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY DEFAULT 1,
    name            TEXT    NOT NULL DEFAULT 'Demo User',
    dna_type        TEXT    NOT NULL DEFAULT 'consistent',
    available_hours FLOAT   NOT NULL DEFAULT 6.0,
    peak_hours      TEXT    NOT NULL DEFAULT '["09:00-12:00","14:00-18:00"]'
);

-- Insert the default demo user
INSERT INTO users (id, name, dna_type, available_hours)
VALUES (1, 'Demo User', 'consistent', 6.0)
ON CONFLICT (id) DO NOTHING;


-- 2. TASKS table
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE DEFAULT 1,
    task_name       TEXT    NOT NULL,
    deadline        TIMESTAMPTZ,
    importance      INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
    estimated_hours FLOAT   NOT NULL DEFAULT 1.0,
    priority_score  FLOAT   NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'dropped')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);


-- 3. SUBTASKS table
CREATE TABLE IF NOT EXISTS subtasks (
    id          SERIAL PRIMARY KEY,
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    hours       FLOAT   NOT NULL DEFAULT 1.0,
    is_core     BOOLEAN NOT NULL DEFAULT TRUE,
    completed   BOOLEAN NOT NULL DEFAULT FALSE,
    dropped     BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0
);


-- 4. SCHEDULE table
CREATE TABLE IF NOT EXISTS schedule (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE DEFAULT 1,
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_time  TIMESTAMPTZ NOT NULL,
    end_time    TIMESTAMPTZ NOT NULL,
    is_rescued  BOOLEAN NOT NULL DEFAULT FALSE
);


-- 5. DECOMPOSITION CACHE table
CREATE TABLE IF NOT EXISTS decomposition_cache (
    id          SERIAL PRIMARY KEY,
    cache_key   TEXT    NOT NULL UNIQUE,
    subtasks    TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id   ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline  ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_subtasks_task   ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_schedule_task   ON schedule(task_id);
CREATE INDEX IF NOT EXISTS idx_cache_key       ON decomposition_cache(cache_key);
```

4. You should see **"Success. No rows returned"** — that means all tables were created ✅
5. Click **"Table Editor"** in the left sidebar to verify all 5 tables exist

---

## PART 3 — Connect Your Backend to Supabase

---

### Step 4 — Install the PostgreSQL Driver

Open a terminal in your `backend` folder and run:

```bash
# Activate your virtual environment first
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux

# Install PostgreSQL driver
pip install psycopg2-binary
```

---

### Step 5 — Update `requirements.txt`

Open `backend/requirements.txt` and add the line:

```txt
fastapi
uvicorn[standard]
sqlalchemy
pydantic
python-dotenv
groq
google-generativeai
pytest
psycopg2-binary        ← ADD THIS LINE
```

---

### Step 6 — Update `backend/.env`

Open `backend/.env` and replace the `DATABASE_URL` line:

```env
# backend/.env

GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here

# ❌ Remove this line:
# DATABASE_URL=sqlite:///./app.db

# ✅ Add this line (paste your actual Supabase URI):
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

> ⚠️ If you get SSL errors, add `?sslmode=require` at the end:
> ```
> DATABASE_URL=postgresql://postgres:...supabase.co:5432/postgres?sslmode=require
> ```

---

### Step 7 — Update `backend/database.py`

Replace the entire file content with this:

```python
# backend/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set in .env\n"
        "Add: DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
    )

# SQLite needs check_same_thread; PostgreSQL does not
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_size=5,           # Keep 5 persistent connections open
    max_overflow=10,       # Allow 10 extra connections under heavy load
    pool_pre_ping=True,    # Test connection health before using from pool
    pool_recycle=300,      # Recycle connections every 5 minutes
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

### Step 8 — Test the Connection

Start your backend server:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Look for this in the terminal output — it means the connection worked:

```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.     ✅ All good
```

If you see a red error like `could not connect to server`, check the troubleshooting table at the bottom.

---

### Step 9 — Verify Tables in Supabase Dashboard

1. Go to your Supabase project
2. Click **"Table Editor"** in the left sidebar
3. You should see all 5 tables:
   - `users`
   - `tasks`
   - `subtasks`
   - `schedule`
   - `decomposition_cache`
4. The `users` table should already have **1 row** (Demo User, added on startup)

---

### Step 10 — Test with Live Data

1. Open your frontend at **http://localhost:5173**
2. Click the **"Load Crisis Demo"** button in the top-right navbar
3. Go back to **Supabase → Table Editor → tasks**
4. Click **"Refresh"** — you should see **5 new rows** appear in real-time! ✅

---

## PART 4 — Viewing Your Data in Supabase

---

### How to View Tables

1. **Table Editor** → Click any table → See all rows with filters
2. **SQL Editor** → Run custom queries like:

```sql
-- See all pending tasks ordered by priority
SELECT task_name, deadline, importance, priority_score, status
FROM tasks
WHERE status = 'pending'
ORDER BY priority_score DESC;

-- See a task with all its subtasks
SELECT t.task_name, s.name, s.hours, s.is_core
FROM tasks t
JOIN subtasks s ON s.task_id = t.id
ORDER BY t.task_name, s.order_index;

-- Check decomposition cache
SELECT cache_key, created_at FROM decomposition_cache;

-- Delete all data (same as Reset button)
DELETE FROM subtasks;
DELETE FROM schedule;
DELETE FROM tasks;
UPDATE users SET dna_type = 'consistent' WHERE id = 1;
```

---

### How to Reset the Database

**Option 1** — Use the app's Reset button (recommended)

**Option 2** — Run this SQL in Supabase SQL Editor:

```sql
TRUNCATE TABLE subtasks, schedule, tasks, decomposition_cache RESTART IDENTITY CASCADE;
UPDATE users SET dna_type = 'consistent', available_hours = 6.0 WHERE id = 1;
```

---

## Troubleshooting

| Error Message | Cause | Fix |
|---|---|---|
| `could not connect to server` | Wrong URL or project paused | Check URI in `.env`, wake up project in Supabase dashboard |
| `SSL connection required` | Supabase enforces SSL | Append `?sslmode=require` to `DATABASE_URL` |
| `password authentication failed` | Wrong password | Go to Supabase → Settings → Database → Reset password |
| `ModuleNotFoundError: psycopg2` | Driver not installed | Run `pip install psycopg2-binary` |
| `relation "users" does not exist` | Tables not created yet | Run the SQL from Option B, or restart the server (auto-create) |
| `Free project paused` | Supabase pauses free projects after 1 week inactive | Go to dashboard and click "Restore project" |
| `RuntimeError: DATABASE_URL is not set` | `.env` file missing the variable | Add `DATABASE_URL=...` to `backend/.env` |

---

## Quick Reference

```
Supabase Dashboard:   https://supabase.com/dashboard
Table Editor:         Your Project → Table Editor (left sidebar)
SQL Editor:           Your Project → SQL Editor (left sidebar)
Connection String:    Your Project → Settings → Database → URI tab
API Keys:             Your Project → Settings → API
```

---

## What's Different from SQLite

| Feature | SQLite (before) | Supabase / PostgreSQL (after) |
|---|---|---|
| Location | Local file `app.db` | Cloud-hosted server |
| Data persists after restart | ✅ | ✅ |
| Accessible from anywhere | ❌ | ✅ |
| Real-time dashboard | ❌ | ✅ |
| Production-ready | ❌ | ✅ |
| Free tier | ✅ | ✅ (500MB, 1 project) |
| Connection pooling | Not needed | Configured in `database.py` |

---

*Last updated: 2026-06-28*
