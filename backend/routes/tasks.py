"""
Tasks API — CRUD + AI Parse + Decompose
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Task, Subtask
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskParseRequest, ParsedTaskItem,
    SubtaskResponse,
)
from agents.parser_agent import parse_tasks
from agents.decomposer_agent import decompose
from services.priority_engine import score as priority_score

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/", response_model=list[TaskResponse])
def list_tasks(status: str = None, db: Session = Depends(get_db)):
    """List all tasks, optionally filtered by status. Recalculates priority scores."""
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    tasks = query.all()

    # Recalculate priority scores
    now = datetime.now(timezone.utc)
    for task in tasks:
        task.priority_score = priority_score(task, now)
    db.commit()

    # Sort by priority descending
    tasks.sort(key=lambda t: t.priority_score, reverse=True)
    return tasks


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Manually create a single task."""
    task = Task(
        task_name=task_in.task_name,
        deadline=task_in.deadline,
        importance=task_in.importance,
        estimated_hours=task_in.estimated_hours,
    )
    task.priority_score = priority_score(task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.post("/parse", response_model=list[TaskResponse])
async def parse_tasks_endpoint(req: TaskParseRequest, db: Session = Depends(get_db)):
    """Use AI Agent 1 (Parser) to extract tasks from natural language text."""
    parsed = await parse_tasks(req.text)

    created_tasks = []
    for item in parsed:
        deadline = None
        if item.get("deadline"):
            try:
                deadline = datetime.strptime(item["deadline"], "%Y-%m-%d %H:%M")
            except (ValueError, TypeError):
                pass

        task = Task(
            task_name=item.get("name", "Untitled Task"),
            deadline=deadline,
            importance=min(10, max(1, int(item.get("importance", 5)))),
            estimated_hours=float(item.get("estimated_hours", 1.0)),
        )
        task.priority_score = priority_score(task)
        db.add(task)
        db.flush()
        created_tasks.append(task)

    db.commit()
    for task in created_tasks:
        db.refresh(task)

    return created_tasks


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task's fields (status, name, deadline, etc.)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
        if key == "status":
            if value == "completed":
                task.completed_at = datetime.now(timezone.utc)
            else:
                task.completed_at = None

    task.priority_score = priority_score(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and its subtasks."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/decompose", response_model=list[SubtaskResponse])
async def decompose_task(task_id: int, db: Session = Depends(get_db)):
    """
    Use Agent 2 (Decomposer) to break a task into subtasks.
    Uses pattern match → cache → AI fallback.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Clear existing subtasks
    db.query(Subtask).filter(Subtask.task_id == task_id).delete()

    subtask_list = await decompose(task.task_name, db)

    created = []
    for i, item in enumerate(subtask_list):
        subtask = Subtask(
            task_id=task_id,
            name=item.get("name", f"Step {i+1}"),
            hours=float(item.get("hours", 1.0)),
            is_core=bool(item.get("is_core", True)),
            order_index=i,
        )
        db.add(subtask)
        db.flush()
        created.append(subtask)

    db.commit()
    for s in created:
        db.refresh(s)

    return created
