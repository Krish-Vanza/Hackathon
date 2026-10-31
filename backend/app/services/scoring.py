"""Pure scoring formulas from plan.md section 8. No database access, so tests stay simple."""
from datetime import date
from graphlib import CycleError, TopologicalSorter

EVIDENCE_WEIGHTS = {"manager": 0.4, "project": 0.3, "certification": 0.2, "self": 0.1}
STALE_DAYS = 548  # 18 months
QUALIFIED_LEVEL = 3
EXPERT_LEVEL = 4
ATTRITION_PER_QUARTER = 0.03
HOURS_PER_WEEK = 6
PLAN_COMPLETION_RATE = 0.7
GROWTH_AT_FULL_SCORE = 0.5


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _is_stale(raw_date, today: date) -> bool:
    if not raw_date:
        return False
    return (today - date.fromisoformat(str(raw_date)[:10])).days > STALE_DAYS


def effective_level(evidence: list[dict], today: date | None = None) -> float:
    """Weighted evidence level, 0-5.

    A source's weight is shared across its entries. Stale entries count at half weight,
    and the result renormalizes over whatever evidence is present.
    """
    today = today or date.today()
    usable = [item for item in evidence if item.get("source") in EVIDENCE_WEIGHTS]
    counts: dict[str, int] = {}
    for item in usable:
        counts[item["source"]] = counts.get(item["source"], 0) + 1

    total_weight = weighted_sum = 0.0
    for item in usable:
        weight = EVIDENCE_WEIGHTS[item["source"]] / counts[item["source"]]
        if _is_stale(item.get("date"), today):
            weight *= 0.5
        total_weight += weight
        weighted_sum += weight * float(item.get("level", 0))
    if total_weight == 0:
        return 0.0
    return round(clamp(weighted_sum / total_weight, 0, 5), 2)


def evidence_strength(evidence: list[dict]) -> float:
    """Share of the evidence weight that this skill actually has, 0-1."""
    sources = {item.get("source") for item in evidence}
    return round(sum(EVIDENCE_WEIGHTS.get(source, 0) for source in sources), 2)


def gap_severity(required: float, effective: float, criticality: float) -> float:
    return round(max(0.0, required - effective) * criticality, 3)


def project_supply(supply: float, quarters: int = 4) -> float:
    return supply * (1 - ATTRITION_PER_QUARTER) ** quarters


def future_gap(demand: float, supply: float, quarters: int = 4) -> float:
    return round(demand - project_supply(supply, quarters), 2)


def demand_growth(current: float, future: float) -> float:
    return (future - current) / current if current > 0 else 0.0


def growth_score(growth: float) -> float:
    """Map growth to 0-1, where 50% growth or more scores 1."""
    return clamp(growth / GROWTH_AT_FULL_SCORE)


def risk_score(shortage: float, concentration: float, growth: float, centrality: float) -> float:
    """All inputs are 0-100, and so is the result."""
    parts = [clamp(value, 0, 100) for value in (shortage, concentration, growth, centrality)]
    return round(0.40 * parts[0] + 0.25 * parts[1] + 0.20 * parts[2] + 0.15 * parts[3], 1)


def risk_level(score: float) -> str:
    if score >= 70:
        return "high"
    return "medium" if score >= 40 else "low"


def readiness_index(rows: list[tuple[float, float]]) -> float:
    """Percent of demand covered by supply, capped per skill. Rows are (demand, supply)."""
    total = sum(demand for demand, _ in rows)
    if total <= 0:
        return 0.0
    covered = sum(min(demand, supply) for demand, supply in rows)
    return round(100 * covered / total, 1)


def course_score(gap_coverage: float, future_demand: float, level_fit: float) -> float:
    return round(0.5 * gap_coverage + 0.3 * future_demand + 0.2 * level_fit, 3)


def level_fit(course_level: float, target_level: float) -> float:
    return clamp(1 - abs(course_level - target_level) / 4)


def role_readiness(levels: dict[str, float], required: list[dict], criticality: dict[str, float]) -> float:
    """Criticality-weighted share of required levels already met, 0-1."""
    needed = met = 0.0
    for item in required:
        weight = criticality.get(item["skill_id"], 1.0)
        needed += item["level"] * weight
        met += min(levels.get(item["skill_id"], 0.0), item["level"]) * weight
    return round(met / needed, 3) if needed else 0.0


def bridge_weeks(hours: float) -> float:
    return round(hours / HOURS_PER_WEEK, 1)


def order_by_prerequisites(courses: list[dict], prerequisites: dict[str, list[str]]) -> list[dict]:
    """Put a course after any course teaching one of its prerequisites. Keeps score order otherwise."""
    position = {course["course_id"]: index for index, course in enumerate(courses)}
    teachers: dict[str, list[str]] = {}
    for course in courses:
        for skill_id in course["skills_taught"]:
            teachers.setdefault(skill_id, []).append(course["course_id"])

    sorter = TopologicalSorter()
    for course in courses:
        before = set()
        for skill_id in course["skills_taught"]:
            for prerequisite in prerequisites.get(skill_id, []):
                before.update(teachers.get(prerequisite, []))
        before.discard(course["course_id"])
        sorter.add(course["course_id"], *before)

    try:
        sorter.prepare()
    except CycleError:
        return courses
    ready, ordered = [], []
    while sorter.is_active():
        ready = sorted([*ready, *sorter.get_ready()], key=position.__getitem__)
        ordered.append(ready.pop(0))
        sorter.done(ordered[-1])
    by_id = {course["course_id"]: course for course in courses}
    return [by_id[course_id] for course_id in ordered]
