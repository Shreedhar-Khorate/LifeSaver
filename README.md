# 🚨 LifeSaver: Multi-Agent Deadline Crisis Management

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20%26%20Gemini-orange?style=for-the-badge&logo=google-gemini&logoColor=white)](https://groq.com)

> An intelligent, multi-agent LLM task orchestration and productivity platform designed to save students and developers from impending deadline crises. It parses natural language plans, ranks items dynamically, decomposes goals into subtasks, and simplifies schedules when time is running out.

> [!TIP]
> **🚀 Production Deployments**  
> * **Frontend Client**: [https://life-saver-tau.vercel.app/](https://life-saver-tau.vercel.app/)  
> * **FastAPI Backend API**: [https://lifesaver-backend-8vkw.onrender.com/](https://lifesaver-backend-8vkw.onrender.com/)  



---

## 🛠️ Comprehensive Tech Stack

LifeSaver is built with a modern, high-performance tech stack designed for speed, reliability, and beautiful aesthetics.

* **Frontend**: **React 18** with **Vite** for lightning-fast HMR and building. The UI leverages vanilla CSS for a sleek, dark-mode glassmorphism design. Deployed on **Vercel** for edge performance.
* **Backend**: **FastAPI** (Python) for asynchronous, high-speed API endpoints and automatic Swagger documentation. Deployed on **Render**.
* **Database**: **Supabase** (PostgreSQL) acting as the single source of truth, interacted with via **SQLAlchemy** ORM.
* **AI Orchestration**: Multi-LLM setup utilizing **Groq** (Llama-3-8b-instant) for blazing-fast inference, with **Google Gemini** (1.5-flash) as a resilient fallback.
* **Authentication**: Custom JWT-less secure token passing with **PBKDF2** hashed passwords.

---

## 🗺️ User Flow: How LifeSaver Works

1. **Input Chaos**: The user dumps a chaotic, unstructured wall of text (e.g., "I have a presentation due in 3 hours, a math assignment tomorrow, and I need to hit the gym").
2. **AI Parsing (Agent 1)**: The Natural Language Parser extracts individual tasks, deduces deadlines, assigns relative importance, and estimates completion hours.
3. **Task Decomposition (Agent 2)**: For complex tasks, the Decomposer breaks them down into subtasks, actively labeling them as **Core** (must-do) or **Optional** (nice-to-have, like polish or animations).
4. **Algorithmic Prioritization**: The Priority Engine mathematically scores every task (`0-100`) based on urgency, importance, and effort risk.
5. **Crisis Detection (Rescue Mode)**: If the required hours exceed the user's available time, Rescue Mode activates. It ruthlessly trims "Optional" subtasks, compressing the workload to guarantee the highest success probability for core deliverables.
6. **Motivational Advice (Agent 3)**: A specialized Advisor Agent observes the user's workload density and historical "Deadline DNA" (e.g., *Last Minute Worker*, *Deep Focus*) to deliver a targeted, 15-word tactical tip.
7. **Schedule Generation**: The Scheduler Engine outputs a realistic, packed timeline slotting tasks precisely into the user's remaining hours.

---

## 🌟 Core Features & Engines

### 🤖 Multi-Agent LLM Orchestration
* **Agent 1: Task Parser** — Extracts structured JSON data from natural language.
* **Agent 2: Smart Decomposer** — Splits tasks and caches results to optimize token usage.
* **Agent 3: Advisor Agent** — Delivers contextual coaching.

### ⚙️ Algorithmic Engines
* **Priority Engine** — Real-time dynamic scoring matrix.
* **Scheduler Engine** — Greedy interval timeline packing.
* **Rescue Engine** — Workload compression algorithm.
* **Deadline DNA Analyzer** — Behavioral pattern classification (*Consistent*, *Last Minute*, *Deep Focus*, *Overcommitter*).

### 📊 What-If Simulator
An interactive math-driven slider allowing users to see in real-time how adding an extra hour of work or removing a task impacts their overall success probability.

---

## 🏗️ Project Architecture

```
LifeSaver/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── models.py               # SQLAlchemy ORM schemas
│   ├── database.py             # DB engine & Supabase connection
│   ├── schemas.py              # Pydantic validation models
│   ├── agents/                 # Parsers, Decomposers, Advisors
│   ├── services/               # Engines (Priority, Rescue, Schedule)
│   ├── routes/                 # API Endpoints
│   └── tests/                  # Pytest suite
└── frontend/
    ├── src/
    │   ├── pages/              # React Views (Dashboard, AddTask, Rescue)
    │   ├── components/         # Reusable widgets (DNABadge, Timeline)
    │   └── services/           # Axios API Client
    └── vercel.json             # Vercel deployment routing config
```

---

## 🚀 Getting Started Locally

### 1. Database Setup
Ensure you have a PostgreSQL database (like Supabase) running. Refer to the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt
```
Create a `backend/.env` file:
```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://...
DEBUG_SECRET_KEY=demo-secret-key-123
```
Start the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `frontend/.env` file:
```env
VITE_API_BASE=http://localhost:8000/api
VITE_DEBUG_KEY=demo-secret-key-123
```
Start the client:
```bash
npm run dev
```

---

*Built with ❤️ by Shreedhar Khorate*