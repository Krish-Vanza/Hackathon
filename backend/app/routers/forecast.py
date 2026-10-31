from typing import Annotated

from fastapi import APIRouter, Query

from app.schemas import FlagRequest
from app.services import forecasts

router = APIRouter(prefix="/api", tags=["market and forecast"])


@router.get("/market/trends")
def market_trends():
    return forecasts.market_trends()


@router.get("/market/brief")
def market_brief():
    return forecasts.market_brief()


@router.get("/forecast/skills")
def top_skills(top: Annotated[int, Query(ge=1, le=100)] = 10):
    return forecasts.top_rising(top)


@router.get("/forecast/skills/{skill_id}")
def skill_forecast(skill_id: str):
    return forecasts.skill_forecast(skill_id)


@router.post("/forecast/skills/{skill_id}/flag")
def flag_forecast(skill_id: str, body: FlagRequest):
    return forecasts.flag(skill_id, body.reason)


@router.get("/forecast/accuracy")
def accuracy():
    return forecasts.accuracy()


@router.get("/forecast/gaps")
def future_gaps():
    return forecasts.future_gaps()


@router.get("/readiness")
def readiness():
    return forecasts.readiness()
