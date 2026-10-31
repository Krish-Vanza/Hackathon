import json

import pytest

from app.ai import llm
from app.ai.extraction import ExtractionResult, extract_skills
from app.ai.narratives import course_reason, market_brief


@pytest.fixture
def gemini_on(monkeypatch, seeded_db):
    monkeypatch.setenv("LLM_MODE", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")


def test_mock_mode_uses_fallback(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "mock")
    fallback = ExtractionResult(skills=[])
    result, source = llm.generate_json_with_source("hi", ExtractionResult, fallback)
    assert result is fallback and source == "template"


def test_unknown_ids_are_rejected(monkeypatch, gemini_on):
    reply = json.dumps({"skills": [{"skill_id": "S-999", "confidence": 0.9, "evidence": "x"}]})
    monkeypatch.setattr(llm, "_call_gemini", lambda prompt, schema: reply)
    fallback = ExtractionResult(skills=[])
    result, source = llm.generate_json_with_source("unique prompt 1", ExtractionResult, fallback, {"S-001"})
    assert source == "template" and result is fallback


def test_valid_reply_is_used_and_cached(monkeypatch, gemini_on):
    reply = json.dumps({"skills": [{"skill_id": "S-001", "confidence": 0.95, "evidence": "built APIs in Python"}]})
    calls = []
    monkeypatch.setattr(llm, "_call_gemini", lambda prompt, schema: calls.append(1) or reply)
    for _ in range(2):
        result, source = llm.generate_json_with_source("unique prompt 2", ExtractionResult, None, {"S-001"})
        assert source == "gemini" and result.skills[0].skill_id == "S-001"
    assert len(calls) == 1


def test_gemini_failure_falls_back(monkeypatch, gemini_on):
    def boom(prompt, schema):
        raise RuntimeError("429")

    monkeypatch.setattr(llm, "_call_gemini", boom)
    out = market_brief()
    assert out["source"] == "template" and out["skill_ids"][0] == "S-028"


def test_missing_key_means_mock(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert llm.llm_mode() == "mock"


def test_keyword_extraction(monkeypatch, seeded_db):
    monkeypatch.setenv("LLM_MODE", "mock")
    out = extract_skills("Built REST API Design reviews in Python and deployed to k8s.")
    by_id = {s["skill_id"]: s for s in out["skills"]}
    assert by_id["S-001"]["confidence"] == 0.85 and not by_id["S-001"]["needs_review"]
    assert by_id["S-016"]["needs_review"]  # alias match only, so HR checks it
    assert out["source"] == "template"


def test_reason_templates(monkeypatch, seeded_db):
    monkeypatch.setenv("LLM_MODE", "mock")
    course = course_reason({
        "course_id": "C-017", "course_title": "Applied Machine Learning", "skill_id": "S-023",
        "skill_name": "Machine Learning", "current_level": 2, "target_level": 4, "growth_pct": 12, "hours": 20,
    })
    assert "Applied Machine Learning" in course["reason"] and course["source"] == "template"
    move = course_reason({"role_id": "R-05", "role_title": "ML Engineer", "readiness_pct": 82, "missing_skills": ["MLOps"]})
    assert "82%" in move["reason"]


def test_sensitive_facts_are_blocked(seeded_db):
    with pytest.raises(ValueError):
        course_reason({"course_id": "C-001", "gender": "x"})
