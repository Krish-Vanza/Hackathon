"""Market trends, stored forecasts, future gaps and readiness (FR-02, FR-03, FR-04).

The API only reads forecasts stored by Harin's training job. It never trains in a request.
"""
from app import ai_bridge, store
from app.schemas import explain
from app.services import context, learning, reviews, scoring
from app.services.context import Context


def _status_from_growth(growth: float) -> str:
    if growth >= 0.10:
        return "emerging"
    return "declining" if growth <= -0.05 else "stable"


def market_trends() -> list[dict]:
    ctx = context.load()
    history: dict[str, list[dict]] = {}
    for row in store.find("market_signals"):
        history.setdefault(row["skill_id"], []).append(row)

    trends = []
    for skill_id, rows in history.items():
        rows.sort(key=lambda row: row["quarter"])
        latest, earlier = rows[-1], rows[-5] if len(rows) >= 5 else rows[0]
        growth = scoring.demand_growth(earlier["demand_fte"], latest["demand_fte"])
        status = ctx.forecasts.get(skill_id, {}).get("trend_status") or _status_from_growth(growth)
        trends.append({
            "skill_id": skill_id,
            "name": ctx.skill_name(skill_id),
            "category": ctx.skills.get(skill_id, {}).get("category", "Other"),
            "demand_fte": latest["demand_fte"],
            "job_postings_index": latest.get("job_postings_index"),
            "yoy_growth": round(growth, 3),
            "status": status,
        })
    return sorted(trends, key=lambda row: row["yoy_growth"], reverse=True)


def _confidence(forecast: dict) -> float:
    values = forecast.get("forecast") or []
    if not values:
        return 0.0
    spreads = [
        (high - low) / (2 * value)
        for low, high, value in zip(forecast.get("low", []), forecast.get("high", []), values)
        if value > 0
    ]
    return scoring.clamp(1 - sum(spreads) / len(spreads)) if spreads else 0.5


def _factors(forecast: dict) -> list[dict]:
    """Turn stored coefficient contributions into Factor rows with weights that sum to 1."""
    rows = []
    for factor in forecast.get("factors") or []:
        contribution = factor.get("contribution", factor.get("weight", 0.0))
        rows.append((factor.get("name", "Feature"), float(contribution)))
    total = sum(abs(value) for _, value in rows) or 1.0
    return [
        {"name": name, "value": f"{value:+.3f}", "weight": round(abs(value) / total, 3),
         "direction": "up" if value >= 0 else "down"}
        for name, value in rows
    ]


def _summary_row(ctx: Context, skill_id: str) -> dict:
    forecast = ctx.forecasts[skill_id]
    return {
        "skill_id": skill_id,
        "name": ctx.skill_name(skill_id),
        "current_demand": ctx.current_demand(skill_id),
        "forecast_demand": ctx.future_demand(skill_id),
        "growth": round(ctx.growth(skill_id), 3),
        "trend_status": forecast.get("trend_status", "stable"),
    }


def top_rising(top: int) -> list[dict]:
    ctx = context.load()
    rows = [_summary_row(ctx, skill_id) for skill_id in ctx.forecasts]
    return sorted(rows, key=lambda row: row["growth"], reverse=True)[:top]


def market_brief() -> dict:
    rising = top_rising(5)
    facts = [{key: row[key] for key in ("skill_id", "name", "growth", "trend_status")} for row in rising]
    text, source = ai_bridge.market_brief(facts)
    return {
        "brief": text,
        "skills": facts,
        "explanation": explain(
            text,
            [{"name": row["name"], "value": f"{row['growth']:+.0%} over four quarters",
              "weight": scoring.growth_score(abs(row["growth"])),
              "direction": "up" if row["growth"] >= 0 else "down"} for row in facts],
            0.7, "Summary of stored forecasts", source,
        ),
    }


def skill_forecast(skill_id: str) -> dict:
    ctx = context.load()
    forecast = ctx.forecast(skill_id)
    row = _summary_row(ctx, skill_id)
    flag = reviews.get_decision("forecast_flag", skill_id, skill_id)
    return {
        **row,
        "history": forecast.get("history", []),
        "quarters": forecast.get("quarters", []),
        "forecast": forecast.get("forecast", []),
        "low": forecast.get("low", []),
        "high": forecast.get("high", []),
        "flag": reviews.status_fields(flag) if flag else None,
        "explanation": explain(
            f"{row['name']} demand moves {row['growth']:+.0%} over four quarters "
            f"to {row['forecast_demand']:.1f} FTE.",
            _factors(forecast), _confidence(forecast), "Ridge forecast", "model",
        ),
    }


def accuracy() -> dict:
    runs = sorted(store.find("model_runs"), key=lambda run: run.get("trained_at", ""))
    if not runs:
        return {"available": False, "note": "No training run stored yet."}
    return {
        **runs[-1],
        "available": True,
        "beats_naive": runs[-1]["model_mape"] < runs[-1]["naive_mape"],
        "note": "Backtest on dummy data, not real workforce data.",
    }


def flag(skill_id: str, reason: str) -> dict:
    detail = skill_forecast(skill_id)
    return reviews.submit_for_review(
        "forecast_flag", skill_id, skill_id, f"Forecast flagged: {detail['name']}",
        {"skill_id": skill_id, "reason": reason, "forecast_demand": detail["forecast_demand"]},
        detail["explanation"],
    )


def gap_table(ctx: Context) -> list[dict]:
    rows = []
    for skill_id in ctx.forecasts:
        demand = ctx.future_demand(skill_id)
        supply = len(ctx.holders(skill_id, scoring.QUALIFIED_LEVEL))
        projected = scoring.project_supply(supply)
        gap = scoring.future_gap(demand, supply)
        rows.append({
            "skill_id": skill_id,
            "name": ctx.skill_name(skill_id),
            "current_demand": ctx.current_demand(skill_id),
            "forecast_demand": round(demand, 2),
            "current_supply": supply,
            "projected_supply": round(projected, 2),
            "future_gap": gap,
            "explanation": explain(
                f"Forecast demand of {demand:.1f} FTE against {projected:.1f} projected qualified staff.",
                [{"name": "Forecast demand", "value": f"{demand:.1f} FTE", "weight": 0.5, "direction": "up"},
                 {"name": "Projected supply", "value": f"{projected:.1f} after 3% quarterly attrition",
                  "weight": 0.5, "direction": "down"}],
                _confidence(ctx.forecasts[skill_id]), "Forecast demand minus projected supply", "rules",
            ),
        })
    return sorted(rows, key=lambda row: row["future_gap"], reverse=True)


def future_gaps() -> list[dict]:
    return gap_table(context.load())


def _plan_gains(ctx: Context) -> dict[str, float]:
    """Expected extra qualified staff per skill if recommended plans run.

    A course at level L is assumed to bring a learner to L, with 70% completing.
    """
    gains: dict[str, float] = {}
    for employee_id in ctx.employees:
        for course in learning.recommended_courses(ctx, employee_id):
            if course["level"] < scoring.QUALIFIED_LEVEL:
                continue
            for skill_id in course["skills_taught"]:
                if ctx.levels(employee_id).get(skill_id, 0.0) < scoring.QUALIFIED_LEVEL:
                    gains[skill_id] = gains.get(skill_id, 0.0) + scoring.PLAN_COMPLETION_RATE
    return gains


def readiness() -> dict:
    ctx = context.load()
    table = gap_table(ctx)
    gains = _plan_gains(ctx)
    now = scoring.readiness_index([(row["current_demand"], row["current_supply"]) for row in table])
    no_action = scoring.readiness_index([(row["forecast_demand"], row["projected_supply"]) for row in table])
    with_plans = scoring.readiness_index([
        (row["forecast_demand"], row["projected_supply"] + gains.get(row["skill_id"], 0.0))
        for row in table
    ])
    return {
        "now": now,
        "no_action": no_action,
        "with_plans": with_plans,
        "explanation": explain(
            f"Readiness is {now}% now, {no_action}% in four quarters with no action, "
            f"and {with_plans}% with recommended plans.",
            [{"name": "Attrition", "value": "3% per quarter", "weight": 0.5, "direction": "down"},
             {"name": "Recommended plans", "value": "70% assumed completion", "weight": 0.5, "direction": "up"}],
            0.7, "Demand-weighted coverage, capped per skill", "rules",
        ),
    }
