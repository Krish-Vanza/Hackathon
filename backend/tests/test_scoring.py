from datetime import date

import pytest

from app.services import scoring

TODAY = date(2026, 10, 1)


def evidence(source, level, day="2026-06-01"):
    return {"source": source, "level": level, "date": day}


def test_evidence_weights_all_sources():
    items = [evidence("manager", 4), evidence("project", 3), evidence("certification", 5), evidence("self", 2)]
    assert scoring.effective_level(items, TODAY) == pytest.approx(0.4 * 4 + 0.3 * 3 + 0.2 * 5 + 0.1 * 2)


def test_evidence_renormalizes_over_present_sources():
    items = [evidence("manager", 4), evidence("self", 2)]
    assert scoring.effective_level(items, TODAY) == pytest.approx(3.6)


def test_old_evidence_counts_half():
    items = [evidence("manager", 4, "2024-01-01"), evidence("self", 2)]
    assert scoring.effective_level(items, TODAY) == pytest.approx(3.33)


def test_repeat_entries_do_not_outweigh_a_source():
    items = [evidence("self", 5), evidence("self", 5), evidence("self", 5), evidence("manager", 1)]
    assert scoring.effective_level(items, TODAY) == pytest.approx(1.8)


def test_no_evidence_is_level_zero():
    assert scoring.effective_level([], TODAY) == 0


def test_surplus_skill_creates_no_gap():
    assert scoring.gap_severity(3, 4.5, 0.9) == 0


def test_gap_severity_uses_criticality():
    assert scoring.gap_severity(4, 2, 0.5) == 1


def test_future_gap_applies_attrition():
    assert scoring.future_gap(10, 10) == pytest.approx(10 - 10 * 0.97**4, abs=0.01)


@pytest.mark.parametrize("inputs", [(0, 0, 0, 0), (100, 100, 100, 100), (-50, 400, 900, -1)])
def test_risk_stays_in_range(inputs):
    assert 0 <= scoring.risk_score(*inputs) <= 100


def test_risk_weights():
    assert scoring.risk_score(100, 0, 0, 0) == 40
    assert scoring.risk_score(0, 100, 100, 100) == 60


@pytest.mark.parametrize("score,level", [(70, "high"), (69.9, "medium"), (40, "medium"), (39.9, "low")])
def test_risk_levels(score, level):
    assert scoring.risk_level(score) == level


def test_readiness_caps_each_skill():
    assert scoring.readiness_index([(10, 50), (10, 5)]) == 75


def test_readiness_with_no_demand():
    assert scoring.readiness_index([]) == 0


def test_role_readiness_ignores_surplus():
    required = [{"skill_id": "A", "level": 4}, {"skill_id": "B", "level": 2}]
    assert scoring.role_readiness({"A": 5, "B": 1}, required, {"A": 1, "B": 1}) == pytest.approx(5 / 6, abs=0.001)


def test_prerequisites_come_first():
    courses = [
        {"course_id": "advanced", "skills_taught": ["B"]},
        {"course_id": "other", "skills_taught": ["C"]},
        {"course_id": "basic", "skills_taught": ["A"]},
    ]
    ordered = [row["course_id"] for row in scoring.order_by_prerequisites(courses, {"B": ["A"]})]
    assert ordered.index("basic") < ordered.index("advanced")
    assert len(ordered) == 3


def test_prerequisite_cycle_keeps_score_order():
    courses = [{"course_id": "x", "skills_taught": ["A"]}, {"course_id": "y", "skills_taught": ["B"]}]
    assert scoring.order_by_prerequisites(courses, {"A": ["B"], "B": ["A"]}) == courses
