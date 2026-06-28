from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, default=1)
    name            = Column(String, default="Demo User")
    dna_type        = Column(String, default="consistent")
    available_hours = Column(Float, default=6.0)
    peak_hours      = Column(String, default='["09:00-12:00","14:00-18:00"]')

    tasks     = relationship("Task",     back_populates="user", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"), default=1)
    task_name       = Column(String, nullable=False)
    deadline        = Column(DateTime(timezone=True), nullable=True)
    importance      = Column(Integer, default=5)           # 1–10
    estimated_hours = Column(Float, default=1.0)
    priority_score  = Column(Float, default=0)
    status          = Column(String, default="pending")    # pending / in_progress / completed / dropped
    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at    = Column(DateTime(timezone=True), nullable=True)

    user      = relationship("User",    back_populates="tasks")
    subtasks  = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")
    schedules = relationship("Schedule",back_populates="task", cascade="all, delete-orphan")


class Subtask(Base):
    __tablename__ = "subtasks"

    id          = Column(Integer, primary_key=True)
    task_id     = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    name        = Column(String, nullable=False)
    hours       = Column(Float, default=1.0)
    is_core     = Column(Boolean, default=True)   # False = droppable in rescue
    completed   = Column(Boolean, default=False)
    dropped     = Column(Boolean, default=False)  # True = removed by rescue mode
    order_index = Column(Integer, default=0)

    task = relationship("Task", back_populates="subtasks")


class Schedule(Base):
    __tablename__ = "schedule"

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), default=1)
    task_id    = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time   = Column(DateTime(timezone=True), nullable=False)
    is_rescued = Column(Boolean, default=False)

    user = relationship("User", back_populates="schedules")
    task = relationship("Task", back_populates="schedules")


class DecompositionCache(Base):
    __tablename__ = "decomposition_cache"

    id         = Column(Integer, primary_key=True)
    cache_key  = Column(String, unique=True, nullable=False)  # MD5 of normalized task name
    subtasks   = Column(String, nullable=False)                # JSON string
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
