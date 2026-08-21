"""
Gemini-based structured extraction from OCR/plain text (resume, disability card).

Doc_type-specific behavior (prompts, normalization, offline fallback) lives in
document_specs.py; doc_type-agnostic helpers (date/skill coercion, name
heuristics) live in text_helpers.py. This module only orchestrates the LLM call.
Dependency graph is a DAG: text_helpers <- document_specs <- parser_service.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from llm_client import get_llm
from services.document_specs import get_spec

# Re-exported so test_parser_service.py can keep importing these directly
# from this module.
from services.text_helpers import (  # noqa: F401
    _coerce_skills,
    _coerce_years,
    _normalize_disability_type,
    _strip_json_fences,
    normalize_birth_date_iso,
)

logger = logging.getLogger(__name__)


class ResourceExhaustedError(Exception):
    """Raised when Gemini quota is exhausted after all retries."""

MAX_DOC_TEXT_CHARS = 16000


async def parse_document_text(text: str, doc_type: str) -> dict[str, Any]:
    """Ask Gemini for strict JSON; doc_type-specific behavior lives in its DocumentTypeSpec."""
    spec = get_spec(doc_type)
    if not (text or "").strip():
        return spec.empty_result()
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("GOOGLE_API_KEY not set; skipping Gemini document parse")
        return spec.empty_result()

    trimmed = text.strip()
    if len(trimmed) > MAX_DOC_TEXT_CHARS:
        trimmed = trimmed[:MAX_DOC_TEXT_CHARS] + "\n[... truncated ...]"
    prompt = spec.build_prompt(trimmed)

    llm = get_llm()
    try:
        response = await llm.ainvoke(prompt)
    except Exception as e:
        err_str = str(e)
        if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "rate" in err_str.lower():
            logger.warning("LLM quota hit — using local parser fallback")
            return spec.parse_locally(text)
        raise

    try:
        raw_out = getattr(response, "content", str(response))
        if isinstance(raw_out, list):
            raw_out = "".join(getattr(b, "text", str(b)) for b in raw_out)
        raw_out = str(raw_out).strip()
        parsed = json.loads(_strip_json_fences(raw_out))
    except Exception as exc:
        logger.warning("Gemini document parse failed: %s", exc)
        return spec.empty_result()
    return spec.normalize(parsed, ocr_source=trimmed)


# --- Back-compat wrappers -----------------------------------------------
# test_parser_service.py imports these directly. They now just delegate to
# the doc_type's spec (a dict lookup, not a doc_type branch), so adding a
# new document type never requires touching them.

def _empty_result(doc_type: str) -> dict[str, Any]:
    return get_spec(doc_type).empty_result()


def _normalize_parsed(
    parsed: dict[str, Any],
    doc_type: str,
    ocr_source: str | None = None,
) -> dict[str, Any]:
    return get_spec(doc_type).normalize(parsed, ocr_source)


def _parse_locally(text: str, doc_type: str) -> dict:
    return get_spec(doc_type).parse_locally(text)
