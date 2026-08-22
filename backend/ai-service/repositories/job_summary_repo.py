"""
Cache store for generated job summaries — collection `job_summaries`, owned and
written by ai-service (every other collection reached through database.db stays
a read-only mirror of core-service data).

The cache key is the quadruple (job_id, lang, prompt_version, source_hash).
Index creation is lazy and happens at most once per process; there is no
startup hook in ai-service to hang it off.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from database import db

logger = logging.getLogger(__name__)

CACHE_KEY_FIELDS = ("job_id", "lang", "prompt_version", "source_hash")
INDEX_NAME = "job_summary_cache_key"
INDEX_KEYS = [
    ("job_id", 1),
    ("lang", 1),
    ("prompt_version", 1),
    ("source_hash", 1),
]

_index_ready = False


async def _ensure_index() -> None:
    """Create the compound cache-key index once per process. Idempotent in Mongo."""
    global _index_ready
    if _index_ready:
        return
    await db.job_summaries.create_index(INDEX_KEYS, name=INDEX_NAME, unique=True)
    _index_ready = True


def _as_utc(value: Any) -> Any:
    """
    Motor's client is not tz_aware, so datetimes come back naive even though they
    were written as tz-aware UTC. Re-attach UTC on read so generated_at has the
    same type whether it came from the cache or from a fresh upsert.
    """
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _cache_filter(
    job_id: str, lang: str, prompt_version: str, source_hash: str
) -> dict[str, str]:
    return {
        "job_id": job_id,
        "lang": lang,
        "prompt_version": prompt_version,
        "source_hash": source_hash,
    }


async def get(
    job_id: str, lang: str, prompt_version: str, source_hash: str
) -> Optional[dict[str, Any]]:
    """Return the cached document for this exact key, or None. created_at is UTC-aware."""
    await _ensure_index()
    doc = await db.job_summaries.find_one(
        _cache_filter(job_id, lang, prompt_version, source_hash)
    )
    if doc is not None and "created_at" in doc:
        doc["created_at"] = _as_utc(doc["created_at"])
    return doc


async def upsert(
    job_id: str,
    lang: str,
    prompt_version: str,
    source_hash: str,
    summary: dict[str, Any],
    model: str,
) -> datetime:
    """
    Store (or replace) the summary for this key. Returns the created_at written,
    which is refreshed on every regeneration.
    """
    await _ensure_index()
    created_at = datetime.now(timezone.utc)
    await db.job_summaries.update_one(
        _cache_filter(job_id, lang, prompt_version, source_hash),
        {
            "$set": {
                **_cache_filter(job_id, lang, prompt_version, source_hash),
                "summary": summary,
                "model": model,
                "created_at": created_at,
            }
        },
        upsert=True,
    )
    return created_at
