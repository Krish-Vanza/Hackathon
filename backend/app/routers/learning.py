from fastapi import APIRouter

from app.deps import Role
from app.services import learning

router = APIRouter(prefix="/api", tags=["learning"])


@router.get("/courses")
def courses():
    return learning.list_courses()


@router.get("/learning/{employee_id}")
def learning_plan(employee_id: str, role: Role, role_id: str | None = None):
    return learning.plan(employee_id, role_id, role)
