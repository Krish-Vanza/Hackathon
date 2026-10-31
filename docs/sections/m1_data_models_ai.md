# M1: Data, Models and AI (Harin)

This section covers the database, the dummy data, the local forecast model, the
skills knowledge graph and the Gemini helpers. Krish can paste it into
`docs/TECHNICAL_DOCUMENTATION.md`.

## Run it

From `backend/`, with `MONGODB_URI` in `backend/.env`:

```powershell
python -m seed.generate_seed --reset   # Harin only: wipes and reloads the shared database
python -m ml.train_forecast            # trains, backtests and stores forecasts
python -m seed.check                   # counts, privacy check and model run
pytest                                 # tests use mongomock, no Atlas needed
```

Tests need `mongomock` (`pip install mongomock`). Without it the database tests are skipped.

## Files

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
| `app/ai/guard.py` | Sensitive-attribute check; uses `app/fairness.assert_clean` once it exists |

## Dummy data

| Collection | Count | Notes |
|---|---|---|
| `skills` | 40 | `skill_id` S-001 to S-040, with `criticality` 0-1, `prerequisites`, `related`, `aliases` |
| `roles` | 10 | R-01 to R-10, `required_skills` as `{skill_id, level}`, `next_roles` |
| `employees` | 60 | E-0001 to E-0060, 5 departments, skills with evidence (`self`, `manager`, `project`, `certification`, each with `level` and `date`) |
| `courses` | 30 | C-001 to C-030, `skills_taught` as `{skill_id, to_level}`, `hours`, `is_certification` |
| `open_roles` | 8 | OR-01 to OR-08 |
| `market_signals` | 800 | 40 skills x 20 quarters, 2021-Q4 to 2026-Q3 |

Employees carry only an ID, role, department, skills, learning and projects. There is
no name, gender, age, tenure, location or other sensitive field. Self ratings are
slightly inflated on purpose, so evidence weighting matters. Evidence dates run up to
30 months back, so some evidence is older than 18 months.

**Planted demo story**
- `E-0007` is a Backend Engineer (R-01) with strong Statistics, Machine Learning, Pandas
  and Deep Learning evidence, so ML Engineer (R-05) is a strong fit. OR-01 is an open ML
  Engineer role.
- Agentic AI (`S-028`) demand grows about 6 times over 20 quarters (14 to 88 FTE) and is the top
  forecast riser.
- Digital Services relies on one Agentic AI expert, `E-0023` (level 5). Nobody else in
  that department has manager, project or certification evidence above level 3.

## Forecast model

- **Target:** next quarter's percentage change in `demand_fte`, so small and large skills share one model.
- **Features:** last 4 quarterly demand changes, last quarter's job postings growth,
  demand versus its 4-quarter average, and skill category (one-hot).
- **Model:** `StandardScaler` + `Ridge(alpha=1)`, trained on all 40 skills (600 rows), applied
  recursively for 4 quarters. Future job postings growth is held at its last 2-quarter average.
- **Backtest:** rolling origin over 2025-Q4 to 2026-Q3. For each test quarter the model
  is trained only on earlier quarters. Compared with a naive "same as last quarter" forecast.
  Current result on the dummy data: model MAPE about 1.9% against naive 4.2%, and the model
  wins on about 74% of skill-quarters.
- **Range:** 80% band from the 10th and 90th percentile backtest errors, widened by the
  square root of the horizon and by each skill's own recent volatility.
- **Explanation:** each factor's weight is its share of |coefficient x scaled value|.
  Confidence falls as the band widens.
- **Trend label:** `emerging` at +10% or more over 4 quarters, `declining` at -5% or less, otherwise `stable`.

Accuracy is measured on generated data and must be described that way in the demo.

### `forecasts` document

```json
{
  "skill_id": "S-028", "skill_name": "Agentic AI", "category": "AI & ML",
  "history":  [{"quarter": "2021-Q4", "demand_fte": 14.15}],
  "forecast": [{"quarter": "2026-Q4", "demand_fte": 103.71, "low": 99.68, "high": 110.72}],
  "low": [99.68], "high": [110.72],
  "growth_pct": 92.7, "postings_growth_pct": 114.3, "trend_status": "emerging",
  "factors": [{"name": "Job postings growth", "value": "+20.7% ...", "weight": 0.70, "direction": "up"}],
  "explanation": {"summary": "...", "factors": [], "confidence": 0.68, "method": "Ridge forecast", "source": "model"},
  "model_version": "ridge-20261031-063145"
}
```

`model_runs` holds `version`, `trained_at`, `model_mape`, `naive_mape`, `win_rate`,
`test_quarters`, `n_train`, `n_test` and `band`. The newest run is the one with the latest `trained_at`.

## Functions for Harshit

```python
from app.db import get_db, ping, ensure_indexes            # plus collection name constants
from app.ai.graph import get_graph, centrality, prerequisite_order, refresh_graph
from app.ai.extraction import extract_skills
from app.ai.narratives import market_brief, course_reason
from app.ai.llm import generate_json, status as llm_status
```

| Function | Returns | Use in |
|---|---|---|
| `get_graph(focus=None)` | `{nodes, edges, focus}`; nodes have `id, label, type, category, criticality, centrality, degree`. Raises `KeyError` for an unknown focus | `/api/graph` |
| `centrality(skill_id)` | 0-1, top skill is 1.0 | risk score |
| `prerequisite_order(skill_ids)` | Same IDs, prerequisites first | learning path ordering |
| `extract_skills(text)` | `{skills: [{skill_id, skill_name, confidence, evidence, needs_review}], source, review_threshold}` | `/api/skills/extract`; send `needs_review` items to HR as `skill_claim` |
| `market_brief(top_skills=None)` | `{summary, highlights, skill_ids, source}`. With no argument it uses the top 5 risers | `/api/market/brief` |
| `course_reason(facts)` | `{reason, source}`. Course facts: `course_id, course_title, skill_id, skill_name, current_level, target_level, growth_pct, hours`. Role facts: `role_id, role_title, readiness_pct, missing_skills` | learning and mobility |
| `llm_status()` | `{mode, model}` | `/api/health` |

`/api/market/trends` can read `growth_pct`, `postings_growth_pct` and `trend_status` straight
from `forecasts`. Do not pass a field called `name`, or any other sensitive field, into
`course_reason` or `market_brief`: the guard rejects it.

## Gemini safeguards

- `LLM_MODE=mock` (the default) or a missing key always uses template text.
- Replies are validated against a Pydantic schema, and any reply that names an ID not in
  the facts is thrown away.
- Successful replies are cached in `llm_cache` by prompt hash, so a warm cache keeps the
  demo working through rate limits.
- Any error, timeout (20 s) or bad reply falls back to template text and sets `source` to `template`.
