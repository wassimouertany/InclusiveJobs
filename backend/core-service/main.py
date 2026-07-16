from contextlib import asynccontextmanager
from routes_admin import router as admin_router
from routes_applications import router as applications_router
from routes_notifications import router as notifications_router
from routes_stories import router as stories_router
from routes_badges import router as badges_router

from fastapi import FastAPI

from database import ping_db
from routes_job_offers import router as job_offers_router
from routes_users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not await ping_db():
        raise RuntimeError("Unable to connect to MongoDB")
    yield


app = FastAPI(title="InclusiveJobs", lifespan=lifespan)
app.include_router(admin_router)
app.include_router(users_router)
app.include_router(job_offers_router)
app.include_router(applications_router)
app.include_router(notifications_router)
app.include_router(stories_router)
app.include_router(badges_router)



if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
