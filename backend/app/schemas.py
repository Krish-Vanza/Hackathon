"""Shared API contracts from plan.md section 4. Tell the whole team before changing these."""
from typing import Literal

from pydantic import BaseModel, Field

ReviewType = Literal["skill_claim", "forecast_flag", "learning_plan", "mobility", "career_plan"]
ReviewStatus = Literal["pending", "approved", "rejected", "overridden"]


class Factor(BaseModel):
    name: str
    value: str
    weight: float = Field(ge=0, le=1)
    direction: Literal["up", "down"]


class Explanation(BaseModel):
    summary: str
    factors: list[Factor]
    confidence: float = Field(ge=0, le=1)
    method: str
    source: Literal["rules", "model", "gemini", "template"]


class ExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    employee_id: str | None = None


class FlagRequest(BaseModel):
    reason: str = Field(default="", max_length=1000)


class DecisionRequest(BaseModel):
    decision: Literal["approved", "rejected", "overridden"]
    comment: str = Field(default="", max_length=2000)
    override: dict | None = None


def explain(summary, factors, confidence, method, source) -> dict:
    """Build a validated Explanation so every prediction matches rule 1."""
    return Explanation(
        summary=summary,
        factors=factors,
        confidence=round(min(1.0, max(0.0, confidence)), 3),
        method=method,
        source=source,
    ).model_dump()
