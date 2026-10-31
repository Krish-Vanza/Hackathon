# Technical Documentation

## Overview

```text
React app (port 5173): employee, analytics and governance pages
        |  /api (Vite proxy)
FastAPI (port 8000): routers -> services -> scoring, reviews, reports
        |                         |
   app/ai: Gemini, graph,     app/store.py and app/db.py
   extraction                     |
                              MongoDB Atlas
                                  ^
   backend/seed and backend/ml: dummy data, training, stored forecasts
```

Code makes every number and ranking. Gemini only writes wording and extracts skills, and the app keeps working without it. The API reads stored forecasts and never trains during a request.

| Module | Owner | Contents |
|---|---|---|
| M1 Data, Models and AI | Harin | MongoDB, dummy data, forecast model, knowledge graph, Gemini |
| M2 Backend | Harshit | FastAPI, scoring, recommendations, HR review, reports |
| M3 Main Frontend | Bhuvi | App structure and eight main pages |
| M4 Governance Frontend and Docs | Krish | Shared components, risk, HR review, audit, report |

See the root `README.md` for setup and `architecture.html` for the diagram.

### Requirement coverage

| Requirement | Logic | Screen |
|---|---|---|
| FR-01 Skill Inventory Assessment | `services/gaps.py`, `services/skills.py`, `ai/extraction.py` | `/profile/:id` |
| FR-02 Skill Gap Detection | `services/gaps.py`, `services/forecasts.py` | `/gaps`, `/forecast` |
| FR-03 Market Intelligence | `services/forecasts.py`, `ai/narratives.py` | `/forecast` |
| FR-04 Demand Forecasting | `ml/train_forecast.py` | `/forecast/:skillId` |
| FR-05 Personalized Learning Paths | `services/learning.py` | `/learning/:id` |
| FR-06 Internal Mobility Analysis | `services/mobility.py` | `/mobility/:id` |
| FR-07 Workforce Risk Assessment | `services/risk.py` | `/risk` |
| FR-08 Career Path Recommendations | `services/mobility.py` | `/career/:id` |
| FR-09 Explainable AI | `schemas.py`, the `explanation` on every prediction | `ExplanationPanel` |
| FR-10 Human Review | `services/reviews.py`, `services/audit.py` | `/review`, `/audit` |

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

Review and audit changes on `sample-memory` are lost when the server restarts. API tests use sample data, even if `.env` holds a real URI, and the seed and model tests use an in-memory `mongomock` database.

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
| `forecasts.factors[]` | `{name, value, contribution}`, where a negative contribution pushes demand down |
| `market_signals.quarter` | Text that sorts by time, such as `2026-Q3` |
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
- Skill matches below 0.7 confidence are queued as `skill_claim` when the request names an employee.
- `rejected` items are hidden from the employee role and stay visible to HR.
- `overridden` needs both new values and a comment, and the values replace the suggestion in the employee view. The HR page offers this for mobility, learning and career items, where a value reaches the employee.
- A review can only be decided once. A second decision returns 409.
- Only `/api/reviews/{id}/decision` and `/api/mobility/roles/{id}/candidates` are HR-only in the API, as listed in the plan. The frontend also limits `/review` and `/audit` to the HR role.

### Fairness guard

`assert_clean()` runs on seed data, review payloads, HR overrides, HR comments and every text or fact sent to Gemini. A blocked value returns 422 and is not stored.

### Limits

- `X-Demo-Role` is a demo switch, not authentication. Anyone can send `hr`.
- The fairness guard checks field names and labelled text such as `gender: x`. It cannot find a sensitive detail written in ordinary free text.
- All metrics come from dummy data.

## Data, Models and AI (Harin)

### Running it

From `backend/`, with `MONGODB_URI` in `backend/.env`:

```powershell
python -m seed.generate_seed --reset   # Harin only: wipes and reloads the shared database
python -m ml.train_forecast            # trains, backtests and stores forecasts
python -m seed.check                   # counts, privacy check and model run
```

Restart the API after reseeding, because it keeps the knowledge graph in memory.

### Files

| File | What it does |
|---|---|
| `app/db.py` | Shared connection (`get_db()`), collection names, `ensure_indexes()`, `ping()` |
| `seed/catalog.py` | Fixed IDs: 40 skills, 10 roles, 30 courses, departments, quarters |
| `seed/generate_seed.py` | Builds the dataset with seed 42 and loads it |
| `seed/check.py` | Confirms counts match the plan and the model has run |
| `ml/features.py` | Feature rows and training samples |
| `ml/train_forecast.py` | Ridge model, backtest, forecasts, `model_runs` |
| `app/ai/llm.py` | `generate_json()`, the only way to call Gemini |
| `app/ai/extraction.py` | `extract_skills(text)` |
| `app/ai/narratives.py` | `market_brief()` and `course_reason(facts)` |
| `app/ai/graph.py` | `get_graph()`, `centrality()`, `prerequisite_order()` |
| `app/ai/guard.py` | Re-exports `app/fairness.assert_clean` for the seed and AI code |

### Dummy data

| Collection | Count | Notes |
|---|---|---|
| `skills` | 40 | `skill_id` S-001 to S-040, with `criticality` 0-1, `prerequisites`, `related`, `aliases` |
| `roles` | 10 | R-01 to R-10, `required_skills` as `{skill_id, level}`, `next_roles` |
| `employees` | 60 | E-0001 to E-0060, 5 departments, skills with evidence (`self`, `manager`, `project`, `certification`, each with `level` and `date`) |
| `courses` | 30 | C-001 to C-030, `skills_taught` as plain skill IDs, `hours`, `is_certification` |
| `open_roles` | 8 | OR-01 to OR-08 |
| `market_signals` | 800 | 40 skills x 20 quarters, 2021-Q4 to 2026-Q3 |

Employees carry only an ID, role, department, skills, learning and projects. There is no name, gender, age, tenure, location or other sensitive field. Self ratings are slightly inflated on purpose, so evidence weighting matters. Evidence dates run up to 30 months back, so some evidence is older than 18 months.

**Planted demo story**
- `E-0007` is a Backend Engineer (R-01) with strong Statistics, Machine Learning, Pandas and Deep Learning evidence, so ML Engineer (R-05) is a strong fit. OR-01 is an open ML Engineer role.
- Agentic AI (`S-028`) demand grows about 6 times over 20 quarters (about 0.8 to 5.3 FTE) and is the top forecast riser.
- Digital Services relies on one Agentic AI expert, `E-0023` (level 5). Nobody else in that department has manager, project or certification evidence above level 3.

### Forecast model

- **Target:** next quarter's percentage change in `demand_fte`, so small and large skills share one model.
- **Features:** last 4 quarterly demand changes, last quarter's job postings growth, demand versus its 4-quarter average, and skill category (one-hot).
- **Model:** `StandardScaler` + `Ridge(alpha=1)`, trained on all 40 skills (600 rows), applied recursively for 4 quarters. Future job postings growth is held at its last 2-quarter average.
- **Backtest:** rolling origin over 2025-Q4 to 2026-Q3. For each test quarter the model is trained only on earlier quarters. Compared with a naive "same as last quarter" forecast. Current result on the dummy data: model MAPE about 1.9% against naive 4.2%, and the model wins on about 74% of skill-quarters.
- **Range:** 80% band from the 10th and 90th percentile backtest errors, widened by the square root of the horizon and by each skill's own recent volatility.
- **Explanation:** each factor's weight is its share of |coefficient x scaled value|. Confidence falls as the band widens.
- **Trend label:** `emerging` at +10% or more over 4 quarters, `declining` at -5% or less, otherwise `stable`.

Accuracy is measured on generated data and must be described that way in the demo.

`forecasts` document:

```json
{
  "skill_id": "S-028", "skill_name": "Agentic AI", "category": "AI & ML",
  "history":  [{"quarter": "2021-Q4", "demand_fte": 0.85}],
  "quarters": ["2026-Q4"],
  "forecast": [6.22],
  "low": [5.98], "high": [6.63],
  "growth_pct": 92.7, "postings_growth_pct": 114.3, "trend_status": "emerging",
  "factors": [{"name": "Job postings growth", "value": "+20.7% ...", "contribution": 0.041, "weight": 0.70, "direction": "up"}],
  "explanation": {"summary": "...", "factors": [], "confidence": 0.68, "method": "Ridge forecast", "source": "model"},
  "model_version": "ridge-20261031-063145"
}
```

`model_runs` holds `version`, `trained_at`, `model_mape`, `naive_mape`, `win_rate`, `test_quarters`, `n_train`, `n_test` and `band`. The newest run is the one with the latest `trained_at`.

### AI functions

| Function | Returns | Use in |
|---|---|---|
| `get_graph(focus=None)` | `{nodes, edges, focus}`; nodes have `id, label, type, category, criticality, centrality, degree`. Raises `KeyError` for an unknown focus | `/api/graph` |
| `centrality(skill_id)` | 0-1, top skill is 1.0 | Risk score |
| `prerequisite_order(skill_ids)` | Same IDs, prerequisites first | Available for learning path ordering |
| `extract_skills(text)` | `{skills: [{skill_id, skill_name, confidence, evidence, needs_review}], source, review_threshold}` | `/api/skills/extract` |
| `market_brief(top_skills=None)` | `{summary, highlights, skill_ids, source}`. With no argument it uses the top 5 risers | `/api/market/brief` |
| `course_reason(facts)` | `{reason, source}` | Learning path reasons |
| `llm_mode()` | `gemini` or `mock`. Gives `mock` when no key is set | `/api/health` |

### Gemini safeguards

- `LLM_MODE=mock` (the default) or a missing key always uses template text.
- Replies are validated against a Pydantic schema, and any reply that names an ID not in the facts is thrown away.
- Successful replies are cached in `llm_cache` by prompt hash, so a warm cache keeps the demo working through rate limits.
- Any error, timeout (10 s by default, set with `LLM_TIMEOUT_MS`) or bad reply falls back to template text and sets `source` to `template`.

## Main Frontend (Bhuvi)

React in JavaScript with Vite, Tailwind, Recharts and `react-force-graph-2d`.

| Path | Purpose |
|---|---|
| `src/api.js` | The only place that calls the backend. Sends `X-Demo-Role` on every request |
| `src/App.jsx` | Routes |
| `src/hooks/useApi.js` | Loads data on mount, and again when inputs or the demo role change |
| `src/components/layout/` | App frame, role switcher and shared UI such as `Card`, `Stat` and `Async` |
| `src/pages/` | The eight main pages |
| `src/mocks/mockApi.js` | Dummy responses for `npm run dev:mock` |

| Route | Page | Main endpoints |
|---|---|---|
| `/profile/:id` | Skill Profile | `profile`, `gaps`, `skills/extract` |
| `/gaps` | Gap Heatmap | `gaps/org` |
| `/graph` | Knowledge Graph | `graph` |
| `/forecast` | Forecast Dashboard | `forecast/*`, `market/*`, `readiness` |
| `/forecast/:skillId` | Skill Forecast | `forecast/skills/{id}`, `flag` |
| `/learning/:id` | Learning Path | `learning/{id}` |
| `/mobility/:id` | Internal Mobility | `mobility/{id}`, `mobility/roles/{id}/candidates` |
| `/career/:id` | Career Paths | `career/{id}` |

`Async` gives each section the same loading, error and empty states, and `PageBoundary` stops one bad page from blanking the app.

## Governance Frontend (Krish)

### Shared components

| Component | Purpose |
|---|---|
| `ExplanationPanel` | Renders the `Explanation` contract: summary, factor bars, confidence, method and source. Takes `explanation` and an optional `open` |
| `StatusBadge` | Shows the AI suggestion label and the review status. Takes `status` and an optional `ai={false}` |
| `RiskBadge` | Shows a High, Medium or Low risk level |

### Pages

| Route | Page | Endpoints | Notes |
|---|---|---|---|
| `/risk` | Workforce Risk | `risk` | Ranked table with a level filter and a factor breakdown per skill |
| `/review` | HR Review | `reviews`, `reviews/{id}/decision` | Queue with filters, a detail view, and approve, reject or override. HR only |
| `/audit` | Audit Log | `audit` | Events, newest first. HR only |
| `/report` | Workforce Analytics Report | `reports/workforce`, `reports/workforce.csv`, `health` | Print to PDF, CSV download and system status |

- **Report PDF:** the print styles in `src/index.css` remove the app frame and keep sections whole. Use the browser's Save as PDF option.
- **Overrides:** the form sends only changed values, and checks that each is a number in range and that a comment is present.

## Testing

| Check | Command | Covers |
|---|---|---|
| Backend tests | `pytest` in `backend` | Scoring, API rules, HR review, fairness, seed data, forecast backtest and graph |
| Frontend lint and build | `npm run lint` and `npm run build` in `frontend` | Code problems and build errors |
| API smoke test | `python scripts/smoke.py` from the repo root | Every endpoint on a running server |

The smoke script is safe on the shared database, although opening the learning, mobility and career endpoints queues pending reviews, as in normal use.
