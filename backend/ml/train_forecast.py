"""Train the local demand forecast, backtest it and store forecasts in MongoDB.

Run from `backend/` after seeding:
    python -m ml.train_forecast

Model: StandardScaler + Ridge on all 40 skills, applied recursively for 4 quarters.
Backtest: rolling origin over the last 4 quarters against a naive last-value
forecast. A test quarter never appears in its own training data.
"""

import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app import db as dbm
from ml.features import FACTOR_GROUPS, FEATURE_NAMES, build_samples, feature_row, series_by_skill
from seed.catalog import next_quarters

HORIZON = 4
N_BACKTEST = 4
ALPHA = 1.0
EMERGING_GROWTH = 0.10  # 4-quarter growth at or above this is "emerging"
DECLINING_GROWTH = -0.05
MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "forecast_model.joblib"


def make_model():
    return make_pipeline(StandardScaler(), Ridge(alpha=ALPHA))


def _mape(actual, predicted) -> float:
    actual, predicted = np.asarray(actual), np.asarray(predicted)
    return float(np.mean(np.abs(actual - predicted) / np.abs(actual)) * 100)


def backtest(X, y, meta, series, n_origins=N_BACKTEST) -> dict:
    """Rolling-origin backtest of one-quarter-ahead forecasts."""
    target_idx = np.array([m[1] for m in meta])
    last = int(target_idx.max())
    actual, model_pred, naive_pred, growth_errors, origins = [], [], [], [], []
    for k in range(last - n_origins + 1, last + 1):
        train, test = target_idx < k, target_idx == k
        assert target_idx[train].max() < k, "test quarter leaked into training"
        model = make_model().fit(X[train], y[train])
        pred_growth = model.predict(X[test])
        for (skill_id, idx), g_hat, g in zip([meta[i] for i in np.where(test)[0]], pred_growth, y[test]):
            prev = series[skill_id]["demand"][idx - 1]
            actual.append(series[skill_id]["demand"][idx])
            model_pred.append(prev * (1 + g_hat))
            naive_pred.append(prev)
            growth_errors.append(g - g_hat)
        origins.append(series[next(iter(series))]["quarters"][k])
    actual, model_pred, naive_pred = map(np.array, (actual, model_pred, naive_pred))
    return {
        "model_mape": round(_mape(actual, model_pred), 2),
        "naive_mape": round(_mape(actual, naive_pred), 2),
        "win_rate": round(float(np.mean(np.abs(actual - model_pred) < np.abs(actual - naive_pred))), 3),
        "test_quarters": origins,
        "n_test": int(len(actual)),
        "growth_errors": np.array(growth_errors),
    }


def _factors(model, x: np.ndarray) -> list[dict]:
    """Contribution of each feature group = sum of coefficient x scaled value."""
    scaler, ridge = model.named_steps["standardscaler"], model.named_steps["ridge"]
    contrib = dict(zip(FEATURE_NAMES, ridge.coef_ * scaler.transform(x.reshape(1, -1))[0]))
    raw = dict(zip(FEATURE_NAMES, x))
    values = {
        "Last quarter's demand change": f"{raw['chg_lag1'] * 100:+.1f}% last quarter",
        "Earlier demand momentum": f"{np.mean([raw['chg_lag2'], raw['chg_lag3'], raw['chg_lag4']]) * 100:+.1f}% a quarter on average before that",
        "Job postings growth": f"{raw['postings_growth'] * 100:+.1f}% job postings change last quarter",
        "Demand versus 4-quarter average": f"{raw['vs_rolling_avg'] * 100:+.1f}% versus its 4-quarter average",
        "Skill category": next((n[4:] for n in FEATURE_NAMES if n.startswith("cat_") and raw[n] == 1), "Other"),
    }
    grouped = {g: float(sum(contrib[f] for f in feats)) for g, feats in FACTOR_GROUPS.items()}
    total = sum(abs(v) for v in grouped.values()) or 1.0
    factors = [
        {"name": g, "value": values[g], "weight": round(abs(v) / total, 3), "direction": "up" if v >= 0 else "down"}
        for g, v in grouped.items()
    ]
    return sorted(factors, key=lambda f: f["weight"], reverse=True)


def forecast_skill(model, s: dict, category: str, band: tuple[float, float], horizon=HORIZON) -> dict:
    """Recursive multi-quarter forecast. Future job postings growth is held at its
    average over the last 2 quarters, since postings for future quarters are unknown."""
    demand, postings = s["demand"].copy(), s["postings"].copy()
    posting_growth = float(np.mean(postings[-2:] / postings[-3:-1] - 1))
    first_x = feature_row(demand, postings, len(demand) - 1, category)
    points = []
    for _ in range(horizon):
        x = feature_row(demand, postings, len(demand) - 1, category)
        g = float(model.predict(x.reshape(1, -1))[0])
        demand = np.append(demand, demand[-1] * (1 + g))
        postings = np.append(postings, postings[-1] * (1 + posting_growth))
        points.append(float(demand[-1]))
    lo_q, hi_q = band
    low = [p * max(0.0, 1 + lo_q * np.sqrt(h + 1)) for h, p in enumerate(points)]
    high = [p * (1 + hi_q * np.sqrt(h + 1)) for h, p in enumerate(points)]
    return {"points": points, "low": low, "high": high, "first_x": first_x}


def trend_status(growth: float) -> str:
    if growth >= EMERGING_GROWTH:
        return "emerging"
    if growth <= DECLINING_GROWTH:
        return "declining"
    return "stable"


def train_and_store(db=None, save_model: bool = True) -> dict:
    db = db if db is not None else dbm.get_db()
    skills = {s["skill_id"]: s for s in db[dbm.SKILLS].find({}, {"_id": 0})}
    signals = list(db[dbm.MARKET_SIGNALS].find({}, {"_id": 0}))
    if not skills or not signals:
        raise SystemExit("No seed data. Run: python -m seed.generate_seed")

    series = series_by_skill(signals)
    categories = {sid: skills[sid]["category"] for sid in series}
    X, y, meta = build_samples(series, categories)

    bt = backtest(X, y, meta, series)
    band = (float(np.quantile(bt["growth_errors"], 0.10)), float(np.quantile(bt["growth_errors"], 0.90)))
    model = make_model().fit(X, y)

    # Volatile skills get a wider band: scale the shared band by each skill's recent growth volatility.
    vols = {sid: float(np.std(np.diff(s["demand"][-9:]) / s["demand"][-9:-1])) for sid, s in series.items()}
    typical_vol = float(np.median(list(vols.values())))

    trained_at = datetime.now(timezone.utc)
    version = "ridge-" + trained_at.strftime("%Y%m%d-%H%M%S")
    forecasts = []
    for skill_id, s in sorted(series.items()):
        name = skills[skill_id]["name"]
        scale = float(np.clip(vols[skill_id] / typical_vol, 0.5, 2.5))
        fc = forecast_skill(model, s, categories[skill_id], (band[0] * scale, band[1] * scale))
        future_q = next_quarters(s["quarters"][-1], HORIZON)
        last = float(s["demand"][-1])
        growth = fc["points"][-1] / last - 1
        postings_growth = float(s["postings"][-1] / s["postings"][-5] - 1)
        rel_half_width = (fc["high"][-1] - fc["low"][-1]) / (2 * fc["points"][-1])
        factors = _factors(model, fc["first_x"])
        status = trend_status(growth)
        forecasts.append({
            "skill_id": skill_id,
            "skill_name": name,
            "category": categories[skill_id],
            "history": [{"quarter": q, "demand_fte": round(float(v), 2)} for q, v in zip(s["quarters"], s["demand"])],
            "forecast": [
                {"quarter": q, "demand_fte": round(p, 2), "low": round(float(lo), 2), "high": round(float(hi), 2)}
                for q, p, lo, hi in zip(future_q, fc["points"], fc["low"], fc["high"])
            ],
            "low": [round(float(v), 2) for v in fc["low"]],
            "high": [round(float(v), 2) for v in fc["high"]],
            "growth_pct": round(growth * 100, 1),
            "postings_growth_pct": round(postings_growth * 100, 1),
            "trend_status": status,
            "factors": factors,
            "explanation": {
                "summary": (
                    f"{name} demand is forecast to {'rise' if growth >= 0 else 'fall'} "
                    f"{abs(growth) * 100:.0f}% over the next {HORIZON} quarters "
                    f"({last:.0f} to {fc['points'][-1]:.0f} FTE), so it is labelled {status}."
                ),
                "factors": factors,
                "confidence": round(float(np.clip(1 - 3 * rel_half_width, 0.3, 0.95)), 2),
                "method": "Ridge forecast",
                "source": "model",
            },
            "model_version": version,
        })

    run = {
        "version": version,
        "trained_at": trained_at,
        "model_mape": bt["model_mape"],
        "naive_mape": bt["naive_mape"],
        "win_rate": bt["win_rate"],
        "test_quarters": bt["test_quarters"],
        "n_test": bt["n_test"],
        "n_train": int(len(y)),
        "horizon": HORIZON,
        "alpha": ALPHA,
        "band": {"low_q10": round(band[0], 4), "high_q90": round(band[1], 4)},
        "features": FEATURE_NAMES,
        "note": "Accuracy is measured on generated dummy data.",
    }
    db[dbm.FORECASTS].delete_many({})
    db[dbm.FORECASTS].insert_many(forecasts)
    db[dbm.MODEL_RUNS].insert_one(dict(run))
    if save_model:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "version": version, "features": FEATURE_NAMES}, MODEL_PATH)
    return run


def main() -> None:
    run = train_and_store()
    print(f"Model {run['version']}")
    print(f"Backtest over {', '.join(run['test_quarters'])}: model MAPE {run['model_mape']}%, "
          f"naive MAPE {run['naive_mape']}%, model wins {run['win_rate'] * 100:.0f}% of skill-quarters")
    print("Forecasts stored for all skills.")


if __name__ == "__main__":
    sys.exit(main())
