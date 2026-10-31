from fastapi import APIRouter

from app import config, store
from app.deps import Role

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health():
    try:
        database = "ok" if store.ping() else "down"
    except Exception:
        database = "down"
    return {
        "status": "ok",
        "database": database,
        "data_source": store.backend_name(),
        "llm_mode": config.LLM_MODE,
    }


@router.get("/me")
def me(role: Role):
    return {"role": role, "demo_only": True}
