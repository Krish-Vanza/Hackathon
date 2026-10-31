import numpy as np

from app import db as dbm
from ml.features import build_samples, feature_row, series_by_skill
from ml.train_forecast import backtest
from seed.generate_seed import build_dataset


def _samples():
    data = build_dataset()
    series = series_by_skill(data[dbm.MARKET_SIGNALS])
    categories = {s["skill_id"]: s["category"] for s in data[dbm.SKILLS]}
    return series, categories, *build_samples(series, categories)


def test_features_use_only_the_past():
    series, categories, *_ = _samples()
    s = series["S-028"]
    t = 10
    changed = s["demand"].copy()
    changed[t + 1 :] *= 5  # changing the future must not change features at t
    a = feature_row(s["demand"], s["postings"], t, categories["S-028"])
    b = feature_row(changed, s["postings"], t, categories["S-028"])
    assert np.allclose(a, b)


def test_backtest_never_trains_on_test_quarters():
    series, categories, X, y, meta = _samples()
    base = backtest(X, y, meta, series)
    # Corrupt every label in the final quarter. Only that origin may change.
    last = max(m[1] for m in meta)
    y_bad = y.copy()
    y_bad[[i for i, m in enumerate(meta) if m[1] == last]] = 10.0
    earlier = backtest(X, y_bad, meta, series, n_origins=4)
    errors_base = base["growth_errors"][:-40]
    errors_bad = earlier["growth_errors"][:-40]
    assert np.allclose(errors_base, errors_bad)
    assert base["test_quarters"] == ["2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"]


def test_model_beats_naive(seeded_db):
    _, run = seeded_db
    assert run["model_mape"] < run["naive_mape"]
    assert 0 <= run["win_rate"] <= 1


def test_forecast_shape_and_band(seeded_db):
    db, _ = seeded_db
    forecasts = list(db[dbm.FORECASTS].find({}, {"_id": 0}))
    assert len(forecasts) == 40
    for f in forecasts:
        assert len(f["forecast"]) == 4 and len(f["low"]) == 4 and len(f["high"]) == 4
        for p in f["forecast"]:
            assert p["low"] <= p["demand_fte"] <= p["high"]
        exp = f["explanation"]
        assert exp["method"] == "Ridge forecast" and exp["source"] == "model"
        assert 0 <= exp["confidence"] <= 1
        assert abs(sum(fa["weight"] for fa in exp["factors"]) - 1) < 0.01
        assert f["trend_status"] in {"emerging", "stable", "declining"}


def test_agentic_ai_is_emerging(seeded_db):
    db, _ = seeded_db
    f = db[dbm.FORECASTS].find_one({"skill_id": "S-028"}, {"_id": 0})
    assert f["trend_status"] == "emerging"
    top = db[dbm.FORECASTS].find_one({}, {"_id": 0}, sort=[("growth_pct", -1)])
    assert top["skill_id"] == "S-028"
