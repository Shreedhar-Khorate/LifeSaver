"""
Debug API — Seed demo data and reset state
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from database import get_db
from models import Task, Subtask, Schedule, User
from services.priority_engine import score as priority_score

router = APIRouter(prefix="/api/debug", tags=["Debug"])


@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    """
    Loads the "7 PM Crisis" state for demo:
    - 5 tasks, 3 overdue / near-deadline
    - Pre-decomposed subtasks
    - Creates a dramatic rescue scenario
    """
    # Clear existing data
    db.query(Subtask).delete()
    db.query(Schedule).delete()
    db.query(Task).delete()
    db.commit()

    now = datetime.now(timezone.utc)

    # Demo tasks — the "7 PM Crisis"
    tasks_data = [
        {
            "task_name": "Hackathon PPT Presentation",
            "deadline": now + timedelta(hours=3),       # 3 hours from now!
            "importance": 10,
            "estimated_hours": 3.5,
            "subtasks": [
                {"name": "Create outline",  "hours": 0.5, "is_core": True},
                {"name": "Build slides",    "hours": 1.5, "is_core": True},
                {"name": "Add animations",  "hours": 0.5, "is_core": False},
                {"name": "Add visuals",     "hours": 1.0, "is_core": False},
                {"name": "Rehearse",        "hours": 0.5, "is_core": True},
            ],
        },
        {
            "task_name": "AI Assignment Submission",
            "deadline": now + timedelta(hours=8),       # Tonight
            "importance": 9,
            "estimated_hours": 4.0,
            "subtasks": [
                {"name": "Research papers",    "hours": 1.0, "is_core": True},
                {"name": "Write code",         "hours": 2.0, "is_core": True},
                {"name": "Write report",       "hours": 1.0, "is_core": True},
                {"name": "Add citations",      "hours": 0.5, "is_core": False},
                {"name": "Format document",    "hours": 0.5, "is_core": False},
            ],
        },
        {
            "task_name": "Data Structures Lab Report",
            "deadline": now + timedelta(hours=5),       # Due tonight
            "importance": 7,
            "estimated_hours": 2.0,
            "subtasks": [
                {"name": "Write observations",  "hours": 0.5, "is_core": True},
                {"name": "Code examples",       "hours": 1.0, "is_core": True},
                {"name": "Conclusion",          "hours": 0.25, "is_core": True},
                {"name": "Format & polish",     "hours": 0.25, "is_core": False},
            ],
        },
        {
            "task_name": "Interview Prep - Google",
            "deadline": now + timedelta(hours=36),      # Tomorrow morning
            "importance": 8,
            "estimated_hours": 2.5,
            "subtasks": [
                {"name": "Research company",    "hours": 0.5, "is_core": True},
                {"name": "Practice DSA",        "hours": 1.0, "is_core": True},
                {"name": "Practice answers",    "hours": 0.5, "is_core": True},
                {"name": "Prepare questions",   "hours": 0.25, "is_core": False},
                {"name": "Review past interviews", "hours": 0.25, "is_core": False},
            ],
        },
        {
            "task_name": "Gym Workout",
            "deadline": None,                           # No deadline
            "importance": 4,
            "estimated_hours": 1.0,
            "subtasks": [
                {"name": "Warmup",    "hours": 0.25, "is_core": True},
                {"name": "Workout",   "hours": 0.5,  "is_core": True},
                {"name": "Cooldown",  "hours": 0.25, "is_core": False},
            ],
        },
    ]

    created_tasks = []
    for data in tasks_data:
        task = Task(
            task_name=data["task_name"],
            deadline=data["deadline"],
            importance=data["importance"],
            estimated_hours=data["estimated_hours"],
        )
        task.priority_score = priority_score(task)
        db.add(task)
        db.flush()

        for i, sub_data in enumerate(data.get("subtasks", [])):
            subtask = Subtask(
                task_id=task.id,
                name=sub_data["name"],
                hours=sub_data["hours"],
                is_core=sub_data["is_core"],
                order_index=i,
            )
            db.add(subtask)

        created_tasks.append(task)

    # Update user DNA to "last_minute" for dramatic demo
    user = db.query(User).filter(User.id == 1).first()
    if user:
        user.dna_type = "last_minute"
        user.available_hours = 6.0

    db.commit()

    return {
        "message": "🚨 7 PM Crisis loaded!",
        "tasks_created": len(created_tasks),
        "total_hours_needed": sum(d["estimated_hours"] for d in tasks_data),
        "hours_available": 6.0,
        "scenario": "5 tasks, 3 due tonight, 13 total hours needed, only 6 available",
    }


@router.post("/reset")
def reset_data(db: Session = Depends(get_db)):
    """Clear all data and reseed with just the demo user."""
    db.query(Subtask).delete()
    db.query(Schedule).delete()
    db.query(Task).delete()
    db.commit()

    user = db.query(User).filter(User.id == 1).first()
    if user:
        user.dna_type = "consistent"
        user.available_hours = 6.0
        db.commit()

    return {"message": "All data cleared. Ready for fresh start."}
