"""
Scheduler API — Generate and view today's schedule
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Task, Schedule, User
from schemas import ScheduleGenerateRequest, ScheduleSlotResponse
from services.priority_engine import rank
from services.scheduler_engine import build
from services.auth import get_current_user

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])


@router.get("/today", response_model=list[ScheduleSlotResponse])
def get_today_schedule(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Return today's saved schedule slots for current user."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    slots = (
        db.query(Schedule)
        .filter(
            Schedule.user_id == current_user.id,
            Schedule.start_time >= today_start, 
            Schedule.start_time <= today_end
        )
        .order_by(Schedule.start_time)
        .all()
    )

    result = []
    for slot in slots:
        task = db.query(Task).filter(Task.id == slot.task_id, Task.user_id == current_user.id).first()
        hours = (slot.end_time - slot.start_time).total_seconds() / 3600
        result.append(ScheduleSlotResponse(
            id=slot.id,
            task_id=slot.task_id,
            task_name=task.task_name if task else "Unknown",
            start_time=slot.start_time,
            end_time=slot.end_time,
            hours=round(hours, 2),
            is_rescued=slot.is_rescued,
        ))

    return result


@router.post("/generate", response_model=list[ScheduleSlotResponse])
def generate_schedule(
    req: ScheduleGenerateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Generate a schedule from pending tasks for current user:
    1. Rank tasks by priority
    2. Pack into available hours
    3. Save to DB
    """
    # Get pending tasks for current user and rank them
    pending = db.query(Task).filter(Task.status == "pending", Task.user_id == current_user.id).all()
    ranked = rank(pending)

    # Build schedule slots
    slots = build(ranked, req.available_hours)

    # Clear old schedule for today for current user
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.start_time >= today_start,
        Schedule.start_time <= today_end
    ).delete()

    # Save new schedule
    result = []
    for slot in slots:
        sched = Schedule(
            user_id=current_user.id,
            task_id=slot["task_id"],
            start_time=slot["start_time"],
            end_time=slot["end_time"],
        )
        db.add(sched)
        db.flush()

        result.append(ScheduleSlotResponse(
            id=sched.id,
            task_id=slot["task_id"],
            task_name=slot["task_name"],
            start_time=slot["start_time"],
            end_time=slot["end_time"],
            hours=slot["hours"],
            is_rescued=False,
        ))

    # Update user's available hours
    current_user.available_hours = req.available_hours
    db.commit()
    return result

