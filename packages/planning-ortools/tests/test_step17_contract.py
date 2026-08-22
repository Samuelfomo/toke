from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.schemas import EngineConfig


def base_config(**overrides):
    payload = dict(
        minRestDaysPerWeek=1,
        minRestMinutesBetweenShifts=660,
        maxConsecutiveGuards=1,
        restAfterGuardRequired=True,
        postGuardRestDays=1,
        fairnessWindowWeeks=4,
        strictCoverage=True,
    )
    payload.update(overrides)
    return EngineConfig(**payload)


def test_resilient_assistant_mode_is_default():
    assert base_config().resilientAssistantMode is True


def test_legacy_strict_mode_can_still_be_requested():
    assert base_config(resilientAssistantMode=False).resilientAssistantMode is False


def test_step17_solver_contains_soft_guard_pool_terms():
    source = (ROOT / "app" / "solver.py").read_text(encoding="utf-8")
    assert "guard_pool_rotation_terms" in source
    assert "guard_pool_consecutive_terms" in source
    assert "GUARD_ROTATION_ORDER_RELAXED" in source
    assert "GUARD_MEMBERSHIP_SPREAD_RELAXED" in source
    assert "GUARD_CONSECUTIVE_MEMBERSHIP_RELAXED" in source
