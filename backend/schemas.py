from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


# --- Task Schemas ---
class TaskCreate(BaseModel):
    task_name: str
    deadline: Optional[datetime] = None
    importance: int = Field(5, ge=1, le=10)
    estimated_hours: float = 1.0


class TaskUpdate(BaseModel):
    task_name: Optional[str] = None
    deadline: Optional[datetime] = None
    importance: Optional[int] = Field(None, ge=1, le=10)
    estimated_hours: Optional[float] = None
    status: Optional[str] = None


class SubtaskResponse(BaseModel):
    id: int
    task_id: int
    name: str
    hours: float
    is_core: bool
    completed: bool
    order_index: int

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: int
    user_id: int
    task_name: str
    deadline: Optional[datetime] = None
    importance: int
    estimated_hours: float
    priority_score: float
    status: str
    created_at: datetime
    subtasks: List[SubtaskResponse] = []

    class Config:
        from_attributes = True


# --- AI Parser Schemas ---
class TaskParseRequest(BaseModel):
    text: str


class ParsedTaskItem(BaseModel):
    name: str
    deadline: Optional[str] = None    # "YYYY-MM-DD HH:MM" or null
    importance: int = Field(5, ge=1, le=10)
    estimated_hours: float = 1.0


# --- Decompose Schemas ---
class DecomposeRequest(BaseModel):
    task_name: str


class DecomposeItem(BaseModel):
    name: str
    hours: float
    is_core: bool = True


# --- Schedule Schemas ---
class ScheduleGenerateRequest(BaseModel):
    available_hours: float = Field(6.0, gt=0, le=24)


class ScheduleSlotResponse(BaseModel):
    id: Optional[int] = None
    task_id: int
    task_name: str
    start_time: datetime
    end_time: datetime
    hours: float
    is_rescued: bool = False

    class Config:
        from_attributes = True


# --- Rescue Schemas ---
class RescueRequest(BaseModel):
    hours_remaining: float = Field(..., gt=0)


class RescueSimulateRequest(BaseModel):
    extra_hours: float = Field(0, ge=0, le=24)


class RescueResponse(BaseModel):
    dropped: List[str]
    focus: List[str]
    core_hours: float
    before_success: float
    after_success: float
    tip: str = ""


# --- Dashboard Schemas ---
class DashboardResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    risk_score: float
    success_probability: float
    dna_type: str
    dna_emoji: str
    dna_label: str
    dna_tip: str = ""
    upcoming_deadlines: List[TaskResponse] = []
