"""
Pytest tests for the rescue_engine logic.
Run with: cd backend && pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock
import sys
import os

# Allow importing from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rescue_engine import rescue, simulate


def make_subtask(name, hours=1.0, is_core=True):
    subtask = MagicMock()
    subtask.name = name
    subtask.hours = hours
    subtask.is_core = is_core
    return subtask


def test_rescue_mode_drops_non_core_subtasks():
    subtasks = [
        make_subtask("Core Outline", 1.0, is_core=True),
        make_subtask("Polish animations", 2.0, is_core=False),
        make_subtask("Core Coding", 3.0, is_core=True),
    ]
    tasks = []
    
    result = rescue(tasks, subtasks, hours_remaining=4.0, dna_type="consistent")
    
    assert "Polish animations" in result["dropped"]
    assert "Core Outline" in result["focus"]
    assert "Core Coding" in result["focus"]
    assert result["core_hours"] == 4.0
    # fit_ratio = 4.0 / 4.0 = 1.0. 1.0 * 100 + 5 (consistent bonus) = 105, capped at 97
    assert result["after_success"] == 97


def test_simulate_what_if():
    # core_hours=4.0, extra_hours=2.0, dna=consistent. fit = (0.0 + 2.0) / 4.0 = 0.5. 50 + 5 = 55%
    prob = simulate(core_hours=4.0, extra_hours=2.0, dna_type="consistent", hours_remaining=0.0)
    assert prob == 55

    # core_hours=4.0, extra_hours=2.0, hours_remaining=1.0, dna=consistent. fit = (1.0 + 2.0) / 4.0 = 0.75. 75 + 5 = 80%
    prob_with_remain = simulate(core_hours=4.0, extra_hours=2.0, dna_type="consistent", hours_remaining=1.0)
    assert prob_with_remain == 80
