"""
Job offer summarization: cache lookup, degraded short-circuit, Gemini call with
a Groq fallback, validation, cache write.

Dedicated LLM clients are built here on purpose. rag_service.get_llm() returns
ChatGroq whenever GROQ_API_KEY is set (which it is in this stack), so reusing it
would make "Gemini primary, Groq fallback" meaningless.
"""

import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from langchain_google_genai import ChatGoogleGenerativeAI

from models.job_summary import JobSummaryContent, JobSummaryResponse, JobSummarySource
from repositories import job_summary_repo
from repositories.job_offer_reader import fetch_summary_source
from services.llm_fallback import is_quota_error
from services.summary_prompt import (
    MAX_BULLETS,
    PROMPT_VERSION,
    build_prompt,
    normalize_lang,
    sanitize_description,
    sanitize_text,
)

logger = logging.getLogger(__name__)


class SummaryUnavailable(Exception):
    """The LLM produced nothing usable after one retry."""


# Guards empty or junk descriptions only ("", "n/a", a single line of filler) —
# it is NOT a cost lever. Below this many sanitized characters there is not
# enough prose for an LLM to summarize without inventing, so the structured
# fields are used directly instead.
SHORT_DESCRIPTION_THRESHOLD = 120

# Pinned to an explicit version on purpose, never an alias such as
# gemini-flash-lite-latest: the cache key is (job_id, lang, prompt_version,
# source_hash) and does NOT include the model, so an alias silently drifting to a
# new model would leave already-cached summaries labelled with the old name.
SUMMARY_GEMINI_MODEL = os.getenv("SUMMARY_GEMINI_MODEL", "gemini-3.5-flash-lite")
SUMMARY_GROQ_MODEL = os.getenv("SUMMARY_GROQ_MODEL", "openai/gpt-oss-20b")

# Groq only. Gemini 3.x models use fixed sampling defaults and ignore
# temperature — passing it changes nothing and warns on every call.
TEMPERATURE = 0.2
MAX_OUTPUT_TOKENS = 300
DEGRADED_MODEL_NAME = "none"

_gemini_chain: Any = None
_groq_chain: Any = None
_groq_chain_built = False


def _get_gemini_chain() -> Any:
    """
    Flash-tier Gemini bound to the JobSummaryContent schema (json_schema method).
    No temperature: this model tier has fixed sampling defaults and ignores it.
    """
    global _gemini_chain
    if _gemini_chain is None:
        llm = ChatGoogleGenerativeAI(
            model=SUMMARY_GEMINI_MODEL,
            max_output_tokens=MAX_OUTPUT_TOKENS,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
        )
        _gemini_chain = llm.with_structured_output(JobSummaryContent)
    return _gemini_chain


def _get_groq_chain() -> Optional[Any]:
    """
    Groq fallback, or None when GROQ_API_KEY is unset. ChatGroq has no
    response_schema, so structured output goes through json_mode.
    """
    global _groq_chain, _groq_chain_built
    if not _groq_chain_built:
        _groq_chain_built = True
        groq_key = os.getenv("GROQ_API_KEY", "")
        if groq_key:
            from langchain_groq import ChatGroq

            llm = ChatGroq(
                model=SUMMARY_GROQ_MODEL,
                api_key=groq_key,
                temperature=TEMPERATURE,
                max_tokens=MAX_OUTPUT_TOKENS,
            )
            _groq_chain = llm.with_structured_output(
                JobSummaryContent, method="json_mode"
            )
    return _groq_chain


def compute_source_hash(source: JobSummarySource) -> str:
    """
    sha256 over the summarizable fields only. job_offers has no updated_at
    field, so this hash is the ONLY cache invalidation mechanism: any recruiter
    edit to one of these fields changes the key and forces a regeneration.
    Fields not listed here (sector, status, saved_candidates, ...) do not
    invalidate a cached summary.
    """
    parts = [
        "title=" + (source.title or ""),
        "profile_title=" + (source.profile_title or ""),
        "description=" + (source.description or ""),
        "required_skills=" + "|".join(source.required_skills),
        "key_skills=" + "|".join(source.key_skills),
        "contract_type=" + (source.contract_type or ""),
        "working_conditions=" + (source.working_conditions or ""),
        "possible_accommodations=" + (source.possible_accommodations or ""),
    ]
    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()


def _merge_skills(*groups: list[str]) -> list[str]:
    """Concatenate skill lists, case-insensitively de-duplicated, order preserved."""
    seen: set[str] = set()
    merged: list[str] = []
    for group in groups:
        for raw in group:
            skill = sanitize_text(raw)
            if skill and skill.lower() not in seen:
                seen.add(skill.lower())
                merged.append(skill)
    return merged


def _build_degraded_summary(source: JobSummarySource) -> JobSummaryContent:
    """
    No-LLM summary for offers whose description is too thin to summarize.
    Structured fields only, copied verbatim — nothing is generated.

    Field rules mirror the LLM prompt: skills come from both skill lists, and
    accommodations fall back to working_conditions when possible_accommodations
    is empty.
    """
    headline = sanitize_text(source.profile_title) or sanitize_text(source.title)
    accommodation = sanitize_text(source.possible_accommodations) or sanitize_text(
        source.working_conditions
    )
    return JobSummaryContent(
        main_missions=[headline] if headline else [],
        key_skills=_merge_skills(source.key_skills, source.required_skills)[:MAX_BULLETS],
        accommodations=[accommodation] if accommodation else [],
    )


def _coerce_content(result: Any) -> JobSummaryContent:
    """Accept the model object or a raw dict; anything else raises."""
    if isinstance(result, JobSummaryContent):
        return result
    if isinstance(result, dict):
        return JobSummaryContent(**result)
    raise TypeError("Unexpected LLM output type: " + type(result).__name__)


async def _generate_content(prompt: str) -> tuple[JobSummaryContent, str]:
    """
    One LLM attempt: Gemini first, Groq on quota/timeout. Returns the validated
    content and the model name that produced it.
    """
    gemini_chain = _get_gemini_chain()
    groq_chain = _get_groq_chain()
    used_model = SUMMARY_GEMINI_MODEL

    try:
        result = await gemini_chain.ainvoke(prompt)
    except Exception as exc:
        if not is_quota_error(exc) or groq_chain is None:
            raise
        logger.warning(
            "Gemini quota/timeout hit (%s) — falling back to Groq",
            type(exc).__name__,
        )
        used_model = SUMMARY_GROQ_MODEL
        result = await groq_chain.ainvoke(prompt)

    return _coerce_content(result), used_model


async def generate_summary(job_id: str, lang: str = "en") -> JobSummaryResponse:
    """
    Summarize one open job offer, using the cache when the source is unchanged.

    Raises InvalidJobId / JobNotFound / JobNotAvailable from the reader, or
    SummaryUnavailable when the LLM fails twice.
    """
    lang = normalize_lang(lang)
    source = await fetch_summary_source(job_id)
    source_hash = compute_source_hash(source)

    cached = await job_summary_repo.get(job_id, lang, PROMPT_VERSION, source_hash)
    if cached is not None:
        return JobSummaryResponse(
            job_id=job_id,
            lang=lang,
            cached=True,
            model=cached.get("model", ""),
            prompt_version=PROMPT_VERSION,
            generated_at=cached.get("created_at") or datetime.now(timezone.utc),
            summary=JobSummaryContent(**(cached.get("summary") or {})),
        )

    description = sanitize_description(source.description)
    if len(description) < SHORT_DESCRIPTION_THRESHOLD:
        content = _build_degraded_summary(source)
        model_name = DEGRADED_MODEL_NAME
    else:
        prompt = build_prompt(source, lang)
        last_error: Optional[Exception] = None
        content = None
        model_name = ""
        # One call, then exactly one retry, then give up.
        for attempt in (1, 2):
            try:
                content, model_name = await _generate_content(prompt)
                break
            except Exception as exc:
                last_error = exc
                # Exception type only: a provider message can echo prompt content.
                logger.warning(
                    "Job summary attempt %s/2 failed for %s: %s",
                    attempt,
                    job_id,
                    type(exc).__name__,
                )
        if content is None:
            raise SummaryUnavailable(
                "Could not generate a summary for job " + job_id + "."
            ) from last_error

    generated_at = await job_summary_repo.upsert(
        job_id=job_id,
        lang=lang,
        prompt_version=PROMPT_VERSION,
        source_hash=source_hash,
        summary=content.model_dump(),
        model=model_name,
    )

    return JobSummaryResponse(
        job_id=job_id,
        lang=lang,
        cached=False,
        model=model_name,
        prompt_version=PROMPT_VERSION,
        generated_at=generated_at,
        summary=content,
    )
