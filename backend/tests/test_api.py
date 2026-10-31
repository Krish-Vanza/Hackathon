import csv
import io

import pytest

from app.schemas import Explanation
from app.services import reviews, scoring

STORY_EMPLOYEE = "E-0007"
EXPLAINED_PATHS = [
    f"/api/employees/{STORY_EMPLOYEE}/profile",
    f"/api/employees/{STORY_EMPLOYEE}/gaps",
    "/api/market/brief",
    "/api/forecast/skills/S-AGENT",
    "/api/readiness",
    f"/api/learning/{STORY_EMPLOYEE}",
]


def review_for(client, hr, type):
    return client.get(f"/api/reviews?type={type}", headers=hr).json()


def decide(client, hr, review_id, decision, **body):
    return client.post(f"/api/reviews/{review_id}/decision", json={"decision": decision, **body}, headers=hr)


def test_health_reports_sample_data(client):
    body = client.get("/api/health").json()
    assert body["database"] == "ok" and body["data_source"] == "sample-memory"


def test_me_defaults_to_employee_and_accepts_hr(client, hr):
    assert client.get("/api/me").json()["role"] == "employee"
    assert client.get("/api/me", headers=hr).json()["role"] == "hr"


def test_unknown_role_is_rejected(client):
    assert client.get("/api/me", headers={"X-Demo-Role": "admin"}).status_code == 400


@pytest.mark.parametrize("path", EXPLAINED_PATHS)
def test_prediction_carries_explanation(client, path):
    response = client.get(path)
    assert response.status_code == 200
    Explanation.model_validate(response.json()["explanation"])


@pytest.mark.parametrize("path,field", [
    (f"/api/mobility/{STORY_EMPLOYEE}", "matches"),
    (f"/api/career/{STORY_EMPLOYEE}", "paths"),
])
def test_list_items_carry_explanations(client, path, field):
    items = client.get(path).json()[field]
    assert items
    for item in items:
        Explanation.model_validate(item["explanation"])


def test_risk_and_future_gaps_carry_explanations(client):
    for path in ("/api/risk", "/api/forecast/gaps"):
        for row in client.get(path).json():
            Explanation.model_validate(row["explanation"])


def test_unknown_ids_return_404(client):
    for path in ("/api/employees/E-9999/profile", "/api/learning/E-9999", "/api/forecast/skills/NOPE",
                 "/api/mobility/E-9999", "/api/career/E-9999"):
        assert client.get(path).status_code == 404


def test_gaps_rank_by_severity_and_skip_surplus(client):
    gaps = client.get(f"/api/employees/{STORY_EMPLOYEE}/gaps?role_id=R-ML").json()["gaps"]
    severities = [gap["severity"] for gap in gaps]
    assert severities == sorted(severities, reverse=True)
    assert all(gap["effective"] < gap["required"] for gap in gaps)
    assert "S-PY" not in {gap["skill_id"] for gap in gaps}


def test_org_heatmap_is_a_full_grid(client):
    body = client.get("/api/gaps/org").json()
    assert len(body["cells"]) == len(body["departments"]) * len(body["categories"])


def test_every_course_closes_a_listed_gap(client):
    body = client.get(f"/api/learning/{STORY_EMPLOYEE}?role_id=R-ML").json()
    gaps = client.get(f"/api/employees/{STORY_EMPLOYEE}/gaps?role_id=R-ML").json()["gaps"]
    listed = {gap["skill_id"] for gap in gaps}
    assert body["courses"]
    for course in body["courses"]:
        assert set(course["closes_gaps"]) & listed and course["reason"]


def test_learning_plan_orders_prerequisites_first(client):
    courses = client.get("/api/learning/E-0009?role_id=R-AIA").json()["courses"]
    position = {skill: index for index, course in enumerate(courses) for skill in course["skills_taught"]}
    assert position["S-LLM"] < position["S-AGENT"]


def test_planted_story_ml_engineer_is_top_match(client):
    match = client.get(f"/api/mobility/{STORY_EMPLOYEE}").json()["matches"][0]
    assert match["role_id"] == "R-ML"
    assert match["review_status"] == "pending"
    assert match["review_label"] == "Awaiting HR review"


def test_planted_story_agentic_ai_is_high_risk(client):
    rows = client.get("/api/risk").json()
    agentic = next(row for row in rows if row["skill_id"] == "S-AGENT")
    assert agentic["level"] == "high"
    assert agentic["exposed_departments"] == ["Data"]
    assert all(0 <= row["score"] <= 100 for row in rows)


def test_candidates_are_hr_only(client, hr):
    assert client.get("/api/mobility/roles/R-ML/candidates").status_code == 403
    body = client.get("/api/mobility/roles/R-ML/candidates", headers=hr).json()
    assert body["decision_support"] is True
    assert body["candidates"][0]["employee_id"] == STORY_EMPLOYEE


def test_decision_is_hr_only(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    review = review_for(client, hr, "mobility")[0]
    assert decide(client, {}, review["review_id"], "approved").status_code == 403
    assert review_for(client, hr, "mobility")[0]["status"] == "pending"


def test_repeat_loads_make_no_duplicates(client, hr):
    for _ in range(3):
        client.get(f"/api/mobility/{STORY_EMPLOYEE}")
        client.get(f"/api/learning/{STORY_EMPLOYEE}")
    assert len(review_for(client, hr, "mobility")) == 3
    assert len(review_for(client, hr, "learning_plan")) == 1


def test_repeat_submit_returns_the_same_review():
    first = reviews.submit_for_review("mobility", "E-1", "R-1", "t", {}, {})
    second = reviews.submit_for_review("mobility", "E-1", "R-1", "changed", {}, {})
    assert first["review_id"] == second["review_id"] and second["title"] == "t"


def test_approval_updates_employee_view_and_audit(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    target = next(row for row in review_for(client, hr, "mobility") if row["key"] == "R-ML")
    assert decide(client, hr, target["review_id"], "approved", comment="Good fit").status_code == 200

    match = client.get(f"/api/mobility/{STORY_EMPLOYEE}").json()["matches"][0]
    assert match["review_status"] == "approved"
    event = client.get("/api/audit").json()[0]
    assert event["event"] == "review_approved" and event["entity"] == target["review_id"]


def test_rejected_item_disappears_for_employee_only(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    target = next(row for row in review_for(client, hr, "mobility") if row["key"] == "R-ML")
    decide(client, hr, target["review_id"], "rejected")

    employee_roles = {row["role_id"] for row in client.get(f"/api/mobility/{STORY_EMPLOYEE}").json()["matches"]}
    hr_roles = {row["role_id"] for row in client.get(f"/api/mobility/{STORY_EMPLOYEE}", headers=hr).json()["matches"]}
    assert "R-ML" not in employee_roles and "R-ML" in hr_roles


def test_rejected_learning_plan_is_hidden(client, hr):
    client.get(f"/api/learning/{STORY_EMPLOYEE}")
    decide(client, hr, review_for(client, hr, "learning_plan")[0]["review_id"], "rejected")
    body = client.get(f"/api/learning/{STORY_EMPLOYEE}").json()
    assert body["hidden"] is True and body["courses"] == []


def test_override_needs_values_and_comment_then_applies(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    target = next(row for row in review_for(client, hr, "mobility") if row["key"] == "R-ML")
    assert decide(client, hr, target["review_id"], "overridden").status_code == 409

    response = decide(client, hr, target["review_id"], "overridden", comment="Adjusted", override={"bridge_weeks": 2})
    assert response.status_code == 200
    match = next(row for row in client.get(f"/api/mobility/{STORY_EMPLOYEE}").json()["matches"] if row["role_id"] == "R-ML")
    assert match["bridge_weeks"] == 2 and match["review_status"] == "overridden"


def test_learning_override_reaches_the_employee(client, hr):
    client.get(f"/api/learning/{STORY_EMPLOYEE}")
    review = review_for(client, hr, "learning_plan")[0]
    decide(client, hr, review["review_id"], "overridden", comment="Adjusted", override={"weeks": 3})
    body = client.get(f"/api/learning/{STORY_EMPLOYEE}").json()
    assert body["weeks"] == 3 and body["review_status"] == "overridden"


def test_decision_comment_cannot_carry_sensitive_text(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    target = review_for(client, hr, "mobility")[0]
    assert decide(client, hr, target["review_id"], "approved", comment="gender: x").status_code == 422
    assert review_for(client, hr, "mobility")[0]["status"] == "pending"


def test_extraction_blocks_sensitive_text_before_the_llm(client):
    response = client.post("/api/skills/extract", json={"text": "Python developer, age: 30"})
    assert response.status_code == 422


def test_health_reports_template_mode_without_a_gemini_key(client, monkeypatch):
    monkeypatch.setenv("LLM_MODE", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert client.get("/api/health").json()["llm_mode"] == "mock"


def test_forecast_factors_keep_the_stored_wording(seeded_db):
    from app.services import forecasts

    stored = seeded_db[0]["forecasts"].find_one({"skill_id": "S-028"}, {"_id": 0})
    rows = forecasts._factors(stored)
    assert rows[0]["value"] == stored["factors"][0]["value"]
    assert round(sum(row["weight"] for row in rows), 2) == 1


def test_override_cannot_add_sensitive_fields(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    target = review_for(client, hr, "mobility")[0]
    response = decide(client, hr, target["review_id"], "overridden", comment="x", override={"gender": "x"})
    assert response.status_code == 422


def test_review_cannot_be_decided_twice(client, hr):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    review_id = review_for(client, hr, "mobility")[0]["review_id"]
    assert decide(client, hr, review_id, "approved").status_code == 200
    assert decide(client, hr, review_id, "rejected").status_code == 409


def test_forecast_shape_and_flag(client, hr):
    body = client.get("/api/forecast/skills/S-AGENT").json()
    assert len(body["forecast"]) == len(body["low"]) == len(body["high"]) == 4
    assert body["flag"] is None
    assert client.post("/api/forecast/skills/S-AGENT/flag", json={"reason": "check"}).status_code == 200
    assert client.get("/api/forecast/skills/S-AGENT").json()["flag"]["review_status"] == "pending"
    assert len(review_for(client, hr, "forecast_flag")) == 1


def test_top_skills_put_agentic_ai_first(client):
    rows = client.get("/api/forecast/skills?top=3").json()
    assert len(rows) == 3 and rows[0]["skill_id"] == "S-AGENT"


def test_accuracy_compares_with_naive_and_mentions_dummy_data(client):
    body = client.get("/api/forecast/accuracy").json()
    assert body["beats_naive"] is True and "dummy" in body["note"]


def test_readiness_values_and_plan_benefit(client):
    body = client.get("/api/readiness").json()
    assert all(0 <= body[key] <= 100 for key in ("now", "no_action", "with_plans"))
    assert body["with_plans"] >= body["no_action"]


def test_extraction_matches_known_skills(client):
    body = client.post("/api/skills/extract", json={"text": "I use Python and Agentic AI daily"}).json()
    assert {row["skill_id"] for row in body["matches"]} == {"S-PY", "S-AGENT"}
    Explanation.model_validate(body["explanation"])


def test_low_confidence_extraction_goes_to_hr(client, hr, monkeypatch):
    from app import ai_bridge
    monkeypatch.setattr(ai_bridge, "extract_skills", lambda *_: ([
        {"skill_id": "S-PY", "confidence": 0.5},
        {"skill_id": "HALLUCINATED", "confidence": 0.99},
    ], "gemini"))
    body = client.post("/api/skills/extract", json={"text": "x", "employee_id": STORY_EMPLOYEE}).json()
    assert [row["skill_id"] for row in body["matches"]] == ["S-PY"]
    assert body["matches"][0]["review_status"] == "pending"
    assert len(review_for(client, hr, "skill_claim")) == 1


def test_graph_focus_narrows_nodes(client):
    full = client.get("/api/graph").json()
    focused = client.get("/api/graph?focus=S-AGENT").json()
    assert 0 < len(focused["nodes"]) < len(full["nodes"])


def test_report_json_and_csv(client):
    client.get(f"/api/mobility/{STORY_EMPLOYEE}")
    report = client.get("/api/reports/workforce").json()
    assert report["mobility_pipeline"]["pending"] == 3
    assert report["top_risks"][0]["level"] == "high"

    response = client.get("/api/reports/workforce.csv")
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    rows = list(csv.reader(io.StringIO(response.text)))
    assert ["Skill ID", "Skill", "Risk score", "Risk level"] in rows


def test_supply_uses_qualified_level(client):
    rows = {row["skill_id"]: row for row in client.get("/api/forecast/gaps").json()}
    assert rows["S-AGENT"]["current_supply"] == 1
    assert rows["S-AGENT"]["projected_supply"] == pytest.approx(scoring.project_supply(1), abs=0.01)
