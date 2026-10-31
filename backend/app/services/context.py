"""One read of the reference data per request, so scoring 60 employees is a single fetch."""
from dataclasses import dataclass, field

from app import store
from app.errors import NotFoundError
from app.services import scoring


@dataclass
class Context:
    skills: dict[str, dict]
    roles: dict[str, dict]
    employees: dict[str, dict]
    courses: list[dict]
    open_roles: list[dict]
    forecasts: dict[str, dict]
    _levels: dict[str, dict[str, float]] = field(default_factory=dict)

    def employee(self, employee_id: str) -> dict:
        if employee_id not in self.employees:
            raise NotFoundError(f"Employee {employee_id} not found")
        return self.employees[employee_id]

    def role(self, role_id: str) -> dict:
        if role_id not in self.roles:
            raise NotFoundError(f"Role {role_id} not found")
        return self.roles[role_id]

    def forecast(self, skill_id: str) -> dict:
        if skill_id not in self.forecasts:
            raise NotFoundError(f"No forecast for skill {skill_id}")
        return self.forecasts[skill_id]

    def skill_name(self, skill_id: str) -> str:
        return self.skills.get(skill_id, {}).get("name", skill_id)

    def criticality(self, skill_id: str) -> float:
        return float(self.skills.get(skill_id, {}).get("criticality", 1.0))

    def criticalities(self) -> dict[str, float]:
        return {skill_id: self.criticality(skill_id) for skill_id in self.skills}

    def levels(self, employee_id: str) -> dict[str, float]:
        if employee_id not in self._levels:
            self._levels[employee_id] = {
                item["skill_id"]: scoring.effective_level(item.get("evidence", []))
                for item in self.employee(employee_id).get("skills", [])
            }
        return self._levels[employee_id]

    def current_demand(self, skill_id: str) -> float:
        history = self.forecasts.get(skill_id, {}).get("history") or []
        return float(history[-1]["demand_fte"]) if history else 0.0

    def future_demand(self, skill_id: str) -> float:
        forecast = self.forecasts.get(skill_id, {}).get("forecast") or []
        return float(forecast[-1]) if forecast else 0.0

    def growth(self, skill_id: str) -> float:
        return scoring.demand_growth(self.current_demand(skill_id), self.future_demand(skill_id))

    def holders(self, skill_id: str, minimum: float) -> list[str]:
        return [
            employee_id for employee_id in self.employees
            if self.levels(employee_id).get(skill_id, 0.0) >= minimum
        ]


def load() -> Context:
    return Context(
        skills={row["skill_id"]: row for row in store.find("skills")},
        roles={row["role_id"]: row for row in store.find("roles")},
        employees={row["employee_id"]: row for row in store.find("employees")},
        courses=store.find("courses"),
        open_roles=store.find("open_roles"),
        forecasts={row["skill_id"]: row for row in store.find("forecasts")},
    )
