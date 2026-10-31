"""The one human review queue (plan.md rule 2)."""
from datetime import datetime, timezone
from uuid import uuid4

from app import store
from app.errors import ConflictError, NotFoundError
from app.fairness import assert_clean
from app.services import audit

STATUS_LABELS = {
    "pending": "Awaiting HR review",
    "approved": "Approved by HR",
    "rejected": "Rejected by HR",
    "overridden": "Changed by HR",
}


def submit_for_review(type, subject_id, key, title, payload, explanation) -> dict:
    """Queue an item once. A repeat call returns the existing review unchanged."""
    assert_clean(payload)
    identity = {"type": type, "subject_id": subject_id, "key": key}
    review = {
        **identity,
        "review_id": f"REV-{uuid4().hex[:10]}",
        "title": title,
        "status": "pending",
        "payload": payload,
        "explanation": explanation,
        "comment": "",
        "decided_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "decided_at": None,
    }
    stored, created = store.insert_if_absent("reviews", identity, review)
    if created:
        audit.log("review_submitted", "system", stored["review_id"], {"type": type, "subject_id": subject_id})
    return stored


def get_decision(type, subject_id, key) -> dict | None:
    return store.find_one("reviews", {"type": type, "subject_id": subject_id, "key": key})


def list_reviews(status: str | None = None, type: str | None = None) -> list[dict]:
    query = {name: value for name, value in (("status", status), ("type", type)) if value}
    return sorted(store.find("reviews", query), key=lambda row: row["created_at"], reverse=True)


def decide(review_id: str, decision: str, comment: str, override: dict | None, actor: str) -> dict:
    review = store.find_one("reviews", {"review_id": review_id})
    if review is None:
        raise NotFoundError(f"Review {review_id} not found")
    if review["status"] != "pending":
        raise ConflictError(f"Review {review_id} is already {review['status']}")
    if decision == "overridden" and not (override and comment.strip()):
        raise ConflictError("An override needs both new values and a comment")
    assert_clean(comment)

    fields = {
        "status": decision,
        "comment": comment,
        "decided_by": actor,
        "decided_at": datetime.now(timezone.utc).isoformat(),
    }
    if decision == "overridden":
        assert_clean(override)
        fields["payload"] = {**review["payload"], **override}
    updated = store.update("reviews", {"review_id": review_id}, fields)
    audit.log(f"review_{decision}", actor, review_id, {"type": review["type"], "comment": comment})
    return updated


def status_fields(review: dict) -> dict:
    return {
        "review_id": review["review_id"],
        "review_status": review["status"],
        "review_label": STATUS_LABELS[review["status"]],
        "review_comment": review.get("comment", ""),
    }


def hidden_from(role: str, review: dict) -> bool:
    """HR decisions change the employee view: rejected items disappear."""
    return role != "hr" and review["status"] == "rejected"


def apply_review(item: dict, review: dict) -> dict:
    """Merge review status into an item, and HR's values when overridden."""
    merged = {**item, **review["payload"]} if review["status"] == "overridden" else item
    return {**merged, **status_fields(review)}
