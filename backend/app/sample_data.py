"""Small dummy dataset used until Harin's seed is loaded, and by the tests.

It follows the collection shapes in plan.md section 5 and includes the planted demo story.
No person names or sensitive attributes, by design.
"""

_SKILLS = [
    ("S-PY", "Python", "Programming", 0.8, [], ["S-API", "S-ML"]),
    ("S-SQL", "SQL", "Data", 0.7, [], ["S-PY"]),
    ("S-API", "REST API Design", "Programming", 0.7, ["S-PY"], ["S-CLOUD"]),
    ("S-CLOUD", "Cloud Platforms", "Infrastructure", 0.8, [], ["S-DOCK"]),
    ("S-DOCK", "Containers", "Infrastructure", 0.6, [], ["S-MLOPS"]),
    ("S-STAT", "Statistics", "Data", 0.7, [], ["S-ML"]),
    ("S-ML", "Machine Learning", "AI", 0.9, ["S-PY", "S-STAT"], ["S-MLOPS"]),
    ("S-DL", "Deep Learning", "AI", 0.8, ["S-ML"], ["S-LLM"]),
    ("S-MLOPS", "MLOps", "AI", 0.8, ["S-ML", "S-DOCK"], ["S-CLOUD"]),
    ("S-LLM", "LLM Engineering", "AI", 0.9, ["S-DL"], ["S-AGENT"]),
    ("S-AGENT", "Agentic AI", "AI", 1.0, ["S-LLM"], ["S-MLOPS"]),
    ("S-COMM", "Stakeholder Communication", "Business", 0.5, [], ["S-PM"]),
    ("S-PM", "Project Management", "Business", 0.6, [], ["S-COMM"]),
    ("S-LEG", "Legacy Reporting", "Data", 0.3, ["S-SQL"], []),
]

_ROLES = [
    ("R-BE", "Backend Engineer", {"S-PY": 4, "S-SQL": 3, "S-API": 4, "S-CLOUD": 3}, ["R-ML", "R-PM"]),
    ("R-DATA", "Data Analyst", {"S-SQL": 4, "S-STAT": 3, "S-LEG": 2, "S-COMM": 3}, ["R-ML"]),
    ("R-ML", "ML Engineer", {"S-PY": 4, "S-STAT": 3, "S-ML": 4, "S-MLOPS": 3}, ["R-AIA"]),
    ("R-AIA", "AI Architect", {"S-ML": 4, "S-LLM": 4, "S-AGENT": 4, "S-CLOUD": 3}, []),
    ("R-PM", "Delivery Manager", {"S-PM": 4, "S-COMM": 4}, []),
]

_EMPLOYEES = [
    ("E-0001", "R-BE", "Engineering", {"S-PY": 4, "S-SQL": 3, "S-API": 4, "S-CLOUD": 2}),
    ("E-0002", "R-BE", "Engineering", {"S-PY": 3, "S-SQL": 3, "S-API": 3, "S-DOCK": 3}),
    ("E-0003", "R-BE", "Engineering", {"S-PY": 4, "S-API": 3, "S-CLOUD": 3, "S-DOCK": 2}),
    ("E-0004", "R-DATA", "Data", {"S-SQL": 4, "S-STAT": 3, "S-LEG": 3, "S-COMM": 2}),
    ("E-0005", "R-DATA", "Data", {"S-SQL": 3, "S-STAT": 2, "S-LEG": 4, "S-COMM": 3}),
    ("E-0006", "R-ML", "Data", {"S-PY": 4, "S-STAT": 4, "S-ML": 4, "S-MLOPS": 2, "S-DL": 3}),
    ("E-0007", "R-BE", "Engineering",
     {"S-PY": 5, "S-SQL": 4, "S-API": 4, "S-CLOUD": 3, "S-STAT": 3, "S-ML": 3, "S-MLOPS": 2}),
    ("E-0008", "R-ML", "Engineering", {"S-PY": 4, "S-ML": 3, "S-STAT": 3, "S-DOCK": 3}),
    ("E-0009", "R-PM", "Delivery", {"S-PM": 4, "S-COMM": 4}),
    ("E-0010", "R-AIA", "Data",
     {"S-ML": 5, "S-DL": 4, "S-LLM": 4, "S-AGENT": 5, "S-CLOUD": 3}),
    ("E-0011", "R-PM", "Delivery", {"S-PM": 3, "S-COMM": 4, "S-SQL": 2}),
    ("E-0012", "R-DATA", "Data", {"S-SQL": 4, "S-LEG": 2, "S-COMM": 3, "S-STAT": 3}),
]

_COURSES = [
    ("C-01", "Cloud Foundations", ["S-CLOUD"], 2, 16, False),
    ("C-02", "Certified Cloud Practitioner", ["S-CLOUD"], 3, 24, True),
    ("C-03", "Applied Machine Learning", ["S-ML"], 3, 30, False),
    ("C-04", "Advanced Machine Learning", ["S-ML"], 4, 36, False),
    ("C-05", "MLOps in Production", ["S-MLOPS"], 3, 24, True),
    ("C-06", "Deep Learning Essentials", ["S-DL"], 3, 30, False),
    ("C-07", "Building with LLMs", ["S-LLM"], 4, 24, False),
    ("C-08", "Agentic AI Systems", ["S-AGENT"], 4, 20, True),
    ("C-09", "Statistics for Practitioners", ["S-STAT"], 3, 20, False),
    ("C-10", "API Design Workshop", ["S-API"], 4, 12, False),
    ("C-11", "Executive Communication", ["S-COMM"], 4, 10, False),
    ("C-12", "Delivery Leadership", ["S-PM", "S-COMM"], 4, 18, True),
]

_OPEN_ROLES = [
    ("OR-01", "R-ML", "Data"),
    ("OR-02", "R-AIA", "Engineering"),
    ("OR-03", "R-PM", "Delivery"),
]

# (latest demand in FTE, quarterly growth, trend status)
_DEMAND = {
    "S-PY": (7.0, 0.02, "stable"), "S-SQL": (6.0, 0.00, "stable"),
    "S-API": (4.0, 0.01, "stable"), "S-CLOUD": (5.0, 0.04, "emerging"),
    "S-DOCK": (3.0, 0.02, "stable"), "S-STAT": (4.0, 0.01, "stable"),
    "S-ML": (4.0, 0.06, "emerging"), "S-DL": (2.5, 0.05, "emerging"),
    "S-MLOPS": (3.0, 0.08, "emerging"), "S-LLM": (3.0, 0.14, "emerging"),
    "S-AGENT": (2.5, 0.22, "emerging"), "S-COMM": (4.0, 0.00, "stable"),
    "S-PM": (3.0, 0.00, "stable"), "S-LEG": (3.0, -0.08, "declining"),
}

_QUARTERS = [f"{year} Q{q}" for year in (2024, 2025, 2026) for q in (1, 2, 3, 4)][2:-1]
_FUTURE = ["2026 Q4", "2027 Q1", "2027 Q2", "2027 Q3"]


def _evidence(level: int) -> list[dict]:
    return [
        {"source": "manager", "level": level, "date": "2026-06-01"},
        {"source": "project", "level": level, "date": "2026-03-01"},
        {"source": "self", "level": min(5, level + 1), "date": "2025-12-01"},
    ]


def _market_rows() -> tuple[list[dict], list[dict]]:
    signals, forecasts = [], []
    for skill_id, (latest, growth, status) in _DEMAND.items():
        history = []
        for index, quarter in enumerate(_QUARTERS):
            back = len(_QUARTERS) - 1 - index
            demand = round(latest / (1 + growth) ** back, 2)
            history.append({"quarter": quarter, "demand_fte": demand})
            signals.append({
                "skill_id": skill_id,
                "quarter": quarter,
                "demand_fte": demand,
                "job_postings_index": round(100 * (1 + growth * 1.2) ** index, 1),
            })
        forecast = [round(latest * (1 + growth) ** step, 2) for step in range(1, 5)]
        forecasts.append({
            "skill_id": skill_id,
            "history": history,
            "quarters": _FUTURE,
            "forecast": forecast,
            "low": [round(value * (1 - 0.04 * step), 2) for step, value in enumerate(forecast, 1)],
            "high": [round(value * (1 + 0.04 * step), 2) for step, value in enumerate(forecast, 1)],
            "trend_status": status,
            "factors": [
                {"name": "Recent demand change", "contribution": round(growth, 3)},
                {"name": "Job posting growth", "contribution": round(growth * 0.6, 3)},
                {"name": "Rolling average", "contribution": round(0.01 - growth * 0.1, 3)},
            ],
        })
    return signals, forecasts


def build() -> dict[str, list[dict]]:
    signals, forecasts = _market_rows()
    return {
        "skills": [
            {"skill_id": sid, "name": name, "category": category, "criticality": criticality,
             "prerequisites": prerequisites, "related": related}
            for sid, name, category, criticality, prerequisites, related in _SKILLS
        ],
        "roles": [
            {"role_id": rid, "title": title,
             "required_skills": [{"skill_id": sid, "level": lvl} for sid, lvl in required.items()],
             "next_roles": next_roles}
            for rid, title, required, next_roles in _ROLES
        ],
        "employees": [
            {"employee_id": eid, "role_id": rid, "department": department,
             "skills": [{"skill_id": sid, "evidence": _evidence(lvl)} for sid, lvl in skills.items()],
             "learning": [], "projects": []}
            for eid, rid, department, skills in _EMPLOYEES
        ],
        "courses": [
            {"course_id": cid, "title": title, "skills_taught": taught, "level": level,
             "hours": hours, "is_certification": certification}
            for cid, title, taught, level, hours, certification in _COURSES
        ],
        "open_roles": [
            {"open_role_id": oid, "role_id": rid, "department": department}
            for oid, rid, department in _OPEN_ROLES
        ],
        "market_signals": signals,
        "forecasts": forecasts,
        "model_runs": [{
            "version": "sample-0", "trained_at": "2026-10-01T00:00:00+00:00",
            "model_mape": 6.4, "naive_mape": 9.8, "win_rate": 0.71,
        }],
        "reviews": [],
        "audit_log": [],
        "llm_cache": [],
    }
