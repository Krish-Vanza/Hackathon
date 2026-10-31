"""Check that the shared database is seeded and the forecast model has run.

Run from `backend/`:
    python -m seed.check
"""

import sys

from app import db as dbm
from app.ai.guard import assert_clean

EXPECTED = {
    dbm.SKILLS: 40,
    dbm.ROLES: 10,
    dbm.EMPLOYEES: 60,
    dbm.COURSES: 30,
    dbm.OPEN_ROLES: 8,
    dbm.MARKET_SIGNALS: 800,
    dbm.FORECASTS: 40,
}


def run_checks(db) -> list[str]:
    problems = []
    for name, expected in EXPECTED.items():
        count = db[name].count_documents({})
        if count != expected:
            problems.append(f"{name}: {count} documents, expected {expected}")

    try:
        assert_clean(list(db[dbm.EMPLOYEES].find({}, {"_id": 0})))
    except ValueError as exc:
        problems.append(str(exc))

    run = db[dbm.MODEL_RUNS].find_one({}, {"_id": 0}, sort=[("trained_at", -1)])
    if not run:
        problems.append("model_runs is empty. Run: python -m ml.train_forecast")

    bad_len = db[dbm.FORECASTS].count_documents({"forecast.3": {"$exists": False}})
    if bad_len:
        problems.append(f"{bad_len} forecasts have fewer than 4 quarters")
    return problems


def main() -> int:
    db = dbm.get_db()
    for name in EXPECTED:
        print(f"{name:16} {db[name].count_documents({})}")
    run = db[dbm.MODEL_RUNS].find_one({}, {"_id": 0}, sort=[("trained_at", -1)])
    if run:
        print(f"model {run['version']}: MAPE {run['model_mape']}% vs naive {run['naive_mape']}%, win rate {run['win_rate']}")
    problems = run_checks(db)
    for p in problems:
        print("FAIL", p)
    print("All checks passed." if not problems else f"{len(problems)} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
