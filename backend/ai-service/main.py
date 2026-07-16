from fastapi import FastAPI
from routes_ai import router as ai_router

app = FastAPI(title="InclusiveJobs AI Service")
app.include_router(ai_router)
