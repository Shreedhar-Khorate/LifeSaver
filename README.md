# 🚨 LifeSaver

> AI-powered deadline crisis management app built with FastAPI + React.  
> Parses your tasks from natural language, scores them by priority, decomposes them into subtasks, and generates a survival schedule when you're overwhelmed.

---

## ✨ Features

- **AI Task Parser** — Paste a wall of text; Groq/Gemini extracts tasks, deadlines & importance
- **Priority Engine** — 0–100 scores based on urgency, importance & effort risk
- **Smart Decomposer** — Breaks tasks into subtasks with core vs optional labelling
- **Rescue Mode** — Drops non-essential subtasks to maximize success probability
- **Deadline DNA** — Classifies your work personality (Last Minute, Consistent, Deep Focus, Overcommitter)
- **What-If Simulator** — Instantly models "what if I add 2 extra hours?" on your success probability

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Groq](https://console.groq.com) and/or [Google Gemini](https://aistudio.google.com) API key

---

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # fill in your API keys
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

---

## ⚙️ Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key (primary LLM) |
| `GEMINI_API_KEY` | Your Gemini API key (fallback LLM) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase or local) |
| `DEBUG_SECRET_KEY` | Secret key required for `/api/debug/seed` and `/api/debug/reset` |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_BASE` | API base URL (default: `/api` via Vite proxy) |
| `VITE_DEBUG_KEY` | Must match backend `DEBUG_SECRET_KEY` for demo seed/reset buttons |

---

## 🏗️ Architecture

```
LifeSaver/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # DB engine + session factory
│   ├── agents/
│   │   ├── parser_agent.py      # Agent 1: NL text → task list
│   │   ├── decomposer_agent.py  # Agent 2: task → subtasks
│   │   └── advisor_agent.py     # Agent 3: rescue tips
│   ├── services/
│   │   ├── llm_orchestrator.py  # Groq → Gemini → Mock fallback
│   │   ├── priority_engine.py   # Pure-Python priority scoring
│   │   ├── risk_predictor.py    # Risk score calculation
│   │   ├── dna_analyzer.py      # Deadline DNA classification
│   │   └── rescue_engine.py     # Rescue mode algorithm
│   ├── routes/
│   │   ├── tasks.py, scheduler.py, rescue.py, dashboard.py, debug.py
│   └── tests/
│       └── test_priority_engine.py
└── frontend/
    └── src/
        ├── pages/           # Dashboard, AddTask, Schedule, Rescue
        ├── components/      # TaskCard, Timeline, DNABadge, ErrorBoundary…
        └── services/api.js  # Axios API client
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 🗄️ Database

The app uses **PostgreSQL via Supabase** by default. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for migration instructions from SQLite.

Tables are auto-created on startup via `Base.metadata.create_all()`.

---

## 🔐 Security Notes

- The `/api/debug/seed` and `/api/debug/reset` endpoints require the `X-Debug-Key` header.
- **Never commit your `.env` file** — it's in `.gitignore`.
- For production, set `DEBUG_SECRET_KEY` to a long random string and don't expose the debug key in your frontend bundle.

---

*Built with ❤️ by Shreedhar Khorate*