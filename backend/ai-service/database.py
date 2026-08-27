import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

_client: AsyncIOMotorClient | None = None
_db = None


def _ensure_connected():
    """
    Lazy connection, deferred to first real use so the Motor client is bound to
    uvicorn's serving loop instead of whatever loop is current at import time.
    """
    global _client, _db
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URL)
        _db = _client["inclusive_jobs"]
    return _db


class _ReadOnlyCollection:
    """Proxies to a single collection — only candidates and job_offers are exposed,
    since core-service owns writes to every other collection."""

    def __init__(self, name: str):
        self._name = name

    def __getattr__(self, attr):
        return getattr(_ensure_connected()[self._name], attr)


class _ReadOnlyDB:
    """
    Collections reachable from ai-service.

    candidates, job_offers and recruiters are read-only mirrors of data owned by
    core-service. job_summaries is the exception: it is owned and written by
    ai-service (generated summary cache), and core-service never touches it.
    """

    candidates = _ReadOnlyCollection("candidates")
    job_offers = _ReadOnlyCollection("job_offers")
    # Auth needs to look up recruiters by email to validate their JWT (get_current_recruiter).
    recruiters = _ReadOnlyCollection("recruiters")
    # Written by ai-service — see repositories/job_summary_repo.py.
    job_summaries = _ReadOnlyCollection("job_summaries")


db = _ReadOnlyDB()
