from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import ping_db
from routes_users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not await ping_db():
        raise RuntimeError("Impossible de se connecter à MongoDB")
    yield


app = FastAPI(title="InclusiveJobs", lifespan=lifespan)
app.include_router(users_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
