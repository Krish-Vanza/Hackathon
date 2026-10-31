"""Workforce Analytics Report data, as JSON and CSV."""
import csv
import io
from datetime import datetime, timezone

from app import store
from app.services import context, forecasts, reviews, risk


def _pipeline() -> dict:
    counts = {status: 0 for status in reviews.STATUS_LABELS}
    for review in reviews.list_reviews(type="mobility"):
        counts[review["status"]] += 1
    return counts


def workforce() -> dict:
    ctx = context.load()
    gaps = forecasts.gap_table(ctx)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_source": store.backend_name(),
        "note": "Generated from dummy data.",
        "readiness": forecasts.readiness(),
        "top_gaps": [row for row in gaps if row["future_gap"] > 0][:10],
        "top_risks": risk.risk_table(ctx)[:10],
        "mobility_pipeline": _pipeline(),
        "accuracy": forecasts.accuracy(),
    }


def workforce_csv() -> str:
    report = workforce()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["Workforce Analytics Report", report["generated_at"]])
    writer.writerow([report["note"]])
    writer.writerow([])
    writer.writerow(["Readiness", "Percent"])
    for label, key in (("Now", "now"), ("No action", "no_action"), ("With plans", "with_plans")):
        writer.writerow([label, report["readiness"][key]])
    writer.writerow([])
    writer.writerow(["Skill ID", "Skill", "Forecast demand", "Projected supply", "Future gap"])
    for row in report["top_gaps"]:
        writer.writerow([row["skill_id"], row["name"], row["forecast_demand"], row["projected_supply"], row["future_gap"]])
    writer.writerow([])
    writer.writerow(["Skill ID", "Skill", "Risk score", "Risk level"])
    for row in report["top_risks"]:
        writer.writerow([row["skill_id"], row["name"], row["score"], row["level"]])
    writer.writerow([])
    writer.writerow(["Mobility status", "Count"])
    for status, count in report["mobility_pipeline"].items():
        writer.writerow([status, count])
    return out.getvalue()
