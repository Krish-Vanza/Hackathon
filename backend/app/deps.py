"""Demo-only role switch. X-Demo-Role is not authentication and is trusted as sent."""
from typing import Annotated

from fastapi import Depends, Header, HTTPException

ROLES = ("employee", "hr")


def get_role(x_demo_role: Annotated[str, Header()] = "employee") -> str:
    role = x_demo_role.lower()
    if role not in ROLES:
        raise HTTPException(400, f"X-Demo-Role must be one of {', '.join(ROLES)}")
    return role


def require_hr(role: Annotated[str, Depends(get_role)]) -> str:
    if role != "hr":
        raise HTTPException(403, "HR role required")
    return role


Role = Annotated[str, Depends(get_role)]
HrRole = Annotated[str, Depends(require_hr)]
