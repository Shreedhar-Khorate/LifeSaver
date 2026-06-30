"""
Pytest tests for the scheduler_engine packing logic.
Run with: cd backend && pytest tests/ -v
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
import sys
import os

# Allow importing from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.scheduler_engine import build


def make_task(id, task_name, estimated_hours=1.0, status="pending"):
    task = MagicMock()
    task.id = id
    task.task_name = task_name
    task.estimated_hours = estimated_hours
    task.status = status
    return task


def test_schedule_fits_available_hours():
    tasks = [
        make_task(1, "Task A", 3.0),
        make_task(2, "Task B", 4.0),
    ]
    slots = build(tasks, available_hours=5.0)
    total_hours = sum(s["hours"] for s in slots)
    assert total_hours == 5.0
    assert len(slots) == 2
    assert slots[0]["hours"] == 3.0
    assert slots[1]["hours"] == 2.0


def test_schedule_skips_non_pending_tasks():
    tasks = [
        make_task(1, "Task A", 2.0, "completed"),
        make_task(2, "Task B", 3.0, "pending"),
    ]
    slots = build(tasks, available_hours=5.0)
    assert len(slots) == 1
    assert slots[0]["task_id"] == 2
    assert slots[0]["hours"] == 3.0


def test_schedule_empty_tasks():
    slots = build([], available_hours=5.0)
    assert slots == []
