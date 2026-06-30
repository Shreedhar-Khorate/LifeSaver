"""
Pytest tests for the priority_engine scoring logic.
Run with: cd backend && pytest tests/ -v
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock
import sys
import os

# Allow importing from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.priority_engine import score, rank


def make_task(importance=5, estimated_hours=2.0, deadline_hours=None, status="pending"):
    """Factory to build a mock Task for testing."""
    task = MagicMock()
    task.importance = importance
    task.estimated_hours = estimated_hours
    task.status = status
    task.deadline = (
        datetime.now(timezone.utc) + timedelta(hours=deadline_hours)
        if deadline_hours is not None else None
    )
    return task


class TestScoreNoDeadline:
    def test_score_is_within_range(self):
        task = make_task(importance=5)
        result = score(task)
        assert 0 <= result <= 100

    def test_score_max_importance_no_deadline(self):
        task = make_task(importance=10)
        result = score(task)
        # Max is importance * 10 * 0.70 = 70
        assert result == 70.0

    def test_score_min_importance_no_deadline(self):
        task = make_task(importance=1)
        result = score(task)
        assert result == 7.0

    def test_no_deadline_lower_than_urgent_task(self):
        """A high-importance no-deadline task should score less than an urgent deadline task."""
        no_deadline = make_task(importance=10, deadline_hours=None)
        urgent = make_task(importance=8, estimated_hours=3, deadline_hours=1)
        assert score(no_deadline) < score(urgent)


class TestScoreWithDeadline:
    def test_score_urgent_deadline_high(self):
        task = make_task(importance=8, estimated_hours=3, deadline_hours=1)
        result = score(task)
        assert result > 70, f"Expected > 70 for 1h deadline, got {result}"

    def test_score_distant_deadline_low(self):
        task = make_task(importance=5, estimated_hours=1, deadline_hours=200)
        result = score(task)
        assert result < 60, f"Expected < 60 for 200h deadline, got {result}"

    def test_score_overdue_task_high(self):
        """Overdue tasks (negative hours_left) should be capped at maximum urgency."""
        task = make_task(importance=5, estimated_hours=2, deadline_hours=-2)
        result = score(task)
        assert result >= 80, f"Overdue task should score >= 80, got {result}"

    def test_score_is_numeric(self):
        task = make_task(importance=7, estimated_hours=4, deadline_hours=12)
        result = score(task)
        assert isinstance(result, float)


class TestRank:
    def test_rank_orders_by_score_desc(self):
        low = make_task(importance=1, deadline_hours=None)
        high = make_task(importance=10, estimated_hours=2, deadline_hours=1)
        medium = make_task(importance=5, estimated_hours=1, deadline_hours=48)

        ranked = rank([low, medium, high])
        assert ranked[0] is high
        assert ranked[-1] is low

    def test_rank_empty_list(self):
        assert rank([]) == []

    def test_rank_single_task(self):
        task = make_task(importance=5)
        assert rank([task]) == [task]
