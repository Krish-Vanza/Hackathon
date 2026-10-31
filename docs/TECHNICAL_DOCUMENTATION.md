# Technical Documentation

## Backend (Harshit)

### Running it

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs are at `http://localhost:8000/docs`. Run `pytest` in `backend`, and `python scripts/smoke.py` from the repo root while the server is running.

### Data source

`app/store.py` is the only file that touches data, and it picks the source itself:

| Condition | Source | `/api/health` `data_source` |
|---|---|---|
| `MONGODB_URI` is set and `app/db.py` exists | MongoDB, through `get_db()` | `mongodb` |
| Otherwise | In-memory data from `app/sample_data.py` | `sample-memory` |

Review and audit changes on `sample-memory` are lost when the server restarts. Tests always use sample data, even if `.env` holds a real URI.

`app/ai_bridge.py` works the same way for `app/ai/*`: it calls the real function once its module exists, and uses template output if the module is missing or the call fails.

### What the backend expects from the data and AI layer

**`app/db.py`:** `get_db()` returns a pymongo `Database`.

**`app/ai` functions:**

| Function | Expected return |
|---|---|
| `graph.get_graph(focus=None)` | `{"nodes": [...], "edges": [...]}` |
| `graph.centrality(skill_id)` | A number, on any scale. Risk rescales it against the highest skill |
| `extraction.extract_skills(text)` | A list of `{skill_id, confidence}`, or an object with `skills` and `source` |
| `narratives.market_brief(top_skills)` | A string, or an object with `summary` and `source` |
| `narratives.course_reason(facts)` | A string, or an object with `reason` and `source` |

**Collections:** fields follow plan section 5. These details are not spelled out there, and `app/sample_data.py` shows each one:

| Field | Expected shape |
|---|---|
| `employees.skills[]` | `{skill_id, evidence: [{source, level, date}]}` |
| `evidence.source` | `manager`, `project`, `certification` or `self` |
| `evidence.date` | ISO date, such as `2026-06-01` |
| `employees.learning[]` | `{course_id, status}`. Only `completed` courses are skipped; a missing status counts as completed |
| `roles.required_skills[]` | `{skill_id, level}` |
| `courses.skills_taught[]` | Plain skill IDs |
| `courses.level` | Number from 1 to 5 |
| `forecasts.history[]` | `{quarter, demand_fte}`, oldest first |
| `forecasts.forecast`, `low`, `high` | Four numbers each |
| `forecasts.quarters` | Four quarter labels |
| `forecasts.factors[]` | `{name, contribution}`, where a negative contribution pushes demand down |
| `market_signals.quarter` | Text that sorts by time, such as `2026 Q3` |
| `demand_fte` | Must be on the same scale as headcount, because supply is counted in people |

### Scoring

Formulas are in `app/services/scoring.py` as pure functions. The plan left these points open, so the code fixes them:

- **Stale evidence:** an entry older than 18 months keeps its level, but its weight is halved before renormalizing. If it is the only evidence, the level is unchanged.
- **Repeat evidence:** a source's weight is shared across its entries, so ten self-assessments cannot outvote one manager rating.
- **Supply:** people with an effective level of 3 or more. An expert is level 4 or more.
- **Shortage (risk input):** unmet forecast demand as a percent of forecast demand.
- **Concentration (risk input):** percent of the departments needing a skill that have one expert or none. "Needing" means someone there holds a role that requires the skill.
- **Market growth (risk input):** four-quarter demand growth, where 50% or more scores 100.
- **Centrality (risk input):** rescaled so the most central skill scores 100.
- **Readiness with plans:** a recommended course at level 3 or above is assumed to bring a learner to that level, with 70% completing. These are assumptions, not measured results.
- **Default learning target:** the employee's current role, or their best open-role match if the current role has no gaps.
- **Career paths:** a skill learned at an early step is not counted again at a later step.

### Human review

- Opening the learning, mobility or career endpoints queues a pending review. The unique key stops repeats, so a page reload adds nothing.
- A learning plan is keyed by target role. Each mobility match and career path is keyed by its role.
- `rejected` items are hidden from the employee role and stay visible to HR.
- `overridden` needs both new values and a comment, and the values replace the suggestion in the employee view.
- A review can only be decided once. A second decision returns 409.
- Only `/api/reviews/{id}/decision` and `/api/mobility/roles/{id}/candidates` are HR-only, as listed in the plan.

### Limits

- `X-Demo-Role` is a demo switch, not authentication. Anyone can send `hr`.
- The fairness guard checks field names and labelled text such as `gender: x`. It cannot find a sensitive detail written in ordinary free text.
- All metrics come from dummy data.
