import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

_client: AsyncIOMotorClient | None = None
_db = None
_fs = None


def _ensure_connected():
    """
    Construct the Motor client on first real use rather than at import time.
    Building it eagerly at module import binds its background tasks to whatever
    event loop happens to be current then, which can differ from the loop
    uvicorn actually serves requests on (causing "attached to a different loop"
    errors) — deferring construction to first use guarantees it happens inside
    the real serving loop.
    """
    global _client, _db, _fs
    if _client is None:
        _client = AsyncIOMotorClient(MONGODB_URL)
        _db = _client["inclusive_jobs"]
        _fs = AsyncIOMotorGridFSBucket(_db)
    return _client, _db, _fs


class _LazyProxy:
    def __init__(self, get_target):
        object.__setattr__(self, "_get_target", get_target)

    def __getattr__(self, name):
        return getattr(self._get_target(), name)

    def __getitem__(self, key):
        return self._get_target()[key]


db = _LazyProxy(lambda: _ensure_connected()[1])
fs = _LazyProxy(lambda: _ensure_connected()[2])


async def ping_db() -> bool:
    """Check MongoDB connection on startup."""
    try:
        client, _, _ = _ensure_connected()
        await client.admin.command("ping")
        return True
    except Exception:
        return False
