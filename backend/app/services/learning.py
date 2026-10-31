"""Personalized learning paths (FR-05)."""
from concurrent.futures import ThreadPoolExecutor

from app import ai_bridge
from app.schemas import explain
from app.services import context, mobility, reviews, scoring
from app.services.context import Context
from app.services.gaps import gap_rows

PLAN_SIZE = 5


def list_courses() -> list[dict]:
    return sorted(context.load().courses, key=lambda course: course["course_id"])


def _target_role(ctx: Context, employee_id: str, role_id: str | None) -> dict:
    """The requested role, or the current one, or the best next match if the current has no gaps."""
    employee = ctx.employee(employee_id)
    if role_id:
        return ctx.role(role_id)
    current = ctx.roles.get(employee["role_id"])
    if current and gap_rows(ctx, employee_id, current):
        return current
    matches = mobility.rank_roles(ctx, employee_id)
    return ctx.role(matches[0]["role_id"]) if matches else current or {"required_skills": []}


def _scored_courses(ctx: Context, employee_id: str, gaps: list[dict]) -> list[dict]:
    gap_by_skill = {gap["skill_id"]: gap for gap in gaps}
    total = sum(gap["severity"] for gap in gaps)
    completed = {
        item.get("course_id") for item in ctx.employee(employee_id).get("learning", [])
        if item.get("status", "completed") == "completed"
    }

    scored = []
    for course in ctx.courses:
        closes = [gap_by_skill[sid] for sid in course["skills_taught"] if sid in gap_by_skill]
        if not closes or course["course_id"] in completed:
            continue
        coverage = sum(gap["severity"] for gap in closes) / total
        demand = max(scoring.growth_score(ctx.growth(gap["skill_id"])) for gap in closes)
        target = sum(gap["required"] for gap in closes) / len(closes)
        fit = scoring.level_fit(course["level"], target)
        scored.append({
            **course,
            "score": scoring.course_score(coverage, demand, fit),
            "gap_coverage": round(coverage, 3),
            "future_demand": round(demand, 3),
            "level_fit": round(fit, 3),
            "closes_gaps": [gap["skill_id"] for gap in closes],
        })
    return sorted(scored, key=lambda course: course["score"], reverse=True)


def _ordered_plan(ctx: Context, employee_id: str, gaps: list[dict]) -> list[dict]:
    prerequisites = {sid: skill.get("prerequisites", []) for sid, skill in ctx.skills.items()}
    top = _scored_courses(ctx, employee_id, gaps)[:PLAN_SIZE]
    return scoring.order_by_prerequisites(top, prerequisites)


def recommended_courses(ctx: Context, employee_id: str) -> list[dict]:
    target = _target_role(ctx, employee_id, None)
    return _ordered_plan(ctx, employee_id, gap_rows(ctx, employee_id, target))


def _with_reason(ctx: Context, course: dict) -> tuple[dict, str]:
    names = [ctx.skill_name(skill_id) for skill_id in course["closes_gaps"]]
    fallback = (
        f"Closes your {' and '.join(names)} gap, covering {course['gap_coverage']:.0%} of "
        f"your total gap severity, in {course['hours']} hours."
    )
    facts = {
        "course_id": course["course_id"],
        "title": course["title"],
        "closes_skills": names,
        "gap_coverage": course["gap_coverage"],
        "future_demand": course["future_demand"],
        "hours": course["hours"],
    }
    reason, source = ai_bridge.course_reason(facts, fallback)
    return {**course, "reason": reason}, source


def plan(employee_id: str, role_id: str | None, role: str) -> dict:
    ctx = context.load()
    target = _target_role(ctx, employee_id, role_id)
    gaps = gap_rows(ctx, employee_id, target)
    ordered = _ordered_plan(ctx, employee_id, gaps)
    with ThreadPoolExecutor(max_workers=PLAN_SIZE) as pool:
        results = list(pool.map(lambda course: _with_reason(ctx, course), ordered))
    courses = [course for course, _ in results]
    source = "gemini" if any(source == "gemini" for _, source in results) else "template"
    hours = sum(course["hours"] for course in courses)

    closed = {skill_id for course in courses for skill_id in course["closes_gaps"]}
    explanation = explain(
        f"{len(courses)} courses close {len(closed)} of {len(gaps)} gaps for "
        f"{target.get('title', 'this role')} in about {scoring.bridge_weeks(hours)} weeks.",
        [{"name": "Gap coverage", "value": "50% of course score", "weight": 0.5, "direction": "up"},
         {"name": "Future demand", "value": "30% of course score", "weight": 0.3, "direction": "up"},
         {"name": "Level fit", "value": "20% of course score", "weight": 0.2, "direction": "up"}],
        0.8, "Course scoring, ordered by prerequisites", source,
    )
    result = {
        "employee_id": employee_id,
        "role_id": target.get("role_id"),
        "role_title": target.get("title"),
        "courses": courses,
        "total_hours": hours,
        "weeks": scoring.bridge_weeks(hours),
        "explanation": explanation,
    }
    if not courses:
        return {**result, "hidden": False}

    payload = {
        "role_id": target.get("role_id"),
        "course_ids": [course["course_id"] for course in courses],
        "weeks": result["weeks"],
    }
    review = reviews.submit_for_review(
        "learning_plan", employee_id, target.get("role_id"),
        f"Learning plan for {employee_id}", payload, explanation,
    )
    if reviews.hidden_from(role, review):
        return {**result, "courses": [], "total_hours": 0, "weeks": 0, "hidden": True}
    return {**result, **reviews.status_fields(review), "hidden": False}
