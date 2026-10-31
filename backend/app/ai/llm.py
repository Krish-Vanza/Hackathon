"""The single helper for every Gemini call.

    generate_json(prompt, schema, fallback, allowed_ids=None) -> BaseModel

- JSON mode with a Pydantic response schema, validated on the way back.
- Cached by prompt hash in the `llm_cache` collection.
- Rejects a response that names an ID outside `allowed_ids`.
- On any failure, or with LLM_MODE=mock, returns `fallback`. The demo never
  crashes because of Gemini.

Use `generate_json_with_source` when you also need to know whether the answer
came from "gemini" or the "template" fallback.
"""

import hashlib
import logging
import os
import re
from datetime import datetime, timezone

from pydantic import BaseModel

from app import db as dbm

log = logging.getLogger(__name__)

ID_PATTERN = re.compile(r"\b(?:S-\d{3}|R-\d{2}|E-\d{4}|C-\d{3}|OR-\d{2}|P-\d{3})\b")
TIMEOUT_MS = 20_000

_client = None


def llm_mode() -> str:
    mode = os.getenv("LLM_MODE", "mock").lower()
    if mode == "gemini" and not os.getenv("GEMINI_API_KEY"):
        return "mock"
    return mode


def model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


def status() -> dict:
    """For /api/health."""
    return {"mode": llm_mode(), "model": model_name() if llm_mode() == "gemini" else None}


def _gemini_client():
    global _client
    if _client is None:
        from google import genai
        from google.genai import types

        _client = genai.Client(
            api_key=os.environ["GEMINI_API_KEY"], http_options=types.HttpOptions(timeout=TIMEOUT_MS)
        )
    return _client


def _call_gemini(prompt: str, schema: type[BaseModel]) -> str:
    from google.genai import types

    response = _gemini_client().models.generate_content(
        model=model_name(),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=schema, temperature=0.2
        ),
    )
    return response.text


def _cache_key(prompt: str, schema: type[BaseModel]) -> str:
    return hashlib.sha256(f"{model_name()}|{schema.__name__}|{prompt}".encode()).hexdigest()


def _cache_get(key: str):
    try:
        doc = dbm.get_db()[dbm.LLM_CACHE].find_one({"prompt_hash": key}, {"_id": 0, "response": 1})
        return doc["response"] if doc else None
    except Exception:
        return None


def _cache_put(key: str, text: str) -> None:
    try:
        dbm.get_db()[dbm.LLM_CACHE].update_one(
            {"prompt_hash": key},
            {"$set": {"response": text, "model": model_name(), "at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception:
        log.warning("Could not write llm_cache")


def unknown_ids(text: str, allowed_ids) -> set[str]:
    return set(ID_PATTERN.findall(text)) - set(allowed_ids)


def generate_json_with_source(prompt, schema, fallback, allowed_ids=None) -> tuple[BaseModel, str]:
    """Same as generate_json, and also returns "gemini" or "template"."""
    if llm_mode() != "gemini":
        return fallback, "template"
    key = _cache_key(prompt, schema)
    try:
        text = _cache_get(key)
        cached = text is not None
        if not cached:
            text = _call_gemini(prompt, schema)
        result = schema.model_validate_json(text)
        if allowed_ids is not None:
            bad = unknown_ids(text, allowed_ids)
            if bad:
                raise ValueError(f"Gemini named unknown IDs: {sorted(bad)}")
        if not cached:
            _cache_put(key, text)
        return result, "gemini"
    except Exception as exc:
        log.warning("Gemini call failed, using template: %s", exc)
        return fallback, "template"


def generate_json(prompt, schema, fallback, allowed_ids=None) -> BaseModel:
    return generate_json_with_source(prompt, schema, fallback, allowed_ids)[0]
