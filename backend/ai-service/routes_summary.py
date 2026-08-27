"""
HTTP surface for LLM-generated job offer summaries.

RATE LIMITING
-------------
The limiter below is IN-PROCESS: counters live in this module's memory. It
therefore does NOT hold across replicas — two ai-service containers each grant
the full allowance, and a restart clears every counter. A Redis-backed limiter
(shared counters, atomic INCR + TTL) is the production step. This keeps the
service free of a new infrastructure dependency for now.

Quota is consumed only when a real generation happens: the limiter is checked
before the call and recorded only when the response was not served from cache.
Probing the cache in the route instead would mean duplicating the service's
orchestration (fetch source, hash, look up), so the "decrement on a real call"
option was taken. Consequence: a user already over quota is refused even if the
request would have been a cache hit.

LOGGING
-------
Logged: job_id, lang, cached, model, latency_ms. Never the description, the
prompt, the LLM output, or a raw provider error message.
Token usage is not logged: `with_structured_output` returns the parsed model, so
`usage_metadata` is unreachable without `include_raw=True`, which changes the
chain's return shape and the (already verified) parsing path.
"""

import logging
import time

from fastapi import APIRouter, Depends

from api_errors import APIError
from auth import get_current_user
from models.job_summary import JobSummaryResponse
from repositories.job_offer_reader import InvalidJobId, JobNotAvailable, JobNotFound
from services.summary_prompt import SUPPORTED_LANGS
from services.summary_service import SummaryUnavailable, generate_summary

router = APIRouter(prefix="/ai/jobs", tags=["summary"])

logger = logging.getLogger(__name__)

RATE_LIMIT_MAX_CALLS = 20
RATE_LIMIT_WINDOW_SECONDS = 3600


class _InProcessRateLimiter:
    """
    Sliding-window counter per authenticated user. No lock: the event loop is
    single-threaded, and a concurrency race can at worst let two generations
    through on the same slot.
    """

    def __init__(self, max_calls: int, window_seconds: int):
        self._max_calls = max_calls
        self._window_seconds = window_seconds
        self._calls: dict[str, list[float]] = {}

    def _recent(self, user_id: str, now: float) -> list[float]:
        recent = [t for t in self._calls.get(user_id, []) if now - t < self._window_seconds]
        if recent:
            self._calls[user_id] = recent
        else:
            self._calls.pop(user_id, None)
        return recent

    def check(self, user_id: str) -> None:
        """Raise APIError(429) when the user has no allowance left."""
        if len(self._recent(user_id, time.monotonic())) >= self._max_calls:
            raise APIError(
                429,
                "RATE_LIMITED",
                f"Too many summary requests. Limit is {self._max_calls} per hour.",
            )

    def record(self, user_id: str) -> None:
        """Consume one slot — called only after a real generation."""
        now = time.monotonic()
        recent = self._recent(user_id, now)
        recent.append(now)
        self._calls[user_id] = recent


_rate_limiter = _InProcessRateLimiter(RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_SECONDS)


@router.post("/{job_id}/summary", response_model=JobSummaryResponse)
async def create_job_summary(
    job_id: str,
    lang: str = "en",
    current_user: dict = Depends(get_current_user),
) -> JobSummaryResponse:
    """
    Summarize one open job offer. Candidates and recruiters may both call it —
    get_current_user already admits exactly those two roles.
    """
    if lang not in SUPPORTED_LANGS:
        raise APIError(
            400,
            "INVALID_LANG",
            f"Unsupported language. Expected one of: {', '.join(SUPPORTED_LANGS)}.",
        )

    user_id = str(current_user["_id"])
    _rate_limiter.check(user_id)

    started = time.perf_counter()
    try:
        summary = await generate_summary(job_id, lang)
    except InvalidJobId:
        raise APIError(400, "INVALID_JOB_ID", "Invalid job ID.")
    except JobNotFound:
        raise APIError(404, "JOB_NOT_FOUND", "Job offer not found.")
    except JobNotAvailable:
        raise APIError(409, "JOB_NOT_AVAILABLE", "This job offer is not open.")
    except SummaryUnavailable:
        # Deliberately no exception detail: it may carry provider text.
        logger.warning(
            "job summary unavailable job_id=%s lang=%s latency_ms=%d",
            job_id,
            lang,
            (time.perf_counter() - started) * 1000,
        )
        raise APIError(
            503,
            "SUMMARY_UNAVAILABLE",
            "Summary generation is temporarily unavailable. Please try again later.",
        )

    if not summary.cached:
        _rate_limiter.record(user_id)

    logger.info(
        "job summary job_id=%s lang=%s cached=%s model=%s latency_ms=%d",
        job_id,
        lang,
        summary.cached,
        summary.model,
        (time.perf_counter() - started) * 1000,
    )
    return summary
