"""Shared MongoDB connection and indexes.

Every module reads and writes MongoDB through `get_db()`. Queries should pass
`{"_id": 0}` as the projection, because ObjectId is not JSON serializable.
"""

import os
from pathlib import Path

import certifi
from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SKILLS = "skills"
ROLES = "roles"
EMPLOYEES = "employees"
COURSES = "courses"
OPEN_ROLES = "open_roles"
MARKET_SIGNALS = "market_signals"
FORECASTS = "forecasts"
MODEL_RUNS = "model_runs"
REVIEWS = "reviews"
AUDIT_LOG = "audit_log"
LLM_CACHE = "llm_cache"

# Collections the seed script owns. `--reset` also clears reviews and audit_log.
SEED_COLLECTIONS = [SKILLS, ROLES, EMPLOYEES, COURSES, OPEN_ROLES, MARKET_SIGNALS]

_client = None
_db_override = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI is not set. Add it to backend/.env.")
        # Python on macOS has no system CA bundle, so Atlas TLS needs certifi's.
        tls = {"tlsCAFile": certifi.where()} if uri.startswith("mongodb+srv") else {}
        _client = MongoClient(uri, serverSelectionTimeoutMS=8000, tz_aware=True, **tls)
    return _client


def get_db():
    """Return the shared database. Tests can swap it with `set_db()`."""
    if _db_override is not None:
        return _db_override
    return get_client()[os.getenv("MONGODB_DB", "workforce")]


def set_db(db) -> None:
    """Use another database object, such as a mongomock one in tests. Pass None to reset."""
    global _db_override
    _db_override = db


def ping() -> bool:
    try:
        get_db().command("ping")
        return True
    except Exception:
        return False


def ensure_indexes(db=None) -> None:
    db = db if db is not None else get_db()
    db[SKILLS].create_index([("skill_id", ASCENDING)], unique=True)
    db[ROLES].create_index([("role_id", ASCENDING)], unique=True)
    db[EMPLOYEES].create_index([("employee_id", ASCENDING)], unique=True)
    db[EMPLOYEES].create_index([("department", ASCENDING)])
    db[COURSES].create_index([("course_id", ASCENDING)], unique=True)
    db[OPEN_ROLES].create_index([("open_role_id", ASCENDING)], unique=True)
    db[MARKET_SIGNALS].create_index([("skill_id", ASCENDING), ("quarter", ASCENDING)], unique=True)
    db[FORECASTS].create_index([("skill_id", ASCENDING)], unique=True)
    db[MODEL_RUNS].create_index([("trained_at", ASCENDING)])
    db[REVIEWS].create_index([("review_id", ASCENDING)], unique=True)
    db[REVIEWS].create_index(
        [("type", ASCENDING), ("subject_id", ASCENDING), ("key", ASCENDING)], unique=True
    )
    db[AUDIT_LOG].create_index([("at", ASCENDING)])
    db[LLM_CACHE].create_index([("prompt_hash", ASCENDING)], unique=True)
