from fastapi import APIRouter

from app.schemas import ExtractRequest
from app.services import skills

router = APIRouter(prefix="/api", tags=["skills"])


@router.get("/skills")
def list_skills():
    return skills.list_skills()


@router.post("/skills/extract")
def extract(body: ExtractRequest):
    return skills.extract(body.text, body.employee_id)


@router.get("/graph")
def graph(focus: str | None = None):
    return skills.graph(focus)
