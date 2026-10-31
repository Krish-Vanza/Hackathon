"""Data access for services.

Uses Harin's app/db.py `get_db()` when MONGODB_URI is set. Until then it serves the
in-memory dataset from sample_data.py, so the API runs with no database. /api/health
reports which one is active.
"""
from copy import deepcopy
from threading import Lock

from pymongo.errors import DuplicateKeyError

from app import config, sample_data

_lock = Lock()
_memory: dict[str, list[dict]] | None = None


def _database():
    if not config.MONGODB_URI:
        return None
    try:
        from app.db import get_db
    except ImportError:
        return None
    return get_db()


def _tables() -> dict[str, list[dict]]:
    global _memory
    if _memory is None:
        _memory = sample_data.build()
    return _memory


def reset_memory() -> None:
    global _memory
    with _lock:
        _memory = None


def _matches(doc: dict, query: dict) -> bool:
    return all(doc.get(key) == value for key, value in query.items())


def backend_name() -> str:
    return "mongodb" if _database() is not None else "sample-memory"


def ping() -> bool:
    db = _database()
    if db is None:
        return True
    db.command("ping")
    return True


def find(collection: str, query: dict | None = None) -> list[dict]:
    query = query or {}
    db = _database()
    if db is not None:
        return list(db[collection].find(query, {"_id": 0}))
    with _lock:
        return [deepcopy(doc) for doc in _tables().get(collection, []) if _matches(doc, query)]


def find_one(collection: str, query: dict) -> dict | None:
    db = _database()
    if db is not None:
        return db[collection].find_one(query, {"_id": 0})
    with _lock:
        for doc in _tables().get(collection, []):
            if _matches(doc, query):
                return deepcopy(doc)
    return None


def insert(collection: str, doc: dict) -> None:
    db = _database()
    if db is not None:
        db[collection].insert_one(dict(doc))
        return
    with _lock:
        _tables().setdefault(collection, []).append(deepcopy(doc))


def insert_if_absent(collection: str, key: dict, doc: dict) -> tuple[dict, bool]:
    """Insert doc unless a document matching key exists. Returns (document, created)."""
    db = _database()
    if db is not None:
        fields = {name: value for name, value in doc.items() if name not in key}
        try:
            result = db[collection].update_one(key, {"$setOnInsert": fields}, upsert=True)
        except DuplicateKeyError:
            return find_one(collection, key), False
        return find_one(collection, key), result.upserted_id is not None
    with _lock:
        table = _tables().setdefault(collection, [])
        for existing in table:
            if _matches(existing, key):
                return deepcopy(existing), False
        table.append(deepcopy(doc))
        return deepcopy(doc), True


def update(collection: str, query: dict, fields: dict) -> dict | None:
    db = _database()
    if db is not None:
        db[collection].update_one(query, {"$set": fields})
        return find_one(collection, query)
    with _lock:
        for doc in _tables().get(collection, []):
            if _matches(doc, query):
                doc.update(deepcopy(fields))
                return deepcopy(doc)
    return None
