from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.deps import HrRole
from app.schemas import DecisionRequest, ReviewStatus, ReviewType
from app.services import audit, reports, reviews, risk

router = APIRouter(prefix="/api", tags=["risk and governance"])


@router.get("/risk")
def risks():
    return risk.risks()


@router.get("/reviews")
def list_reviews(status: ReviewStatus | None = None, type: ReviewType | None = None):
    return reviews.list_reviews(status, type)


@router.post("/reviews/{review_id}/decision")
def decide(review_id: str, body: DecisionRequest, actor: HrRole):
    return reviews.decide(review_id, body.decision, body.comment, body.override, actor)


@router.get("/audit")
def audit_events(limit: Annotated[int, Query(ge=1, le=1000)] = 200):
    return audit.events(limit)


@router.get("/reports/workforce")
def workforce_report():
    return reports.workforce()


@router.get("/reports/workforce.csv")
def workforce_report_csv():
    return Response(
        reports.workforce_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="workforce-report.csv"'},
    )
