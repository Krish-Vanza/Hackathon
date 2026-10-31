from fastapi import APIRouter

from app.deps import HrRole, Role
from app.services import mobility

router = APIRouter(prefix="/api", tags=["mobility and career"])


@router.get("/mobility/roles/{role_id}/candidates")
def candidates(role_id: str, _: HrRole):
    return mobility.candidates(role_id)


@router.get("/mobility/{employee_id}")
def employee_mobility(employee_id: str, role: Role):
    return mobility.employee_mobility(employee_id, role)


@router.get("/career/{employee_id}")
def career(employee_id: str, role: Role):
    return mobility.career_paths(employee_id, role)
