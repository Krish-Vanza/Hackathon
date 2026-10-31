from app import db as dbm
from app.ai.guard import assert_clean
from seed import catalog as cat
from seed.check import run_checks
from seed.generate_seed import build_dataset


def test_counts_match_plan():
    data = build_dataset()
    assert {k: len(v) for k, v in data.items()} == {
        "skills": 40, "roles": 10, "courses": 30, "open_roles": 8, "employees": 60, "market_signals": 800,
    }


def test_seed_is_repeatable():
    assert build_dataset() == build_dataset()


def test_seed_has_no_sensitive_attributes():
    data = build_dataset()
    assert_clean(data[dbm.EMPLOYEES])
    for emp in data[dbm.EMPLOYEES]:
        assert set(emp) == {"employee_id", "role_id", "department", "skills", "learning", "projects"}


def test_references_are_valid():
    data = build_dataset()
    skills = set(cat.SKILL_IDS)
    roles = set(cat.ROLE_IDS)
    courses = {c["course_id"] for c in data[dbm.COURSES]}
    for emp in data[dbm.EMPLOYEES]:
        assert emp["role_id"] in roles
        assert all(s["skill_id"] in skills for s in emp["skills"])
        assert all(item["course_id"] in courses for item in emp["learning"])
    for role in data[dbm.ROLES]:
        assert all(r["skill_id"] in skills for r in role["required_skills"])
        assert set(role["next_roles"]) <= roles
    for skill in data[dbm.SKILLS]:
        assert set(skill["prerequisites"]) <= skills


def test_planted_story():
    data = build_dataset()
    emps = {e["employee_id"]: e for e in data[dbm.EMPLOYEES]}
    star = emps[cat.MOBILITY_STAR]
    assert star["role_id"] == "R-01"
    star_skills = {s["skill_id"] for s in star["skills"]}
    assert {"S-022", "S-023", "S-024"} <= star_skills

    def top_level(emp, skill_id):
        for s in emp["skills"]:
            if s["skill_id"] == skill_id:
                return max(ev["level"] for ev in s["evidence"] if ev["source"] != "self") if any(
                    ev["source"] != "self" for ev in s["evidence"]) else 0
        return 0

    experts = [e["employee_id"] for e in emps.values()
               if e["department"] == cat.SINGLE_EXPERT_DEPARTMENT and top_level(e, cat.AGENTIC_AI) >= 4]
    assert experts == [cat.SINGLE_EXPERT_EMPLOYEE]

    agentic = [r["demand_fte"] for r in data[dbm.MARKET_SIGNALS] if r["skill_id"] == cat.AGENTIC_AI]
    assert agentic[-1] / agentic[0] > 3


def test_seeded_database_passes_checks(seeded_db):
    db, _ = seeded_db
    assert run_checks(db) == []
