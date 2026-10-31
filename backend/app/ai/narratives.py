"""Gemini wording for numbers the code has already computed.

    market_brief(top_skills=None) -> {"summary", "highlights", "skill_ids", "source"}
    course_reason(facts)          -> {"reason", "source"}

Gemini only writes the words. Every number comes from `facts`, and the response
may name only IDs that appear in the facts. Each function has a template
fallback, so the output is always usable.
"""

import json

from pydantic import BaseModel

from app import db as dbm
from app.ai.guard import assert_clean
from app.ai.llm import ID_PATTERN, generate_json_with_source


class Highlight(BaseModel):
    skill_id: str
    text: str


class MarketBrief(BaseModel):
    summary: str
    highlights: list[Highlight]


class Reason(BaseModel):
    reason: str


def _ids_in(facts) -> set[str]:
    return set(ID_PATTERN.findall(json.dumps(facts, default=str)))


def _top_rising(n: int = 5) -> list[dict]:
    try:
        return list(
            dbm.get_db()[dbm.FORECASTS]
            .find({}, {"_id": 0, "skill_id": 1, "skill_name": 1, "growth_pct": 1, "trend_status": 1, "postings_growth_pct": 1})
            .sort("growth_pct", -1)
            .limit(n)
        )
    except Exception:
        return []


def _brief_facts(top_skills: list[dict]) -> list[dict]:
    keys = ("skill_id", "skill_name", "growth_pct", "trend_status", "postings_growth_pct")
    facts = []
    for s in top_skills:
        item = {k: s.get(k) for k in keys if s.get(k) is not None}
        if "skill_name" not in item and "name" in s:
            item["skill_name"] = s["name"]
        if "growth_pct" not in item and "growth" in s:
            item["growth_pct"] = round(s["growth"] * 100, 1)
        facts.append(item)
    return facts


def _brief_template(facts: list[dict]) -> MarketBrief:
    if not facts:
        return MarketBrief(summary="No forecast data is available yet.", highlights=[])
    lead = facts[0]
    names = ", ".join(f["skill_name"] for f in facts[:3])
    summary = (
        f"The fastest-growing skills over the next four quarters are {names}. "
        f"{lead['skill_name']} leads with forecast demand growth of {lead['growth_pct']:+.0f}%, "
        "so it should be prioritised in hiring and upskilling plans."
    )
    highlights = [
        Highlight(
            skill_id=f["skill_id"],
            text=f"{f['skill_name']}: {f['growth_pct']:+.0f}% forecast demand over 4 quarters ({f.get('trend_status', 'n/a')}).",
        )
        for f in facts
    ]
    return MarketBrief(summary=summary, highlights=highlights)


def market_brief(top_skills: list[dict] | None = None) -> dict:
    facts = _brief_facts(top_skills if top_skills is not None else _top_rising())
    assert_clean(facts)
    fallback = _brief_template(facts)
    prompt = (
        "Write a short market intelligence brief for an HR leader about future skill demand.\n"
        "Use only the facts below. Do not invent numbers. Cite each skill by its skill_id.\n"
        "summary: 2 or 3 sentences that name the fastest-growing skills and their growth. "
        "highlights: one sentence per skill.\n\n"
        f"Facts (JSON):\n{json.dumps(facts)}"
    )
    result, source = generate_json_with_source(prompt, MarketBrief, fallback, _ids_in(facts))
    return {
        "summary": result.summary,
        "highlights": [h.model_dump() for h in result.highlights],
        "skill_ids": [f["skill_id"] for f in facts],
        "source": source,
    }


def _reason_template(facts: dict) -> str:
    if "course_id" in facts:
        title = facts.get("course_title") or facts.get("title") or facts["course_id"]
        skill = facts.get("skill_name") or " and ".join(facts.get("closes_skills") or []) or facts.get("skill_id", "a needed skill")
        parts = [f"{title} builds {skill}"]
        if facts.get("current_level") is not None and facts.get("target_level") is not None:
            parts.append(f"taking you from level {facts['current_level']} toward the level {facts['target_level']} your role needs")
        text = ", ".join(parts) + "."
        if facts.get("growth_pct") is not None:
            text += f" Demand for this skill is forecast to change {facts['growth_pct']:+.0f}% over the next year."
        if facts.get("hours"):
            text += f" It takes about {facts['hours']} hours."
        return text
    if "role_id" in facts:
        text = f"You already meet {facts.get('readiness_pct', 0):.0f}% of what {facts.get('role_title', facts['role_id'])} needs."
        missing = facts.get("missing_skills") or []
        if missing:
            text += f" The main skills to build are {', '.join(missing[:3])}."
        return text + " This is a suggestion for HR to review."
    return "Recommended because it closes a gap that matters for your role."


def course_reason(facts: dict) -> dict:
    """Explain one recommendation. For a course pass course_id, course_title, skill_id,
    skill_name, current_level, target_level, growth_pct and hours. For a role move pass
    role_id, role_title, readiness_pct and missing_skills (names)."""
    assert_clean(facts)
    fallback = Reason(reason=_reason_template(facts))
    prompt = (
        "Explain to an employee, in one or two friendly sentences, why this recommendation fits them.\n"
        "Use only the facts below. Do not invent numbers, and do not mention any ID that is not in the facts.\n\n"
        f"Facts (JSON):\n{json.dumps(facts, default=str)}"
    )
    result, source = generate_json_with_source(prompt, Reason, fallback, _ids_in(facts))
    return {"reason": result.reason, "source": source}
