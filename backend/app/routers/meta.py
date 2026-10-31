from fastapi import APIRouter

from app import store
from app.ai import llm
from app.deps import Role

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health")
def health():
    data_source, database = "unavailable", "down"
    try:
        data_source = store.backend_name()
        database = "ok" if store.ping() else "down"
    except Exception:
        pass
    return {
        "status": "ok",
        "database": database,
        "data_source": data_source,
        "llm_mode": llm.llm_mode(),
    }


@router.get("/me")
def me(role: Role):
    return {"role": role, "demo_only": True}
