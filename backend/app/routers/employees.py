from fastapi import APIRouter

from app.deps import HrRole, Role
from app.services import gaps

router = APIRouter(prefix="/api", tags=["employees"])


@router.get("/employees")
def list_employees():
    return gaps.list_employees()


@router.get("/employees/{employee_id}/profile")
def profile(employee_id: str, role: Role):
    return gaps.profile(employee_id, role)


@router.get("/employees/{employee_id}/gaps")
def employee_gaps(employee_id: str, role_id: str | None = None):
    return gaps.employee_gaps(employee_id, role_id)


@router.get("/gaps/org")
def org_gaps(_: HrRole):
    return gaps.org_heatmap()
