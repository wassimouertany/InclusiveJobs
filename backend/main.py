from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import ping_db
from routes_job_offers import router as job_offers_router
from routes_users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not await ping_db():
        raise RuntimeError("Unable to connect to MongoDB")
    yield


app = FastAPI(title="InclusiveJobs", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users_router)
app.include_router(job_offers_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
