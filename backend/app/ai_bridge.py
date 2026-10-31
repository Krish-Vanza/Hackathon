"""Calls Harin's app/ai functions, with safe fallbacks.

Each wrapper uses the real function once its module lands. If the module is missing or
the call fails, the wrapper returns template output, so the demo never crashes on AI.
"""
import logging
import re

from app import config
from app.fairness import assert_clean

log = logging.getLogger(__name__)


def _call(module: str, function: str, *args):
    """Return the app.ai result, or None if it is missing or failed."""
    try:
        loaded = __import__(f"app.ai.{module}", fromlist=[function])
        return getattr(loaded, function)(*args)
    except (ImportError, AttributeError):
        return None
    except Exception:
        log.exception("app.ai.%s.%s failed, using fallback", module, function)
        return None


def _data_call(module: str, function: str, *args):
    """Like _call, for app.ai code that reads the seed. Sample data uses other skill IDs."""
    if not config.MONGODB_URI:
        return None
    return _call(module, function, *args)


def _read(result, *fields):
    for field in fields:
        value = result.get(field) if isinstance(result, dict) else getattr(result, field, None)
        if value is not None:
            return value
    return None


def _text_and_source(result, fallback: str) -> tuple[str, str]:
    if result is None:
        return fallback, "template"
    if isinstance(result, str):
        return result, "gemini"
    text = _read(result, "summary", "text", "reason", "brief")
    if not text:
        return fallback, "template"
    return text, _read(result, "source") or "gemini"


def graph(skills: list[dict], roles: list[dict], focus: str | None = None) -> dict:
    result = _data_call("graph", "get_graph", focus)
    if result is not None:
        return result
    return _fallback_graph(skills, roles, focus)


def centrality(skill_id: str, skills: list[dict], roles: list[dict]) -> float:
    result = _data_call("graph", "centrality", skill_id)
    if result is not None:
        return float(result)
    return float(_degrees(skills, roles).get(skill_id, 0))


def _edges(skills: list[dict], roles: list[dict]) -> list[dict]:
    edges = []
    for skill in skills:
        for prerequisite in skill.get("prerequisites", []):
            edges.append({"source": prerequisite, "target": skill["skill_id"], "type": "prerequisite_of"})
        for related in skill.get("related", []):
            edges.append({"source": skill["skill_id"], "target": related, "type": "related_to"})
    for role in roles:
        for required in role.get("required_skills", []):
            edges.append({"source": required["skill_id"], "target": role["role_id"], "type": "required_by"})
    return edges


def _degrees(skills: list[dict], roles: list[dict]) -> dict[str, int]:
    degrees: dict[str, int] = {}
    for edge in _edges(skills, roles):
        degrees[edge["source"]] = degrees.get(edge["source"], 0) + 1
        degrees[edge["target"]] = degrees.get(edge["target"], 0) + 1
    return degrees


def _fallback_graph(skills: list[dict], roles: list[dict], focus: str | None) -> dict:
    degrees = _degrees(skills, roles)
    top = max(degrees.values(), default=1)
    edges = _edges(skills, roles)
    nodes = [
        {"id": skill["skill_id"], "label": skill["name"], "type": "skill",
         "category": skill.get("category"), "centrality": round(degrees.get(skill["skill_id"], 0) / top, 3)}
        for skill in skills
    ] + [
        {"id": role["role_id"], "label": role["title"], "type": "role", "category": "Role",
         "centrality": round(degrees.get(role["role_id"], 0) / top, 3)}
        for role in roles
    ]
    if focus:
        edges = [edge for edge in edges if focus in (edge["source"], edge["target"])]
        keep = {focus} | {edge["source"] for edge in edges} | {edge["target"] for edge in edges}
        nodes = [node for node in nodes if node["id"] in keep]
    return {"nodes": nodes, "edges": edges}


def extract_skills(text: str, skills: list[dict]) -> tuple[list[dict], str]:
    assert_clean(text)
    result = _data_call("extraction", "extract_skills", text)
    if result is not None:
        rows = _read(result, "skills", "matches") if not isinstance(result, list) else result
        matches = [
            {"skill_id": _read(row, "skill_id"), "confidence": float(_read(row, "confidence") or 0)}
            for row in rows or []
        ]
        source = "gemini" if isinstance(result, list) else _read(result, "source") or "gemini"
        return matches, source
    lowered = text.lower()
    matches = []
    for skill in skills:
        if re.search(rf"\b{re.escape(skill['name'].lower())}\b", lowered):
            matches.append({"skill_id": skill["skill_id"], "confidence": 0.75})
    return matches, "template"


def market_brief(top_skills: list[dict]) -> tuple[str, str]:
    assert_clean(top_skills)
    names = ", ".join(f"{row['name']} ({row['skill_id']})" for row in top_skills)
    fallback = f"Fastest rising skills next year: {names}." if names else "No market data yet."
    return _text_and_source(_call("narratives", "market_brief", top_skills), fallback)


def course_reason(facts: dict, fallback: str) -> tuple[str, str]:
    assert_clean(facts)
    return _text_and_source(_call("narratives", "course_reason", facts), fallback)
