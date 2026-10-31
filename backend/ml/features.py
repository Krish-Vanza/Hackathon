"""Features for the skill demand forecast.

For each skill and quarter t, the model sees only data up to t and predicts the
percentage change in `demand_fte` from t to t + 1. Percentage change keeps small
and large skills on the same scale, so one model can learn from all 40 skills.
"""

from collections import defaultdict

import numpy as np

N_LAGS = 4
CATEGORIES = ["AI & ML", "Cloud & DevOps", "Data", "Frontend", "Practices", "Programming", "Security"]

NUMERIC_FEATURES = ["chg_lag1", "chg_lag2", "chg_lag3", "chg_lag4", "postings_growth", "vs_rolling_avg"]
FEATURE_NAMES = NUMERIC_FEATURES + [f"cat_{c}" for c in CATEGORIES]

# Feature groups shown to people as explanation factors.
FACTOR_GROUPS = {
    "Last quarter's demand change": ["chg_lag1"],
    "Earlier demand momentum": ["chg_lag2", "chg_lag3", "chg_lag4"],
    "Job postings growth": ["postings_growth"],
    "Demand versus 4-quarter average": ["vs_rolling_avg"],
    "Skill category": [f"cat_{c}" for c in CATEGORIES],
}


def series_by_skill(signals: list[dict]) -> dict[str, dict]:
    """Group market_signals rows into per-skill arrays ordered by quarter."""
    grouped = defaultdict(list)
    for row in signals:
        grouped[row["skill_id"]].append(row)
    out = {}
    for skill_id, rows in grouped.items():
        rows.sort(key=lambda r: r["quarter"])
        out[skill_id] = {
            "quarters": [r["quarter"] for r in rows],
            "demand": np.array([r["demand_fte"] for r in rows], dtype=float),
            "postings": np.array([r["job_postings_index"] for r in rows], dtype=float),
        }
    return out


def feature_row(demand: np.ndarray, postings: np.ndarray, t: int, category: str) -> np.ndarray:
    """Features at quarter index t, using demand[: t + 1] and postings[: t + 1] only."""
    if t < N_LAGS:
        raise ValueError("Need at least 4 earlier quarters")
    changes = [demand[t - k] / demand[t - k - 1] - 1 for k in range(N_LAGS)]
    postings_growth = postings[t] / postings[t - 1] - 1
    vs_rolling = demand[t] / demand[t - N_LAGS + 1 : t + 1].mean() - 1
    cats = [1.0 if category == c else 0.0 for c in CATEGORIES]
    return np.array(changes + [postings_growth, vs_rolling] + cats, dtype=float)


def build_samples(series: dict[str, dict], categories: dict[str, str]):
    """Return X, y and meta. meta[i] = (skill_id, target quarter index)."""
    X, y, meta = [], [], []
    for skill_id, s in sorted(series.items()):
        demand, postings = s["demand"], s["postings"]
        for t in range(N_LAGS, len(demand) - 1):
            X.append(feature_row(demand, postings, t, categories[skill_id]))
            y.append(demand[t + 1] / demand[t] - 1)
            meta.append((skill_id, t + 1))
    return np.array(X), np.array(y), meta
