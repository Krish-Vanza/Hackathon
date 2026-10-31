"""Generate the shared dummy dataset and load it into MongoDB.

Run from `backend/`:
    python -m seed.generate_seed           # loads only into an empty database
    python -m seed.generate_seed --reset   # erases seed data, reviews and audit log first

Only Harin runs `--reset`, because it wipes the shared database.
The output is identical on every machine because the random seed is fixed.
"""

import argparse
import sys
from datetime import date, timedelta

import numpy as np

from app import db as dbm
from seed import catalog as cat

SEED = 42
REFERENCE_DATE = date(2026, 9, 30)  # end of the last quarter in the market data

DEPARTMENT_SIZES = {
    "Product Engineering": 14,
    "Data & AI": 14,
    "Cloud Platform": 12,
    "Digital Services": 12,
    "Cyber Security": 8,
}

PROJECT_NAMES = [
    "Claims Portal Revamp", "Payments API Migration", "Customer 360 Lakehouse",
    "Fraud Signal Pipeline", "Cloud Landing Zone", "Kubernetes Platform Upgrade",
    "Support Chatbot Pilot", "Supplier Risk Dashboard", "Zero Trust Rollout",
    "Mobile Banking Refresh", "Demand Planning Model", "Document AI Intake",
    "Contract Review Agent", "Observability Stack", "Data Quality Monitor",
]

OPEN_ROLE_ROWS = [
    ("OR-01", "R-05", "Product Engineering"),
    ("OR-02", "R-09", "Digital Services"),
    ("OR-03", "R-09", "Data & AI"),
    ("OR-04", "R-04", "Data & AI"),
    ("OR-05", "R-06", "Cloud Platform"),
    ("OR-06", "R-07", "Cloud Platform"),
    ("OR-07", "R-08", "Cyber Security"),
    ("OR-08", "R-02", "Digital Services"),
]


def _iso(d: date) -> str:
    return d.isoformat()


def _skills():
    return [
        {
            "skill_id": sid,
            "name": name,
            "category": category,
            "criticality": crit,
            "prerequisites": prereqs,
            "related": related,
            "aliases": aliases,
        }
        for sid, name, category, crit, prereqs, related, aliases, _profile in cat.SKILL_ROWS
    ]


def _roles():
    return [
        {
            "role_id": rid,
            "title": title,
            "required_skills": [{"skill_id": s, "level": lvl} for s, lvl in req.items()],
            "next_roles": nxt,
        }
        for rid, title, req, nxt in cat.ROLE_ROWS
    ]


def _courses():
    return [
        {
            "course_id": cid,
            "title": title,
            "skills_taught": [{"skill_id": s, "to_level": lvl} for s, lvl in taught],
            "level": max(lvl for _, lvl in taught),
            "hours": hours,
            "is_certification": cert,
        }
        for cid, title, taught, hours, cert in cat.COURSE_ROWS
    ]


def _open_roles():
    titles = {rid: title for rid, title, _, _ in cat.ROLE_ROWS}
    return [
        {"open_role_id": oid, "role_id": rid, "title": titles[rid], "department": dept, "openings": 1}
        for oid, rid, dept in OPEN_ROLE_ROWS
    ]


def _evidence(rng, level: int) -> list[dict]:
    """Evidence for one skill. The self rating is slightly inflated on purpose."""

    def when(max_days=900):
        return _iso(REFERENCE_DATE - timedelta(days=int(rng.integers(20, max_days))))

    clip = lambda v: int(min(5, max(1, v)))
    items = [{"source": "self", "level": clip(level + rng.integers(0, 2)), "date": when(400)}]
    if rng.random() < 0.7:
        items.append({"source": "manager", "level": clip(level), "date": when()})
    if rng.random() < 0.5:
        items.append({"source": "project", "level": clip(level + rng.integers(-1, 2)), "date": when()})
    if level >= 3 and rng.random() < 0.2:
        items.append({"source": "certification", "level": clip(level), "date": when()})
    return items


def _employee_levels(rng, role_id: str, department: str) -> dict[str, int]:
    required = dict(next(r[2] for r in cat.ROLE_ROWS if r[0] == role_id))
    levels = {s: int(np.clip(lvl + rng.integers(-2, 2), 1, 5)) for s, lvl in required.items()}
    extras = rng.choice([s for s in cat.SKILL_IDS if s not in levels], size=int(rng.integers(3, 6)), replace=False)
    for s in extras:
        levels[str(s)] = int(rng.integers(1, 4))
    # Agentic AI is scarce: only the planted expert and a few Data & AI people go past level 2.
    if cat.AGENTIC_AI in levels:
        cap = 4 if department == "Data & AI" else 2
        levels[cat.AGENTIC_AI] = min(levels[cat.AGENTIC_AI], cap)
    return levels


def _planted_levels(employee_id: str) -> dict[str, int]:
    if employee_id == cat.MOBILITY_STAR:
        # Backend Engineer with strong ML skills from side projects.
        return {
            "S-001": 5, "S-005": 3, "S-006": 4, "S-007": 3, "S-008": 4, "S-009": 3, "S-015": 3,
            "S-022": 4, "S-023": 4, "S-024": 3, "S-011": 4, "S-030": 2,
        }
    if employee_id == cat.SINGLE_EXPERT_EMPLOYEE:
        return {
            "S-001": 4, "S-026": 5, "S-027": 4, "S-028": 5, "S-029": 4, "S-006": 3, "S-037": 3,
            "S-023": 3,
        }
    return {}


def _employees(rng, courses: list[dict]):
    employees = []
    n = 0
    for department, size in DEPARTMENT_SIZES.items():
        for i in range(size):
            n += 1
            eid = f"E-{n:04d}"
            if eid == cat.MOBILITY_STAR:
                department_used, role_id = "Product Engineering", "R-01"
            elif eid == cat.SINGLE_EXPERT_EMPLOYEE:
                department_used, role_id = cat.SINGLE_EXPERT_DEPARTMENT, "R-09"
            else:
                department_used = department
                pool = cat.DEPARTMENT_ROLES[department]
                if department == cat.SINGLE_EXPERT_DEPARTMENT:
                    pool = [r for r in pool if r != "R-09"]  # keep the single-expert story true
                role_id = pool[i % len(pool)]
            levels = _planted_levels(eid) or _employee_levels(rng, role_id, department_used)

            skills = [{"skill_id": s, "evidence": _evidence(rng, lvl)} for s, lvl in sorted(levels.items())]
            if eid == cat.MOBILITY_STAR:
                for item in skills:  # strong, recent manager evidence for the ML skills
                    if item["skill_id"] in ("S-022", "S-023", "S-024", "S-011"):
                        item["evidence"].append(
                            {"source": "manager", "level": levels[item["skill_id"]], "date": "2026-07-15"}
                        )

            relevant = [c for c in courses if any(t["skill_id"] in levels for t in c["skills_taught"])]
            picks = rng.choice(len(relevant), size=min(len(relevant), int(rng.integers(1, 4))), replace=False)
            learning = []
            for k in picks:
                done = rng.random() < 0.7
                learning.append({
                    "course_id": relevant[int(k)]["course_id"],
                    "status": "completed" if done else "in_progress",
                    "completed_at": _iso(REFERENCE_DATE - timedelta(days=int(rng.integers(30, 700)))) if done else None,
                })

            projects = []
            for _ in range(int(rng.integers(1, 4))):
                pidx = int(rng.integers(0, len(PROJECT_NAMES)))
                used = rng.choice(sorted(levels), size=min(3, len(levels)), replace=False)
                projects.append({
                    "project_id": f"P-{pidx + 1:03d}",
                    "title": PROJECT_NAMES[pidx],
                    "skills": sorted(str(s) for s in used),
                    "end_date": _iso(REFERENCE_DATE - timedelta(days=int(rng.integers(0, 800)))),
                })

            employees.append({
                "employee_id": eid,
                "role_id": role_id,
                "department": department_used,
                "skills": skills,
                "learning": learning,
                "projects": projects,
            })
    return employees


def _growth_path(rng, profile: str, skill_id: str, n: int) -> np.ndarray:
    """Quarterly demand growth rates for one skill, n + 1 values."""
    t = np.linspace(0, 1, n + 1)
    if skill_id == cat.AGENTIC_AI:
        mean = 0.02 + 0.22 * t**1.5  # sharp, accelerating rise
    elif profile == "emerging":
        mean = 0.02 + rng.uniform(0.08, 0.14) * t**1.5
    elif profile == "rising":
        mean = np.full(n + 1, rng.uniform(0.025, 0.05))
    elif profile == "declining":
        mean = np.full(n + 1, rng.uniform(-0.045, -0.02))
    else:
        mean = np.full(n + 1, rng.uniform(-0.005, 0.012))
    noise = np.zeros(n + 1)
    for i in range(1, n + 1):  # AR(1) noise, so growth has momentum
        noise[i] = 0.5 * noise[i - 1] + rng.normal(0, 0.02)
    return mean + noise


def _market_signals(rng):
    quarters = cat.quarter_seq()
    n = len(quarters)
    rows = []
    for sid, _name, _category, crit, _p, _r, _a, profile in cat.SKILL_ROWS:
        g = _growth_path(rng, profile, sid, n)
        if profile == "emerging":
            demand = rng.uniform(5, 15)
        elif profile == "declining":
            demand = rng.uniform(60, 120)
        else:
            demand = 30 + 120 * crit * rng.uniform(0.6, 1.2)
        index = 100.0
        for i, quarter in enumerate(quarters):
            if i > 0:
                demand *= 1 + g[i] + rng.normal(0, 0.025)
            # Job postings lead hiring by about a quarter, so they move with next quarter's growth.
            index *= 1 + g[i + 1] + rng.normal(0, 0.02) if i > 0 else 1
            rows.append({
                "skill_id": sid,
                "quarter": quarter,
                "demand_fte": round(float(demand), 2),
                "job_postings_index": round(float(index), 2),
            })
    return rows


def build_dataset(seed: int = SEED) -> dict[str, list[dict]]:
    """Return every seed collection as plain dicts. Pure, so tests need no database."""
    rng = np.random.default_rng(seed)
    courses = _courses()
    return {
        dbm.SKILLS: _skills(),
        dbm.ROLES: _roles(),
        dbm.COURSES: courses,
        dbm.OPEN_ROLES: _open_roles(),
        dbm.EMPLOYEES: _employees(rng, courses),
        dbm.MARKET_SIGNALS: _market_signals(rng),
    }


def load(db, reset: bool = False) -> dict[str, int]:
    if reset:
        for name in dbm.SEED_COLLECTIONS + [dbm.FORECASTS, dbm.MODEL_RUNS, dbm.REVIEWS, dbm.AUDIT_LOG]:
            db[name].drop()
    elif any(db[name].estimated_document_count() for name in dbm.SEED_COLLECTIONS):
        raise SystemExit("Seed data already exists. Use --reset to replace it (Harin only).")

    data = build_dataset()
    from app.ai.guard import assert_clean

    assert_clean(data[dbm.EMPLOYEES])
    dbm.ensure_indexes(db)
    counts = {}
    for name, docs in data.items():
        db[name].insert_many([dict(d) for d in docs])  # copy, as insert_many adds _id
        counts[name] = len(docs)
    return counts


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(description="Load the dummy dataset into MongoDB.")
    parser.add_argument("--reset", action="store_true", help="erase seed data, forecasts, reviews and audit log first")
    args = parser.parse_args(argv)
    counts = load(dbm.get_db(), reset=args.reset)
    for name, count in counts.items():
        print(f"{name:16} {count}")
    print("Done. Next: python -m ml.train_forecast")


if __name__ == "__main__":
    sys.exit(main())
