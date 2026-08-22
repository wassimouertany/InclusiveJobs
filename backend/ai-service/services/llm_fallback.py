"""
Provider fallback for LLM calls: try the primary chain, and on a quota/rate/
timeout failure retry the same payload on a secondary chain.

This duplicates (rather than imports) the quota-detection idea from
parsing-service/services/parser_service.py:54-61 — that module lives in a
different service and image and is not importable from here. The marker list
below is deliberately narrower than parser_service's: it matches "rate limit"
instead of the bare substring "rate", which also matches innocuous words like
"generate" or "accurate".
"""

import asyncio
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

QUOTA_MARKERS = (
    "resource_exhausted",
    "resource exhausted",
    "429",
    "quota",
    "rate limit",
    "rate_limit",
    "ratelimit",
    "too many requests",
)

TIMEOUT_MARKERS = (
    "timeout",
    "timed out",
    "deadline exceeded",
)


def is_quota_error(exc: BaseException) -> bool:
    """
    True when the exception looks like a quota/rate-limit exhaustion or a
    timeout — the two conditions a different provider can plausibly serve.
    Matching is done on the message because the LangChain wrappers surface
    provider errors as generic exception types.
    """
    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return True
    message = str(exc).lower()
    return any(m in message for m in QUOTA_MARKERS + TIMEOUT_MARKERS)


async def ainvoke_with_fallback(
    primary: Any,
    fallback: Optional[Any],
    payload: Any,
) -> Any:
    """
    Invoke `primary`; on a quota/timeout error invoke `fallback` with the same
    payload. Any other error, or a missing fallback, propagates untouched.
    """
    try:
        return await primary.ainvoke(payload)
    except Exception as exc:
        if not is_quota_error(exc):
            raise
        if fallback is None:
            logger.warning("Primary LLM quota/timeout hit and no fallback configured")
            raise
        logger.warning("Primary LLM quota/timeout hit (%s) — falling back", exc)
        return await fallback.ainvoke(payload)
