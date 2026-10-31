"""Internal mobility and career paths (FR-06, FR-08).

Decision support only. Nothing here assigns or rejects anyone: each suggestion goes to HR.
"""
import networkx as nx

from app.schemas import explain
from app.services import context, reviews, scoring
from app.services.context import Context

MAX_CAREER_STEPS = 3
SHORTLIST_SIZE = 10


def _cheapest_course(ctx: Context, skill_id: str) -> dict | None:
    options = [course for course in ctx.courses if skill_id in course["skills_taught"]]
    return min(options, key=lambda course: course["hours"], default=None)


def _missing(ctx: Context, levels: dict[str, float], role: dict) -> list[dict]:
    rows = []
    for required in role.get("required_skills", []):
        current = levels.get(required["skill_id"], 0.0)
        if current < required["level"]:
            course = _cheapest_course(ctx, required["skill_id"])
            rows.append({
                "skill_id": required["skill_id"],
                "name": ctx.skill_name(required["skill_id"]),
                "current": current,
                "required": required["level"],
                "course_id": course["course_id"] if course else None,
                "course_title": course["title"] if course else None,
                "hours": course["hours"] if course else 0,
            })
    return rows


def _unique_hours(missing: list[dict]) -> int:
    return sum({row["course_id"]: row["hours"] for row in missing if row["course_id"]}.values())


def _match(ctx: Context, employee_id: str, role: dict) -> dict:
    levels = ctx.levels(employee_id)
    readiness = scoring.role_readiness(levels, role.get("required_skills", []), ctx.criticalities())
    missing = _missing(ctx, levels, role)
    hours = _unique_hours(missing)
    return {
        "role_id": role["role_id"],
        "role_title": role["title"],
        "readiness": readiness,
        "missing_skills": missing,
        "bridge_hours": hours,
        "bridge_weeks": scoring.bridge_weeks(hours),
    }


def _explanation(match: dict) -> dict:
    return explain(
        f"{match['readiness']:.0%} ready for {match['role_title']}, about "
        f"{match['bridge_weeks']} weeks of learning away.",
        [{"name": row["name"], "value": f"{row['current']} of {row['required']} required",
          "weight": round(row["current"] / row["required"], 3), "direction": "up"}
         for row in match["missing_skills"][:5]],
        match["readiness"], "Criticality-weighted role readiness", "rules",
    )


def rank_roles(ctx: Context, employee_id: str) -> list[dict]:
    """Open roles other than the current one, best match first, one row per role."""
    current = ctx.employee(employee_id)["role_id"]
    open_ids = {row["role_id"]: row["open_role_id"] for row in ctx.open_roles}
    matches = [
        {**_match(ctx, employee_id, ctx.roles[role_id]), "open_role_id": open_role_id}
        for role_id, open_role_id in open_ids.items()
        if role_id != current and role_id in ctx.roles
    ]
    return sorted(matches, key=lambda match: match["readiness"], reverse=True)


def employee_mobility(employee_id: str, role: str) -> dict:
    ctx = context.load()
    items = []
    for match in rank_roles(ctx, employee_id)[:3]:
        explanation = _explanation(match)
        payload = {key: match[key] for key in ("role_id", "role_title", "readiness", "bridge_weeks")}
        review = reviews.submit_for_review(
            "mobility", employee_id, match["role_id"],
            f"{employee_id} to {match['role_title']}", payload, explanation,
        )
        if reviews.hidden_from(role, review):
            continue
        items.append(reviews.apply_review({**match, "explanation": explanation}, review))
    return {"employee_id": employee_id, "matches": items, "decision_support": True}


def candidates(role_id: str) -> dict:
    ctx = context.load()
    role = ctx.role(role_id)
    rows = []
    for employee_id, employee in ctx.employees.items():
        if employee["role_id"] == role_id:
            continue
        match = _match(ctx, employee_id, role)
        review = reviews.get_decision("mobility", employee_id, role_id)
        rows.append({
            **match,
            "employee_id": employee_id,
            "department": employee["department"],
            "explanation": _explanation(match),
            **(reviews.status_fields(review) if review else {"review_status": None}),
        })
    rows.sort(key=lambda row: row["readiness"], reverse=True)
    return {
        "role_id": role_id,
        "role_title": role["title"],
        "candidates": rows[:SHORTLIST_SIZE],
        "decision_support": True,
        "note": "Decision support only. HR makes every mobility decision.",
    }


def _role_graph(ctx: Context) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_nodes_from(ctx.roles)
    for role_id, role in ctx.roles.items():
        graph.add_edges_from((role_id, target) for target in role.get("next_roles", []) if target in ctx.roles)
    return graph


def _walk_path(ctx: Context, employee_id: str, path: list[str]) -> dict:
    """Follow a path step by step, so a skill learned early is not counted twice."""
    levels = dict(ctx.levels(employee_id))
    steps, total_distance, weeks = [], 0.0, 0.0
    for role_id in path[1:]:
        role = ctx.roles[role_id]
        missing = _missing(ctx, levels, role)
        distance = sum(
            (row["required"] - row["current"]) * ctx.criticality(row["skill_id"]) for row in missing
        )
        step_weeks = scoring.bridge_weeks(_unique_hours(missing))
        weeks += step_weeks
        total_distance += distance
        steps.append({
            "role_id": role_id,
            "role_title": role["title"],
            "missing_skills": missing,
            "weeks": step_weeks,
            "cumulative_weeks": round(weeks, 1),
        })
        for row in missing:
            levels[row["skill_id"]] = row["required"]
    return {
        "target_role_id": path[-1],
        "target_title": ctx.roles[path[-1]]["title"],
        "steps": steps,
        "skill_distance": round(total_distance, 2),
        "total_weeks": round(weeks, 1),
    }


def career_paths(employee_id: str, role: str) -> dict:
    ctx = context.load()
    current = ctx.employee(employee_id)["role_id"]
    graph = _role_graph(ctx)
    walked = []
    if current in graph:
        for target in graph.nodes:
            if target == current:
                continue
            options = nx.all_simple_paths(graph, current, target, cutoff=MAX_CAREER_STEPS)
            best = min(
                (_walk_path(ctx, employee_id, path) for path in options),
                key=lambda walk: walk["skill_distance"], default=None,
            )
            if best:
                walked.append(best)
    walked.sort(key=lambda walk: (walk["skill_distance"], len(walk["steps"])))

    paths = []
    for walk in walked[:2]:
        titles = " to ".join(step["role_title"] for step in walk["steps"])
        explanation = explain(
            f"{titles}: about {walk['total_weeks']} weeks of learning.",
            [{"name": step["role_title"], "value": f"{step['weeks']} weeks",
              "weight": round(step["weeks"] / walk["total_weeks"], 3) if walk["total_weeks"] else 0.0,
              "direction": "up"} for step in walk["steps"]],
            0.7, "Shortest path on the role graph, weighted by skill distance", "rules",
        )
        review = reviews.submit_for_review(
            "career_plan", employee_id, walk["target_role_id"], f"{employee_id} career path to {walk['target_title']}",
            {"target_role_id": walk["target_role_id"], "total_weeks": walk["total_weeks"]}, explanation,
        )
        if not reviews.hidden_from(role, review):
            paths.append(reviews.apply_review({**walk, "explanation": explanation}, review))
    return {"employee_id": employee_id, "current_role_id": current, "paths": paths}
