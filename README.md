# Skill Gap and Workforce Evolution Predictor

An AI-powered workforce intelligence platform built for the HCLTech hackathon (Project 4). It analyzes employee skills and market demand, forecasts future skill needs, and recommends learning paths and internal role moves. Every suggestion is explained, and HR makes every decision.

All data is generated dummy data. Employees appear only as IDs such as `E-0007`.

**Team:** Harin (data, models and AI), Harshit (FastAPI backend), Bhuvi (main frontend), Krish (governance frontend and docs).

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (JavaScript), Vite, Tailwind, Recharts, `react-force-graph-2d` |
| Backend | FastAPI, Pydantic |
| Database | MongoDB Atlas, using `pymongo` |
| Forecast | Local scikit-learn Ridge model |
| Graph | NetworkX |
| AI text | Google Gemini, with template fallback |

`architecture.html` shows the full design, and `plan.md` holds the implementation plan.

## Run it

You need Python 3.12 or newer and Node.js LTS. Commands are for Windows PowerShell. On macOS or Linux, use `source .venv/bin/activate` and `cp` instead.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Put the team's `MONGODB_URI` in `backend/.env`, then start the server:

```powershell
uvicorn app.main:app --reload --port 8000
```

Check `http://localhost:8000/api/health`. API docs are at `http://localhost:8000/docs`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Use **Demo role** at the top right to switch between HR and Employee.

**Requirements Tour** in the sidebar walks through FR-01 to FR-10 one step at a time. Each step quotes the brief, proves the requirement with live API data, and links to the screen that delivers it.

## Data modes

| Mode | How to use it | Data |
|---|---|---|
| Full data | Set `MONGODB_URI` in `backend/.env` | 60 employees, 40 skills and the trained forecast in MongoDB |
| Sample data | Leave `MONGODB_URI` empty | A small built-in dataset. Reviews and audit events reset on restart |
| Frontend only | Run `npm run dev:mock` | Dummy responses, with no backend needed |

`/api/health` reports the active mode in `data_source`.

**Gemini is optional.** Set `GEMINI_API_KEY` and `LLM_MODE=gemini` in `backend/.env` for Gemini text, which uses `gemini-3.1-flash-lite`. Otherwise, or if a Gemini call fails, the app uses template text.

**Only Harin seeds the shared database**, because `--reset` erases it, including reviews:

```powershell
python -m seed.generate_seed --reset
python -m ml.train_forecast
python -m seed.check
```

## Test it

```powershell
cd backend
pytest
```

```powershell
cd frontend
npm run lint
npm run build
```

With the backend running, run `python scripts/smoke.py` from the repo root to call every endpoint.

## Demo in 5 minutes

1. **`/forecast` as HR:** readiness, rising skills, the accuracy card and the market brief.
2. **`/graph` and `/risk`:** open **Why?** on Agentic AI to show the single-expert dependency.
3. **`/profile/E-0007` as Employee:** skills, gaps and the learning path with reasons.
4. **`/mobility/E-0007` and `/career/E-0007`:** the ML Engineer match, shown as **Awaiting HR review**.
5. **`/review` as HR:** approve the match and reject or change another, then show the Employee view and `/audit`.
6. **`/report`:** print to PDF or download the CSV.

Suggestions join the HR queue when their page is first opened, so open step 4 before step 5.

## Limits

- All accuracy figures come from dummy data.
- The Demo role switch is not authentication.
- Candidate lists are decision support only. Nothing assigns or rejects anyone automatically.

See [docs/TECHNICAL_DOCUMENTATION.md](docs/TECHNICAL_DOCUMENTATION.md) for details.
