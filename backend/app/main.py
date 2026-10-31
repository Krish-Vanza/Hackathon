from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.errors import ConflictError, NotFoundError
from app.fairness import SensitiveDataError
from app.routers import employees, forecast, governance, learning, meta, mobility, skills

app = FastAPI(title="Skill Gap and Workforce Evolution Predictor")

for module in (meta, skills, employees, forecast, learning, mobility, governance):
    app.include_router(module.router)


def _handler(status_code: int):
    def handle(_: Request, error: Exception) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=status_code)

    return handle


app.add_exception_handler(NotFoundError, _handler(404))
app.add_exception_handler(ConflictError, _handler(409))
app.add_exception_handler(SensitiveDataError, _handler(422))
