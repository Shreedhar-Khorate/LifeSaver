"""
Tasks API — CRUD + AI Parse + Decompose
"""
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Task, Subtask, User, DecompositionCache
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskParseRequest, ParsedTaskItem,
    SubtaskResponse,
)
from agents.parser_agent import parse_tasks
from agents.decomposer_agent import decompose
from services.priority_engine import score as priority_score
from services.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    status: str = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """List all tasks for the logged in user, optionally filtered by status. Recalculates priority scores."""
    query = db.query(Task).filter(Task.user_id == current_user.id)
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
def create_task(
    task_in: TaskCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Manually create a single task for the current user."""
    task = Task(
        user_id=current_user.id,
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
async def parse_tasks_endpoint(
    req: TaskParseRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Use AI Agent 1 (Parser) to extract tasks from natural language text for current user."""
    parsed = await parse_tasks(req.text)

    created_tasks = []
    for item in parsed:
        deadline = None
        if item.get("deadline"):
            for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
                try:
                    deadline = datetime.strptime(item["deadline"].strip(), fmt).replace(tzinfo=timezone.utc)
                    break
                except (ValueError, TypeError):
                    pass

        task = Task(
            user_id=current_user.id,
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
def update_task(
    task_id: int, 
    task_in: TaskUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update a task's fields (status, name, deadline, etc.) for the current user."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
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
def delete_task(
    task_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete a task and its subtasks for the current user."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/decompose", response_model=TaskResponse)
async def decompose_task(
    task_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Use Agent 2 (Decomposer) to break a task into subtasks for the current user.
    Uses pattern match → cache → AI fallback.
    """
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Clear existing subtasks
    db.query(Subtask).filter(Subtask.task_id == task_id).delete()

    subtask_list, tip = await decompose(task.task_name, db)
    task.completion_tip = tip

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
    db.refresh(task)

    return task


@router.delete("/{task_id}/decompose/cache")
def bust_decompose_cache(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bust/clear the decomposition cache for a specific task."""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    key = hashlib.md5(task.task_name.lower().strip().encode()).hexdigest()
    db.query(DecompositionCache).filter(DecompositionCache.cache_key == key).delete()
    db.commit()

    return {"message": "Decomposition cache cleared successfully"}

