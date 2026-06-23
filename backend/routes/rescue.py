"""
Rescue API — Rescue mode + What-If simulation
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Task, Subtask, User
from schemas import RescueRequest, RescueResponse
from services.rescue_engine import rescue, simulate
from services.risk_predictor import calculate as calc_risk, success as calc_success
from agents.advisor_agent import get_rescue_tip

router = APIRouter(prefix="/api/rescue", tags=["Rescue"])


@router.post("/", response_model=RescueResponse)
async def run_rescue(req: RescueRequest, db: Session = Depends(get_db)):
    """
    Activate Rescue Mode:
    1. Gather all pending tasks and their subtasks
    2. Drop non-core subtasks
    3. Calculate before/after success probability
    4. Get a motivational tip from Agent 3
    """
    user = db.query(User).filter(User.id == 1).first()
    dna = user.dna_type if user else "consistent"

    pending = db.query(Task).filter(Task.status == "pending").all()
    completed_count = db.query(Task).filter(Task.status == "completed").count()

    # Get all subtasks for pending tasks
    task_ids = [t.id for t in pending]
    subtasks = db.query(Subtask).filter(Subtask.task_id.in_(task_ids)).all() if task_ids else []

    # If no subtasks exist, we can't rescue — return baseline
    if not subtasks:
        risk = calc_risk(pending)
        before = calc_success(risk, completed_count, dna)
        return RescueResponse(
            dropped=[],
            focus=[t.task_name for t in pending],
            core_hours=sum(t.estimated_hours or 1.0 for t in pending),
            before_success=before,
            after_success=before,
            tip="Decompose your tasks first to enable Rescue Mode!",
        )

    # Calculate before rescue
    risk = calc_risk(pending)
    before = calc_success(risk, completed_count, dna)

    # Run rescue engine
    result = rescue(pending, subtasks, req.hours_remaining, dna)

    # Mark dropped subtasks in DB
    for sub in subtasks:
        if not sub.is_core:
            sub.completed = True  # Mark as "handled" (dropped)
    db.commit()

    # Get AI tip
    tip = await get_rescue_tip(
        pending=len(pending),
        hours_left=req.hours_remaining,
        dna=dna,
    )

    return RescueResponse(
        dropped=result["dropped"],
        focus=result["focus"],
        core_hours=result["core_hours"],
        before_success=before,
        after_success=result["after_success"],
        tip=tip,
    )


@router.get("/simulate")
def simulate_rescue(
    extra_hours: float = Query(0, ge=0, le=24),
    db: Session = Depends(get_db),
):
    """
    What-If slider endpoint — pure math, no AI, instant response.
    Returns the simulated success probability if user adds extra_hours.
    """
    user = db.query(User).filter(User.id == 1).first()
    dna = user.dna_type if user else "consistent"

    pending = db.query(Task).filter(Task.status == "pending").all()
    task_ids = [t.id for t in pending]
    subtasks = db.query(Subtask).filter(Subtask.task_id.in_(task_ids)).all() if task_ids else []

    core_hours = sum(s.hours for s in subtasks if s.is_core)
    if core_hours == 0:
        core_hours = sum(t.estimated_hours or 1.0 for t in pending)

    success_prob = simulate(core_hours, extra_hours, dna)

    return {
        "extra_hours": extra_hours,
        "core_hours": round(core_hours, 2),
        "success_probability": success_prob,
    }
