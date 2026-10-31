"""Skill profiles and current gaps (FR-01, FR-02)."""
from app.schemas import explain
from app.services import context, reviews, scoring
from app.services.context import Context


def list_employees() -> list[dict]:
    ctx = context.load()
    criticality = ctx.criticalities()
    rows = []
    for row in sorted(ctx.employees.values(), key=lambda row: row["employee_id"]):
        employee_id = row["employee_id"]
        role = ctx.roles.get(row["role_id"], {})
        rows.append({
            "employee_id": employee_id,
            "role_id": row["role_id"],
            "role_title": role.get("title", row["role_id"]),
            "department": row["department"],
            "current_role_readiness": scoring.role_readiness(
                ctx.levels(employee_id), role.get("required_skills", []), criticality
            ),
            "gap_count": len(gap_rows(ctx, employee_id, role)),
        })
    return rows


def gap_rows(ctx: Context, employee_id: str, role: dict) -> list[dict]:
    levels = ctx.levels(employee_id)
    rows = []
    for required in role.get("required_skills", []):
        skill_id = required["skill_id"]
        effective = levels.get(skill_id, 0.0)
        severity = scoring.gap_severity(required["level"], effective, ctx.criticality(skill_id))
        if severity > 0:
            rows.append({
                "skill_id": skill_id,
                "name": ctx.skill_name(skill_id),
                "category": ctx.skills.get(skill_id, {}).get("category", "Other"),
                "required": required["level"],
                "effective": effective,
                "gap": round(required["level"] - effective, 2),
                "criticality": ctx.criticality(skill_id),
                "severity": severity,
            })
    return sorted(rows, key=lambda row: row["severity"], reverse=True)


def profile(employee_id: str, role: str) -> dict:
    ctx = context.load()
    employee = ctx.employee(employee_id)
    levels = ctx.levels(employee_id)
    skills = [
        {
            "skill_id": item["skill_id"],
            "name": ctx.skill_name(item["skill_id"]),
            "category": ctx.skills.get(item["skill_id"], {}).get("category", "Other"),
            "effective_level": levels[item["skill_id"]],
            "evidence_strength": scoring.evidence_strength(item.get("evidence", [])),
            "evidence": item.get("evidence", []),
        }
        for item in employee.get("skills", [])
    ]
    skills.sort(key=lambda row: row["effective_level"], reverse=True)

    claims = [
        {"skill_id": review["key"], "name": ctx.skill_name(review["key"]), **reviews.status_fields(review)}
        for review in reviews.list_reviews(type="skill_claim")
        if review["subject_id"] == employee_id and not reviews.hidden_from(role, review)
    ]
    strongest = skills[0]["name"] if skills else "none yet"
    confidence = sum(row["evidence_strength"] for row in skills) / len(skills) if skills else 0.0
    return {
        "employee_id": employee_id,
        "role_id": employee["role_id"],
        "role_title": ctx.roles.get(employee["role_id"], {}).get("title", employee["role_id"]),
        "department": employee["department"],
        "skills": skills,
        "claims": claims,
        "learning": employee.get("learning", []),
        "projects": employee.get("projects", []),
        "explanation": explain(
            f"{len(skills)} skills assessed from recorded evidence. Strongest: {strongest}.",
            [{"name": source.title(), "value": f"{weight:.0%} of evidence weight",
              "weight": weight, "direction": "up"}
             for source, weight in scoring.EVIDENCE_WEIGHTS.items()],
            confidence, "Weighted evidence", "rules",
        ),
    }


def employee_gaps(employee_id: str, role_id: str | None) -> dict:
    ctx = context.load()
    employee = ctx.employee(employee_id)
    target = ctx.role(role_id or employee["role_id"])
    rows = gap_rows(ctx, employee_id, target)
    total = sum(row["severity"] for row in rows)
    required_count = len(target.get("required_skills", [])) or 1
    return {
        "employee_id": employee_id,
        "role_id": target["role_id"],
        "role_title": target["title"],
        "gaps": rows,
        "total_severity": round(total, 3),
        "explanation": explain(
            f"{len(rows)} of {required_count} required skills for {target['title']} are below target.",
            [{"name": row["name"], "value": f"{row['gap']} levels below target",
              "weight": round(row["severity"] / total, 3), "direction": "up"} for row in rows[:5]],
            0.9, "Required minus effective level, times criticality", "rules",
        ),
    }


def org_heatmap() -> dict:
    ctx = context.load()
    totals: dict[tuple[str, str], float] = {}
    headcount: dict[str, int] = {}
    for employee_id, employee in ctx.employees.items():
        department = employee["department"]
        headcount[department] = headcount.get(department, 0) + 1
        role = ctx.roles.get(employee["role_id"])
        for row in gap_rows(ctx, employee_id, role) if role else []:
            cell = (department, row["category"])
            totals[cell] = totals.get(cell, 0.0) + row["severity"]

    departments = sorted(headcount)
    categories = sorted({skill.get("category", "Other") for skill in ctx.skills.values()})
    cells = [
        {"department": department, "category": category,
         "severity": round(totals.get((department, category), 0.0) / headcount[department], 2)}
        for department in departments for category in categories
    ]
    return {"departments": departments, "categories": categories, "cells": cells}
