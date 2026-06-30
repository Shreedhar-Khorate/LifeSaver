# 🚨 LifeSaver: Multi-Agent Deadline Crisis Management

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20%26%20Gemini-orange?style=for-the-badge&logo=google-gemini&logoColor=white)](https://groq.com)

> An intelligent, multi-agent LLM task orchestration and productivity platform designed to save students and developers from impending deadline crises. It parses natural language plans, ranks items dynamically, decomposes goals into subtasks, and simplifies schedules when time is running out.

---

## 🌟 Core Pillars & Key Features

### 🤖 Multi-Agent LLM Orchestration
The app features three specialized AI agents managed by a robust orchestrator backend:
1. **Agent 1: Task Parser** — Analyzes natural language notes or a wall of unstructured text, extracting tasks, calculating estimated hours, and determining importance values (1–10).
2. **Agent 2: Smart Decomposer** — Breaks down high-level tasks into structured subtask steps. It classifies steps into **Core** (critical) and **Optional** (polish, docs) categories. Includes caching to avoid redundant LLM calls.
3. **Agent 3: Advisor Agent** — Provides personalized, motivational, and context-aware tactical tips based on the user's workload density and Deadline DNA.

### ⚙️ Algorithmic Engines
* **Priority Engine (Dynamic Scoring)** — Evaluates each task on a `0–100` scale based on urgency (deadline time left), user-defined importance, and effort risk (estimated hours relative to time remaining).
* **Scheduler Engine (Time-Packing)** — Organizes tasks into a daily timeline based on priority scores and available work hours using a greedy interval packing algorithm.
* **Rescue Engine (Crisis Mode)** — Activated when available hours are less than the total hours needed. It drops non-core subtasks (e.g., polishing, formatting) to shrink task sizes, dynamically improving the calculated success probability.
* **Deadline DNA Analyzer** — Monitors historical task performance to classify user personalities into four distinct profiles:
  * **Consistent Worker (🔥)**: High completion rates, rarely late.
  * **Last Minute Worker (⚡)**: Completes tasks very close to or slightly after deadlines.
  * **Deep Focus Worker (🎯)**: High average task estimation hours, steady pace.
  * **Overcommitter (🌀)**: Takes on too many tasks simultaneously, leading to high risk.

### 🔒 User Authentication
Includes signup, login, and profile management out-of-the-box. Security is implemented using standard-library PBKDF2 password hashing and signature-based state validation.

### 📊 What-If Simulation
An interactive slider on the UI allows users to instantly model how adding extra work hours or adjusting available hours shifts their overall success probability, driven by pure math calculations.

---

## 🏗️ Project Architecture

```
LifeSaver/
├── backend/
│   ├── main.py                 # FastAPI application & startup lifecycle
│   ├── models.py               # SQLAlchemy ORM schemas (User, Task, Subtask, etc.)
│   ├── database.py             # Database engine setup & auto-migration support
│   ├── schemas.py              # Pydantic validation request/response models
│   ├── requirements.txt        # Backend python packages list
│   ├── test_api.py             # Sandbox integration test script
│   ├── agents/
│   │   ├── parser_agent.py     # Natural language task extraction
│   │   ├── decomposer_agent.py # Subtask decomposition & caching layer
│   │   └── advisor_agent.py    # Situational crisis coaching
│   ├── services/
│   │   ├── llm_orchestrator.py # Groq (Llama-3) & Gemini API fallback pipeline
│   │   ├── priority_engine.py  # Algorithmic ranking & scoring logic
│   │   ├── scheduler_engine.py # Timeline interval generator
│   │   ├── rescue_engine.py    # Subtask dropping & recovery calculations
│   │   ├── risk_predictor.py   # Aggregate risk and success math models
│   │   └── dna_analyzer.py     # Classification of work habits
│   ├── routes/
│   │   ├── auth.py             # Registration, login, and user profile management
│   │   ├── tasks.py            # Task/Subtask CRUD, parse, and decompose endpoints
│   │   ├── scheduler.py        # Schedule generation and retrieval
│   │   ├── rescue.py           # Rescue mode execution & simulation
│   │   ├── dashboard.py        # Stats, DNA highlights, and upcoming warnings
│   │   └── debug.py            # Demo seeding ("7 PM Crisis") & database reset
│   └── tests/                  # Pytest unit tests suite
└── frontend/
    ├── src/
    │   ├── pages/              # Main routing views (Dashboard, Rescue, Timeline)
    │   ├── components/         # Reusable widgets (DNABadge, TimelineSlider, TaskCard)
    │   └── services/           # Axios-based API client wrappers
    └── README.md               # Frontend developer setup details
```

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)
* **Supabase** account (or any PostgreSQL instance)
* **API Keys** for [Groq Console](https://console.groq.com/) and/or [Google AI Studio](https://aistudio.google.com/)

---

### Backend Setup

1. **Navigate & Setup Environment**:
   ```bash
   cd backend
   python -m venv .venv
   ```

2. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
   * **Windows (CMD)**: `.venv\Scripts\activate.bat`
   * **macOS/Linux**: `source .venv/bin/activate`

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` and configure:
   ```env
   GROQ_API_KEY=your_groq_api_key
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   DEBUG_SECRET_KEY=demo-secret-key-123
   ```
   > [!NOTE]
   > For SQLite fallback, you can set `DATABASE_URL=sqlite:///./app.db`. On startup, SQLAlchemy will automatically run lightweight migrations to keep schema columns in sync.

5. **Start the API Server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Interactive Swagger documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Frontend Setup

1. **Navigate & Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` in the `frontend` folder:
   ```env
   VITE_API_BASE=/api
   VITE_DEBUG_KEY=demo-secret-key-123
   ```

3. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🧪 Testing

We use `pytest` for business logic and algorithm validation. Run tests from the `backend` folder:

```bash
cd backend
pytest tests/ -v
```

---

## ⚙️ Environment Variables Summary

### Backend Settings (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Optional | Primary model API Key (`llama-3.1-8b-instant`) |
| `GEMINI_API_KEY` | Optional | Fallback model API Key (`gemini-1.5-flash`) |
| `DATABASE_URL` | **Yes** | Connection string for Postgres / SQLite |
| `DEBUG_SECRET_KEY`| **Yes** | Secures debug seed and database reset endpoints |

### Frontend Settings (`frontend/.env`)

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE` | `/api` | Base endpoint path (proxied via Vite server) |
| `VITE_DEBUG_KEY`| *None* | Must match backend `DEBUG_SECRET_KEY` for demo control |

---

## 🗄️ Database Setup
The app auto-migrates columns for custom users, authentication, and caching on startup. For detail instructions on setting up Supabase, refer to [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

---

*Built with ❤️ by Shreedhar Khorate*