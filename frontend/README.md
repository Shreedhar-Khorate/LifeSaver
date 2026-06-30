# 🚨 LifeSaver Frontend: User Interface & Simulated Crisis Workspace

This directory contains the React + Vite frontend application for **LifeSaver**. It communicates with the FastAPI backend to visualize schedules, parse unstructured text, handle authentication, and run the dynamic What-If simulation slider.

---

## 🎨 Tech Stack & Libraries
* **Framework**: React (v18)
* **Build Tool**: Vite
* **Routing**: React Router DOM (v6)
* **HTTP Client**: Axios (configured with intercepts in `src/services/api.js`)
* **Styling**: Vanilla CSS (sleek dark mode, animations, custom scrollbars)
* **Icons**: React Icons (`react-icons/fa`, `react-icons/gi`)

---

## 📁 Key Directories & Components

```
frontend/src/
├── components/
│   ├── DNABadge.jsx        # Displays Deadline DNA (Consistent, Last Minute, Overcommitter, Deep Focus)
│   ├── ErrorBoundary.jsx   # Error boundary fallbacks for UI safety
│   ├── TaskCard.jsx        # Individual task view with status toggles
│   ├── Timeline.jsx        # Hourly visualization of current schedule slots
│   └── WhatIfSlider.jsx    # React slider component triggering real-time mathematical simulation
├── pages/
│   ├── AddTask.jsx         # Input form for single tasks + Natural Language Parser wall of text
│   ├── Dashboard.jsx       # Overview of task count, DNA classification, risk percentages, and tips
│   ├── Login.jsx           # Account login page
│   ├── Profile.jsx         # Productive peak hours setting and hourly availability setting
│   ├── Rescue.jsx          # Interactive crisis workbench (drops optional items and simulates adjustments)
│   ├── Signup.jsx          # Register user endpoint
│   └── TimelinePage.jsx    # Complete schedule generator dashboard
└── services/
    └── api.js              # Centralized backend HTTP request setup (handles JWT-less authorization headers)
```

---

## 🚀 Running the Frontend locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in this directory:
   ```env
   VITE_API_BASE=/api
   VITE_DEBUG_KEY=demo-secret-key-123  # Must match backend DEBUG_SECRET_KEY to seed crisis state
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at [http://localhost:5173](http://localhost:5173).

---

## 🔗 Main Project Guidelines
For setup instructions, database migrations, backend details, and the overall system design, please see the [Root README.md](../README.md).
