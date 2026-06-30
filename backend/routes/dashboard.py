"""
Dashboard API — Aggregated stats for the main view
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from database import get_db
from models import Task, User
from schemas import DashboardResponse, TaskResponse
from services.risk_predictor import calculate as calc_risk, success as calc_success
from services.dna_analyzer import analyze, DNA_CONFIG
from agents.advisor_agent import get_rescue_tip
from services.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return aggregated dashboard stats for the current user:
    - Task counts
    - Risk score + success probability
    - DNA type + emoji + label
    - Motivational tip from Agent 3
    - Upcoming deadlines
    """
    all_tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    completed = [t for t in all_tasks if t.status == "completed"]
    pending = [t for t in all_tasks if t.status == "pending"]

    # Analyze DNA from completed tasks
    dna_type = analyze(completed)
    if current_user.dna_type != dna_type:
        current_user.dna_type = dna_type
        db.commit()

    dna_info = DNA_CONFIG.get(dna_type, DNA_CONFIG["consistent"])

    # Calculate risk and success
    risk = calc_risk(pending)
    success_prob = calc_success(risk, len(completed), dna_type)

    # Get motivational tip
    tip = ""
    if pending:
        try:
            tip = await get_rescue_tip(
                pending=len(pending),
                hours_left=current_user.available_hours,
                dna=dna_type,
            )
        except Exception:
            tip = "Focus on your highest-priority task first."

    # Upcoming deadlines (next 48 hours)
    now = datetime.now(timezone.utc)
    upcoming = []
    for t in pending:
        if t.deadline:
            deadline = t.deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if deadline <= now + timedelta(hours=48):
                upcoming.append(t)
    upcoming.sort(key=lambda t: t.deadline)

    return DashboardResponse(
        total_tasks=len(all_tasks),
        completed_tasks=len(completed),
        pending_tasks=len(pending),
        risk_score=risk,
        success_probability=success_prob,
        dna_type=dna_type,
        dna_emoji=dna_info["emoji"],
        dna_label=dna_info["label"],
        dna_tip=tip,
        upcoming_deadlines=upcoming[:5],
    )

