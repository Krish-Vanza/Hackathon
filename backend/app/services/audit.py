"""Append-only audit trail."""
from datetime import datetime, timezone

from app import store


def log(event: str, actor: str, entity: str, detail: dict | None = None) -> None:
    store.insert("audit_log", {
        "event": event,
        "actor": actor,
        "entity": entity,
        "detail": detail or {},
        "at": datetime.now(timezone.utc).isoformat(),
    })


def events(limit: int = 200) -> list[dict]:
    rows = sorted(store.find("audit_log"), key=lambda row: row["at"], reverse=True)
    return rows[:limit]
