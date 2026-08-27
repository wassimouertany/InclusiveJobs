import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api_errors import APIError
from routes_ai import router as ai_router
from routes_summary import router as summary_router

# uvicorn configures only its own loggers, so application INFO records are
# dropped by default. Raise our own modules to INFO and leave everything else
# at WARNING so third-party libraries stay quiet.
logging.basicConfig(level=logging.WARNING, format="%(levelname)s:     %(name)s - %(message)s")
logging.getLogger("routes_summary").setLevel(logging.INFO)
logging.getLogger("services").setLevel(logging.INFO)

app = FastAPI(title="InclusiveJobs AI Service")


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Flat, machine-readable error body: {"detail": ..., "code": ...}."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
    )


app.include_router(ai_router)
app.include_router(summary_router)
