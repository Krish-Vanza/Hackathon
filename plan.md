# Project 4 Implementation Plan: Skill Gap and Workforce Evolution Predictor

## 1. Context

The HCLTech hackathon brief asks for an AI-powered workforce intelligence platform. It analyzes employee skills, project needs, market trends and learning records, predicts future skill demand, and recommends personalized upskilling and role moves.

- **Team:** Harin, Harshit, Bhuvi and Krish
- **Stack:** React (JavaScript) + FastAPI + MongoDB, with Google Gemini and a local scikit-learn model
- **Data:** dummy data that we generate ourselves
- **Time:** 4-5 hours. This plan schedules 4.5 hours and treats any extra time as buffer.
- **Goal:** one working app that covers all 10 functional requirements and all 7 submission items at demo depth.

The repo currently holds only `CLAUDE.md` and `.gitignore`, so this is a fresh build.

## 2. Scope Decisions for 4.5 Hours

| Area | Decision | Why |
|---|---|---|
| Frontend | Vite, React in JavaScript, Tailwind, Recharts, `react-force-graph-2d`, React Router | Team preference, with chart and graph libraries ready |
| Backend | FastAPI with Pydantic, using plain `def` routes | Simple, and FastAPI runs them in a thread pool |
| Database | MongoDB Atlas free cluster shared by the team, using `pymongo` | One dataset for all four people, with nothing to install |
| Dummy data | One seed script with a fixed random seed | Everyone gets identical, repeatable data |
| Local ML model | scikit-learn Ridge forecast, trained on our machines | Simple, fast and explainable |
| LLM | Gemini writes wording and extracts skills; code makes every number and ranking | Keeps results explainable and repeatable |
| Knowledge graph | NetworkX in memory, built from MongoDB | Gives centrality and pathfinding with no graph database |
| Roles | Employee/HR switcher sending an `X-Demo-Role` header | FR-10 needs an HR view, not real login. Label it demo-only |

**Left out on purpose:** real authentication, Docker, CI, RAG and vector search, live market feeds, and multi-agent orchestration. Project 4 does not require any of these.

### Is a local model required?

**No, the brief does not explicitly require a local model for Project 4.** It has no technology table of its own. However, FR-04 and FR-07 require prediction, and the evaluation criteria name forecast accuracy and "forecasting models", so a real model is expected in practice. The technology tables for the other projects list scikit-learn and say local execution must remain demonstrable.

This plan therefore uses a **simple local scikit-learn model for forecasting**, and Gemini for text. Forecasting works without Gemini or any API key.

### Honest limits

- Accuracy is measured on dummy data, so the demo and report must say so.
- 4.5 hours produces a thin version of each feature. Depth is traded for full coverage.
- Harin and Harshit each own a lot, so section 12 lists what to cut first.

## 3. Architecture

Open `architecture.html` in a browser for the full diagram.

```text
React JS app (port 5173)
  Bhuvi: profile, gaps, graph, forecast, learning, mobility, career
  Krish: risk, HR review, audit, report
        |  /api (Vite proxy)
FastAPI (port 8000) - Harshit
  routers -> services -> skills, risk, recommendations, governance, reports
        |                              |
  app/ai - Harin                   app/db.py - Harin
  Gemini, graph, extraction            |
                                  MongoDB Atlas
                                       ^
  backend/seed and backend/ml - Harin: dummy data, training, forecasts
```

### Repo layout

```text
backend/
  app/main.py              includes all routers
  app/config.py, deps.py, schemas.py, fairness.py    Harshit
  app/routers/             Harshit
  app/services/            Harshit
  app/db.py                Harin
  app/ai/                  Harin: llm.py, extraction.py, narratives.py, graph.py
  seed/                    Harin: generate_seed.py, check.py
  ml/                      Harin: features.py, train_forecast.py
  tests/                   Harshit and Harin
frontend/src/
  api.js, App.jsx, pages/, components/layout/    Bhuvi
  components/shared/       Krish: ExplanationPanel, StatusBadge
  pages/governance/        Krish
plan.md                    this plan
architecture.html          architecture diagram
docs/                      TECHNICAL_DOCUMENTATION.md
scripts/smoke.py           Harshit: calls every endpoint
```

## 4. Shared Contracts (Fixed by 0:45)

Everything below keeps the four parts joined up. Change these only after telling the whole team.

### Rule 1: every prediction carries an explanation (FR-09)

```python
class Factor(BaseModel):
    name: str                         # "Gap severity"
    value: str                        # "2.5 levels below target"
    weight: float                     # 0 to 1
    direction: Literal["up", "down"]

class Explanation(BaseModel):
    summary: str
    factors: list[Factor]
    confidence: float                 # 0 to 1
    method: str                       # "Ridge forecast"
    source: Literal["rules", "model", "gemini", "template"]
```

Gap, forecast, risk, learning, mobility and career responses all include `explanation`. Krish's `ExplanationPanel` renders it everywhere.

### Rule 2: human decisions go through one queue (FR-10)

```python
def submit_for_review(type, subject_id, key, title, payload, explanation) -> dict
def get_decision(type, subject_id, key) -> dict | None
```

- Types: `skill_claim`, `forecast_flag`, `learning_plan`, `mobility`, `career_plan`
- Status: `pending`, `approved`, `rejected`, `overridden`
- A unique MongoDB index on `(type, subject_id, key)` stops repeat page loads from flooding the queue.
- Rejected items are hidden from the employee view, so an HR decision changes what the system shows.
- `mobility` and `career_plan` items show **Awaiting HR review** until decided.

### Rule 3: backend layers

- Routers only call services.
- Services read through `app/db.py` and call `app/ai` functions.
- The API reads stored forecasts from MongoDB and never trains during a request.
- Keep scoring in pure functions so tests need no database.
- Query with `{"_id": 0}`, because MongoDB's `ObjectId` is not JSON serializable.

### Rule 4: all Gemini calls go through one helper

```python
def generate_json(prompt, schema, fallback, allowed_ids=None) -> BaseModel
```

- Uses `google-genai` with `GEMINI_MODEL=gemini-3.1-flash-lite`, JSON mode and a Pydantic `response_schema`.
- Validates with `schema.model_validate_json(response.text)`.
- Caches by prompt hash in the `llm_cache` collection.
- Rejects any response naming an ID outside `allowed_ids`.
- On any failure, or with `LLM_MODE=mock`, it returns `fallback` and marks the source as `template`. The demo must never crash because of Gemini.

The free tier may use prompts to improve Google's products, so send dummy data only. Its limits also change often, so warm the cache before the demo.

### Rule 5: sensitive attributes never enter the system

- Dummy data has no name, gender, age, date of birth, ethnicity, religion, marital status, disability or nationality.
- Tenure and location are also excluded because they can act as proxies.
- Employees appear only as IDs such as `E-0007`.
- `assert_clean()` in `app/fairness.py` checks seed data in a test and every Gemini payload at runtime.

### Rule 6: secrets

`MONGODB_URI` and `GEMINI_API_KEY` go only in `backend/.env`, which git ignores. Share the URI through private chat. This repo is public, so never paste it into code, docs or issues.

## 5. Dummy Data and MongoDB Design

Harin creates all of this with `backend/seed/generate_seed.py`, using a fixed random seed.

| Collection | Count | Key fields |
|---|---|---|
| `skills` | 40 | `skill_id`, `name`, `category`, `criticality`, `prerequisites`, `related` |
| `roles` | 10 | `role_id`, `title`, `required_skills` (skill and level), `next_roles` |
| `employees` | 60 | `employee_id`, `role_id`, `department`, `skills` with evidence, `learning`, `projects` |
| `courses` | 30 | `course_id`, `title`, `skills_taught`, `level`, `hours`, `is_certification` |
| `open_roles` | 8 | `open_role_id`, `role_id`, `department` |
| `market_signals` | 800 | `skill_id`, `quarter`, `demand_fte`, `job_postings_index` (20 quarters, 2021 Q4 to 2026 Q3) |
| `forecasts` | 40 | `skill_id`, `history`, `forecast`, `low`, `high`, `trend_status`, `factors` |
| `model_runs` | Per run | `version`, `trained_at`, `model_mape`, `naive_mape`, `win_rate` |
| `reviews` | Runtime | `review_id`, `type`, `subject_id`, `key`, `status`, `payload`, `explanation`, `comment` |
| `audit_log` | Runtime | `event`, `actor`, `entity`, `detail`, `at` |
| `llm_cache` | Runtime | `prompt_hash`, `response`, `model` |

**Indexes:** unique on each ID field, on `market_signals (skill_id, quarter)`, and on `reviews (type, subject_id, key)`.

**Planted demo story**
- `E-0007` is a Backend Engineer who is a strong fit for ML Engineer.
- Agentic AI demand rises sharply.
- One department relies on a single Agentic AI expert, which creates a high risk.

## 6. Modules at a Glance

| Module | Owner | Size | Requirements | Submission items |
|---|---|---|---|---|
| M1 Data, Models and AI | Harin | Major | FR-03, FR-04, data for all | Skills Knowledge Graph data and analytics, forecast model |
| M2 FastAPI Backend and Business Logic | Harshit | Major | FR-01, FR-02, FR-05, FR-06, FR-07, FR-08, FR-10 backend | Learning Recommendation Engine, Internal Mobility Module, platform API |
| M3 Main Frontend | Bhuvi | Major | FR-01 to FR-06, FR-08 screens | Forecast Dashboard, graph, learning and mobility screens |
| M4 Supporting Frontend and Docs | Krish | Smaller | FR-07, FR-09, FR-10 screens | Workforce Analytics Report, Technical Documentation |

## 7. Module M1: Data, Models and AI (Harin)

**Responsibility:** everything the app knows and predicts: the database, dummy data, local model, knowledge graph and Gemini.

**Features**
- MongoDB setup, indexes and shared connection
- Dummy data generator
- Local demand forecast model with backtesting
- Market trend labels: emerging, stable or declining
- Knowledge graph analytics
- Gemini helper, skill extraction, market brief and recommendation reasons

**Local ML model**
- **Input:** last 4 quarterly demand changes, job posting growth, rolling average and skill category.
- **Target:** next quarter's change in `demand_fte`.
- **Model:** `StandardScaler` + `Ridge`, trained across all 40 skills, then repeated four times to reach four quarters ahead.
- **Backtest:** rolling origin over the last 4 quarters, compared with a naive last-value forecast. Test quarters must never appear in training.
- **Range:** an 80% band from backtest errors.
- **Explanation:** each feature's contribution is its coefficient times its value, which is stored as `factors`.
- **Output:** `forecasts` and `model_runs` in MongoDB, with the model saved as a git-ignored `.joblib` file.

**Knowledge graph:** nodes are skills and roles. Edges are `prerequisite_of`, `related_to` and `required_by`. Expose `get_graph(focus=None)` and `centrality(skill_id)`.

**Gemini functions**

| Function | Used for | Fallback |
|---|---|---|
| `extract_skills(text)` | FR-01 skill extraction; below 0.7 confidence goes to HR | Keyword matching |
| `market_brief(top_skills)` | FR-03 summary citing skill IDs | Template text |
| `course_reason(facts)` | Learning and mobility reasons | Template text |

**Frontend/backend tasks:** none in the UI. Harin hands Harshit the functions above.

**Implementation steps**
1. Create the Atlas cluster and share the URI privately by 0:20.
2. Write `app/db.py` and index creation.
3. Push `skills` and `roles` by 0:30, because everyone depends on their IDs.
4. Generate the rest of the dummy data by 1:00, including the planted story.
5. Write `app/ai/llm.py` with mock mode by 1:00.
6. Build features, training and backtest, then store forecasts by 2:00.
7. Build the graph functions by 2:30.
8. Add extraction, the brief and reasons by 3:15.
9. Write tests, then add a section to the technical documentation.

## 8. Module M2: FastAPI Backend and Business Logic (Harshit)

**Responsibility:** the whole API, plus the logic that turns data into gaps, risks and recommendations.

**Features**
- FastAPI project, shared schemas, role checks and the fairness guard
- Skill profiles and current gaps
- Future gaps, risk and readiness
- Learning paths, role matching and career paths
- HR review queue, audit log and report data

**Core logic**
- **Effective level (0-5):** weighted evidence: manager 0.4, project 0.3, certification 0.2, self 0.1. Evidence older than 18 months counts half. Weights renormalize over the sources present.
- **Gap severity:** `max(0, required - effective) x criticality`
- **Future gap:** forecast demand minus projected supply, with an assumed 3% attrition per quarter.
- **Risk (0-100):** `0.40 x shortage + 0.25 x concentration + 0.20 x market growth + 0.15 x graph centrality`. High is 70 or more, medium is 40 to 69.
- **Readiness index:** share of forecast demand covered by supply, capped at 100% per skill and weighted by demand. Report now, in four quarters with no action, and in four quarters with recommended plans.
- **Course score:** `0.5 x gap coverage + 0.3 x future demand + 0.2 x level fit`. Take the top 5, then order them by prerequisites.
- **Role readiness:** sum of `min(effective, required)` divided by sum of `required`, weighted by criticality.
- **Bridge time:** course hours needed, at an assumed 6 hours a week.
- **Career paths:** shortest paths on the role graph, up to 3 steps, weighted by skill distance.

**Scope guard:** the brief keeps hiring decisions with humans. The candidate list is labeled decision support, nothing assigns or rejects anyone automatically, and every mobility item goes through HR.

**APIs**

| Method | Endpoint | Returns | Screen owner |
|---|---|---|---|
| GET | `/api/health` | Service, database and LLM status | Krish |
| GET | `/api/me` | Current demo role | Bhuvi |
| GET | `/api/skills` | Skill taxonomy | Bhuvi |
| GET | `/api/employees` | Employee list | Bhuvi |
| GET | `/api/employees/{id}/profile` | Skills, levels, evidence, explanation | Bhuvi |
| GET | `/api/employees/{id}/gaps?role_id=` | Ranked gaps with explanation | Bhuvi |
| GET | `/api/gaps/org` | Department by category heatmap | Bhuvi |
| GET | `/api/graph?focus=` | Nodes, edges and centrality | Bhuvi |
| POST | `/api/skills/extract` | Matched skills with confidence | Bhuvi |
| GET | `/api/market/trends` | Growth and status per skill | Bhuvi |
| GET | `/api/market/brief` | Gemini summary | Bhuvi |
| GET | `/api/forecast/skills?top=10` | Biggest rising skills | Bhuvi |
| GET | `/api/forecast/skills/{id}` | History, forecast, range, explanation | Bhuvi |
| GET | `/api/forecast/accuracy` | Model versus naive MAPE | Bhuvi |
| GET | `/api/forecast/gaps` | Future gaps per skill | Bhuvi |
| POST | `/api/forecast/skills/{id}/flag` | Sends a forecast to HR | Bhuvi |
| GET | `/api/readiness` | Three readiness values | Bhuvi |
| GET | `/api/courses` | Course catalog | Bhuvi |
| GET | `/api/learning/{employee_id}` | Ordered plan, reasons, explanation | Bhuvi |
| GET | `/api/mobility/{employee_id}` | Top 3 roles, missing skills, review status | Bhuvi |
| GET | `/api/mobility/roles/{role_id}/candidates` | HR-only decision-support list | Bhuvi |
| GET | `/api/career/{employee_id}` | Up to 2 paths with timeline | Bhuvi |
| GET | `/api/risk` | Risk scores with explanations | Krish |
| GET | `/api/reviews?status=&type=` | Review queue | Krish |
| POST | `/api/reviews/{id}/decision` | HR-only decision, comment and override | Krish |
| GET | `/api/audit` | Audit events, newest first | Krish |
| GET | `/api/reports/workforce` | Report as JSON | Krish |
| GET | `/api/reports/workforce.csv` | Report as CSV download | Krish |

**Implementation steps**
1. Push the FastAPI scaffold, `.env.example` and `requirements.txt` by 0:20.
2. Add `schemas.py`, `deps.py` and `fairness.py` by 0:30.
3. Stub every endpoint with sample JSON by 0:45, so the frontend can start.
4. Build profiles and gaps once Harin's data lands.
5. Build the review queue and audit log.
6. Build learning, mobility and career.
7. Build future gaps, risk and readiness from Harin's forecasts.
8. Build the report endpoints.
9. Write `scripts/smoke.py` and run it at each checkpoint.
10. Write tests, then add a section to the technical documentation.

## 9. Module M3: Main Frontend (Bhuvi)

**Responsibility:** the app structure and the main employee and analytics experience.

**Features**
- Project scaffold, routing, navigation, role switcher and `api.js`
- Eight main pages, using shared components from Krish

| Route | Page | Main content | Endpoints |
|---|---|---|---|
| `/profile/:id` | Skill Profile | Radar chart, evidence list, skill text extractor | profile, gaps, extract |
| `/gaps` | Gap Heatmap | Department by category heatmap | gaps/org |
| `/graph` | Knowledge Graph | Force graph sized by centrality, with side panel | graph |
| `/forecast` | Forecast Dashboard | KPI tiles, rising skills, market brief, accuracy card | forecast, market, readiness |
| `/forecast/:skillId` | Skill Forecast | Line chart with range, explanation, flag button | forecast/skills/{id} |
| `/learning/:id` | Learning Path | Ordered course timeline with reasons | learning |
| `/mobility/:id` | Internal Mobility | Role cards and an HR candidate tab | mobility |
| `/career/:id` | Career Paths | Stepper with skills and courses for each path | career |

**Implementation steps**
1. Push the Vite project, routes with empty pages, `Layout` and `api.js` by 0:20.
2. `api.js` must send `X-Demo-Role` on every call, from the role switcher.
3. Build Profile and Gaps against Harshit's stubs.
4. Build Forecast Dashboard and Skill Forecast.
5. Build Knowledge Graph.
6. Build Learning, Mobility and Career.
7. Add `ExplanationPanel` and `StatusBadge` from Krish to each page.
8. Add loading, error and empty states, then test both roles.

## 10. Module M4: Supporting Frontend and Docs (Krish)

**Responsibility:** the HR control screens, shared display components, report and documentation. This module is smaller and simpler, with no backend, database or ML work.

**Features**

| Item | Content |
|---|---|
| `ExplanationPanel` | Summary, factor bars, confidence, method and source |
| `StatusBadge` | Review status and an AI suggestion label |
| `/risk` | Ranked risk table with severity colors and factor breakdown |
| `/review` | Queue with filters, a detail view and approve, reject or override buttons |
| `/audit` | Event table, newest first |
| `/report` | Readiness, top gaps, risks and mobility pipeline, with print-to-PDF styling and CSV download |
| Docs | `README.md`, `docs/TECHNICAL_DOCUMENTATION.md`, demo rehearsal |

**Implementation steps**
1. Complete the setup in section 11.
2. Build `ExplanationPanel` and `StatusBadge` with sample data by 1:00, because Bhuvi needs them.
3. Build `/review` against Harshit's stubs.
4. Build `/risk` and `/audit`.
5. Build `/report`, with print styling.
6. Switch each page to real data once Harshit's endpoints are live.
7. Collect a short section from each owner into the technical documentation.
8. Write the README and run the rehearsal.

## 11. Step-by-Step Setup Guide

All commands are for Windows PowerShell.

### Everyone: do this first

1. Install [Git](https://git-scm.com/downloads), [Python 3.12](https://www.python.org/downloads/) and [Node.js LTS](https://nodejs.org/).
   - Tick **Add Python to PATH** in the installer.
2. Check the installs:
   ```powershell
   git --version
   python --version
   node --version
   ```
3. Accept the GitHub invite, then clone the repo:
   ```powershell
   git clone https://github.com/Krish-Vanza/Hackathon.git
   cd Hackathon
   git config user.name "Your Name"
   git config user.email "your-github-email@example.com"
   ```
4. Install Claude Code if you use it, then read `CLAUDE.md`.

### Setup order

| Order | Who | Finished when |
|---|---|---|
| 1 | Harshit | FastAPI scaffold is pushed |
| 2 | Bhuvi | Frontend scaffold is pushed |
| 3 | Harin | Database is live and the URI is shared privately |
| 4 | Krish | Both frontend and backend run locally |

### Harshit: backend setup

1. Create the backend and a `backend/requirements.txt` containing:
   ```text
   fastapi
   uvicorn[standard]
   pymongo
   dnspython
   pydantic
   python-dotenv
   numpy
   scikit-learn
   joblib
   networkx
   google-genai
   pytest
   httpx
   ```
2. Install it:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. Create `backend/.env.example`:
   ```text
   MONGODB_URI=
   MONGODB_DB=workforce
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-3.1-flash-lite
   LLM_MODE=mock
   ```
4. Copy it to your own `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
5. Add `app/main.py` with `/api/health`, then run it:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
6. Confirm `http://localhost:8000/api/health` and `http://localhost:8000/docs` both open.
7. Push the scaffold, and tell the team.
8. Add the stubs, then check every endpoint in `/docs`.

### Harin: MongoDB, dummy data and AI setup

1. Pull Harshit's scaffold, then set up the backend:
   ```powershell
   git pull --rebase origin main
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```
2. Create the database in [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register):
   1. Create a free cluster.
   2. Under **Database Access**, add a user. Use a password of only letters and numbers, so it cannot break the URI.
   3. Under **Network Access**, allow access from anywhere, since the team is on different networks. This is for the hackathon only.
   4. Choose **Connect**, then **Drivers**, and copy the URI.
3. Put the URI in `backend/.env`, and send it to the team through private chat.
4. Create a Gemini key in [Google AI Studio](https://aistudio.google.com/apikey), then set it in `.env`:
   ```text
   GEMINI_API_KEY=your-key
   LLM_MODE=gemini
   ```
5. After the scripts exist, load the data and train the model:
   ```powershell
   python -m seed.generate_seed --reset
   python -m ml.train_forecast
   python -m seed.check
   ```
6. Confirm the counts match section 5, and `model_runs` has a result.

**Rule:** only Harin runs `--reset`, because it erases the shared database, including reviews.

### Bhuvi: main frontend setup

1. Create the app from the repo root:
   ```powershell
   npm create vite@latest frontend -- --template react
   cd frontend
   npm install
   npm install react-router-dom recharts react-force-graph-2d
   npm install tailwindcss @tailwindcss/vite
   ```
2. Update `frontend/vite.config.js`:
   ```js
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";
   import tailwindcss from "@tailwindcss/vite";

   export default defineConfig({
     plugins: [react(), tailwindcss()],
     server: { proxy: { "/api": "http://localhost:8000" } },
   });
   ```
3. Replace the contents of `frontend/src/index.css` with:
   ```css
   @import "tailwindcss";
   ```
4. Start it:
   ```powershell
   npm run dev
   ```
5. Confirm `http://localhost:5173` opens.
6. Push the scaffold, with routes and empty pages for both frontend members.
7. Follow the backend steps under Krish below to run the API locally.

### Krish: supporting frontend setup

1. Pull the scaffolds:
   ```powershell
   git pull --rebase origin main
   ```
2. Start the frontend:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
3. In a second terminal, start the backend:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```
4. Put the shared `MONGODB_URI` in `.env`. Keep `LLM_MODE=mock`, as no Gemini key is needed.
5. Run it:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
6. Confirm `http://localhost:5173` opens and the API shows data.

### Everyday run

| Step | Terminal | Command |
|---|---|---|
| 1 | Any | `git pull --rebase origin main` |
| 2 | Backend | `cd backend`, then `.\.venv\Scripts\Activate.ps1`, then `uvicorn app.main:app --reload --port 8000` |
| 3 | Frontend | `cd frontend`, then `npm run dev` |
| 4 | If dependencies changed | `pip install -r requirements.txt` or `npm install` |

### Troubleshooting

| Problem | Fix |
|---|---|
| `Activate.ps1` is blocked | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once |
| `pip install` fails on a package | Use Python 3.12, and recreate `.venv` |
| MongoDB times out | Check Network Access in Atlas, then try a different network |
| MongoDB authentication fails | Check the password in the URI |
| Frontend shows proxy errors | The backend is not running on port 8000 |
| Gemini returns 429 or fails | Set `LLM_MODE=mock`; the app uses template text |
| Data looks empty | Ask Harin to confirm the seed ran |

## 12. Timeline

| Time | Harin | Harshit | Bhuvi | Krish |
|---|---|---|---|---|
| 0:00-0:30 | Atlas, `db.py`, skills and roles | Scaffold, schemas, fairness guard | Scaffold, routes, `Layout`, `api.js` | Setup, shared components |
| 0:30-1:00 | Full dummy data, `llm.py` | All stubs, then gaps | Profile and Gaps | Finish shared components, Review page |
| 1:00-2:30 | Forecast model, backtest, graph | Review, learning, mobility, career, risk | Forecast, Graph, Learning, Mobility, Career | Risk, Audit, Report |
| 2:30-3:30 | Extraction, brief, reasons | Report, smoke script, tests | Connect real data, states | Connect real data, print styling, README |
| 3:30-4:15 | Fixes, docs section | Fixes, docs section | Fixes, polish | Assemble docs, run rehearsal |
| 4:15-4:30 | Final checks | Final checks | Final checks | Submit |

### Checkpoints

| Time | Checkpoint | Pass condition |
|---|---|---|
| 0:30 | Everyone can run it | Backend and frontend start on all four machines |
| 1:00 | Contract frozen | Every endpoint answers with the agreed shape, and dummy data is loaded |
| 2:30 | Real data everywhere | No stubs left, and `scripts/smoke.py` passes |
| 3:30 | Feature freeze | The full demo works from start to finish. Only fixes after this |

### If you are behind at 2:30, cut in this order

1. "With recommended plans" readiness value
2. Skill extraction from free text
3. Gemini market brief, using the template instead
4. Career paths reduced to one path

**Never cut:** HR review, explanations, the sensitive-attribute guard, or the forecast backtest. The brief evaluates or requires these directly.

## 13. Working on `main` Together

- Follow `CLAUDE.md`: commit small and often, then `git pull --rebase origin main` before `git push origin main`.
- Stay inside your own folders from section 3.
- Harshit owns `schemas.py`, `requirements.txt` and `main.py`. Bhuvi owns `App.jsx` and `package.json`. Ask before changing these.
- Only push code that starts, because a broken `main` blocks all four people.
- Never commit `.env`, the MongoDB URI, API keys or the hackathon brief.

## 14. Requirement Coverage

| Requirement | Logic | Screen |
|---|---|---|
| FR-01 Skill Inventory Assessment | Harshit, Harin | Bhuvi: `/profile/:id` |
| FR-02 Skill Gap Detection | Harshit | Bhuvi: `/gaps`, `/forecast` |
| FR-03 Market Intelligence | Harin | Bhuvi: `/forecast` |
| FR-04 Demand Forecasting | Harin | Bhuvi: `/forecast/:skillId` |
| FR-05 Personalized Learning Paths | Harshit, Harin | Bhuvi: `/learning/:id` |
| FR-06 Internal Mobility Analysis | Harshit | Bhuvi: `/mobility/:id` |
| FR-07 Workforce Risk Assessment | Harshit, Harin | Krish: `/risk` |
| FR-08 Career Path Recommendations | Harshit | Bhuvi: `/career/:id` |
| FR-09 Explainable AI | All | Krish: `ExplanationPanel` |
| FR-10 Human Review | Harshit | Krish: `/review`, `/audit` |

| Submission item | Owner | Delivered as |
|---|---|---|
| Workforce Intelligence Platform | All | The joined app |
| Skills Knowledge Graph | Harin, Bhuvi | `/graph` |
| Future Skills Forecast Dashboard | Harin, Bhuvi | `/forecast` |
| Learning Recommendation Engine | Harshit, Bhuvi | `/learning/:id` |
| Internal Mobility Recommendation Module | Harshit, Bhuvi | `/mobility/:id` |
| Workforce Analytics Report | Krish, Harshit | `/report`, PDF and CSV |
| Technical Documentation | Krish, all | `docs/TECHNICAL_DOCUMENTATION.md` |

| Evaluation area | How we show it |
|---|---|
| Forecast Accuracy | Backtest MAPE against the naive baseline, shown in the app |
| Recommendation Relevance | Each course linked to a named gap and future demand |
| Explainability | `ExplanationPanel` on every prediction |
| Business Impact | Readiness index with and without action |
| Innovation | Local ML, graph analytics and grounded Gemini text working together |

| Scope boundary | Control |
|---|---|
| Hiring decisions stay human-controlled | HR review on mobility, with no automatic assignment or rejection |
| Sensitive attributes cannot influence recommendations | Not in the data, plus `assert_clean()` and its test |
| Workforce data may be anonymized | Dummy data with employee IDs only |

## 15. Demo Script (5 Minutes)

1. **HR view, `/forecast`:** readiness index, rising skills, and the Agentic AI forecast. Open the explanation and accuracy card, and state that the data is dummy data.
2. **`/graph` and `/risk`:** show why Agentic AI is a high risk, including the single-expert dependency.
3. **Employee view, `E-0007`:** profile and gaps, then the learning path with reasons.
4. **`/mobility` and `/career`:** the ML Engineer match, shown as Awaiting HR review.
5. **HR view, `/review`:** approve the mobility item, override or reject another, then show the employee view change and the audit entry.
6. **`/report`:** export the Workforce Analytics Report.
7. **Close:** show that sensitive attributes are excluded, and that a Gemini outage falls back safely.

## 16. Verification

**Automated:** run `pytest` in `backend`, `npm run build` in `frontend`, and `python scripts/smoke.py` from the repo root.

| Owner | Must-have checks |
|---|---|
| Harin | Backtest never trains on test quarters, forecast length is 4, seed counts match, seed data passes `assert_clean()`, unknown Gemini IDs are rejected |
| Harshit | Evidence weighting, surplus skills create no gap, risk stays within 0-100, every recommended course closes a listed gap, prerequisites come first, non-HR gets 403, repeat submit makes no duplicate |
| Bhuvi | All 8 pages load in both roles, with loading, error and empty states |
| Krish | A decision updates status and audit, rejected items disappear for the employee, the report prints and CSV downloads |

**End to end, at 3:30 and again before submitting**
1. Clone the repo fresh and follow section 11.
2. Run the demo script with `LLM_MODE=mock`.
3. Run it again with `LLM_MODE=gemini`, and confirm reasons come from Gemini.
4. Remove the API key and confirm the app still works with template text.
5. Approve an item, then confirm the employee view and audit log both change.

## Sources

- [What's new in Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model?hl=en)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations)
