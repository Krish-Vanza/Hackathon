"""Workforce risk per skill (FR-07)."""
from app import ai_bridge
from app.schemas import explain
from app.services import context, scoring
from app.services.context import Context
from app.services.forecasts import gap_table


def _concentration(ctx: Context, skill_id: str) -> tuple[float, list[str]]:
    """Percent of departments needing the skill that rest on one expert or none."""
    needing = set()
    for employee in ctx.employees.values():
        role = ctx.roles.get(employee["role_id"], {})
        if any(item["skill_id"] == skill_id for item in role.get("required_skills", [])):
            needing.add(employee["department"])
    if not needing:
        return 0.0, []

    experts: dict[str, int] = {}
    for employee_id in ctx.holders(skill_id, scoring.EXPERT_LEVEL):
        department = ctx.employees[employee_id]["department"]
        experts[department] = experts.get(department, 0) + 1
    exposed = sorted(department for department in needing if experts.get(department, 0) <= 1)
    return 100 * len(exposed) / len(needing), exposed


def risk_table(ctx: Context) -> list[dict]:
    skills, roles = list(ctx.skills.values()), list(ctx.roles.values())
    gaps = gap_table(ctx)
    centrality = {row["skill_id"]: ai_bridge.centrality(row["skill_id"], skills, roles) for row in gaps}
    top_centrality = max(centrality.values(), default=0.0) or 1.0

    rows = []
    for gap in gaps:
        skill_id = gap["skill_id"]
        demand = gap["forecast_demand"]
        shortage = 100 * max(0.0, gap["future_gap"]) / demand if demand > 0 else 0.0
        concentration, exposed = _concentration(ctx, skill_id)
        growth = 100 * scoring.growth_score(ctx.growth(skill_id))
        central = 100 * centrality[skill_id] / top_centrality
        score = scoring.risk_score(shortage, concentration, growth, central)
        rows.append({
            "skill_id": skill_id,
            "name": gap["name"],
            "score": score,
            "level": scoring.risk_level(score),
            "shortage": round(shortage, 1),
            "concentration": round(concentration, 1),
            "market_growth": round(growth, 1),
            "centrality": round(central, 1),
            "exposed_departments": exposed,
            "explanation": explain(
                f"{gap['name']} scores {score} out of 100: forecast demand {demand:.1f} FTE "
                f"against {gap['projected_supply']:.1f} projected qualified staff.",
                [{"name": "Shortage", "value": f"{shortage:.0f}% of demand unmet",
                  "weight": 0.40, "direction": "up" if shortage else "down"},
                 {"name": "Concentration",
                  "value": f"Single expert or none in: {', '.join(exposed) or 'no department'}",
                  "weight": 0.25, "direction": "up" if concentration else "down"},
                 {"name": "Market growth", "value": f"{ctx.growth(skill_id):+.0%} over four quarters",
                  "weight": 0.20, "direction": "up" if growth else "down"},
                 {"name": "Graph centrality", "value": f"{central:.0f} of 100",
                  "weight": 0.15, "direction": "up" if central else "down"}],
                gap["explanation"]["confidence"], "Weighted risk score", "rules",
            ),
        })
    return sorted(rows, key=lambda row: row["score"], reverse=True)


def risks() -> list[dict]:
    return risk_table(context.load())
