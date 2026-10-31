"""Skill taxonomy, knowledge graph and free-text extraction (FR-01)."""
from app import ai_bridge
from app.schemas import explain
from app.services import context, reviews

REVIEW_THRESHOLD = 0.7


def list_skills() -> list[dict]:
    return sorted(context.load().skills.values(), key=lambda skill: skill["skill_id"])


def graph(focus: str | None) -> dict:
    ctx = context.load()
    return ai_bridge.graph(list(ctx.skills.values()), list(ctx.roles.values()), focus)


def extract(text: str, employee_id: str | None) -> dict:
    ctx = context.load()
    if employee_id:
        ctx.employee(employee_id)
    found, source = ai_bridge.extract_skills(text, list(ctx.skills.values()))

    matches = []
    for row in found:
        if row["skill_id"] not in ctx.skills:
            continue
        match = {
            "skill_id": row["skill_id"],
            "name": ctx.skill_name(row["skill_id"]),
            "confidence": round(row["confidence"], 3),
            "needs_review": row["confidence"] < REVIEW_THRESHOLD,
        }
        if match["needs_review"] and employee_id:
            summary = f"Extracted {match['name']} at {match['confidence']:.0%} confidence."
            review = reviews.submit_for_review(
                "skill_claim", employee_id, row["skill_id"], f"Skill claim: {match['name']}",
                {"skill_id": row["skill_id"], "confidence": match["confidence"]},
                explain(summary, [], match["confidence"], "Skill extraction", source),
            )
            match.update(reviews.status_fields(review))
        matches.append(match)
    matches.sort(key=lambda match: match["confidence"], reverse=True)

    confidence = sum(match["confidence"] for match in matches) / len(matches) if matches else 0.0
    return {
        "matches": matches,
        "explanation": explain(
            f"Found {len(matches)} known skills in the text.",
            [{"name": match["name"], "value": f"{match['confidence']:.0%} confidence",
              "weight": match["confidence"], "direction": "up"} for match in matches[:5]],
            confidence, "Skill extraction", source,
        ),
    }
