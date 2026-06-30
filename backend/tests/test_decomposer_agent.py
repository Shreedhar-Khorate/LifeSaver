"""
Pytest tests for the decomposer_agent.
Run with: cd backend && pytest tests/ -v
"""
import pytest
from unittest.mock import MagicMock
import sys
import os

# Allow importing from backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.decomposer_agent import decompose


@pytest.mark.anyio
async def test_decompose_pattern_match():
    db_mock = MagicMock()
    # "presentation" task matches PATTERNS key
    subtasks, tip = await decompose("Hackathon Presentation", db_mock)
    
    assert len(subtasks) == 4
    assert subtasks[0]["name"] == "Create outline"
    assert "delivery twice" in tip
