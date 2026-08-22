"""
Reads the summarizable slice of a job offer straight from MongoDB through the
existing ai-service collection proxy (database.db). No HTTP call to
core-service — that is a deliberate architecture decision, not an omission.

ANTI-CORRUPTION LAYER
---------------------
core-service's job-offer write path stores skill lists as a JSON-encoded string
wrapped inside a list — every live offer holds
`key_skills = ['["Java","Spring Boot",...]']` rather than a real list[str].
core-service has a normalizer for exactly this (`_normalize_list_fields`,
routes_users.py:64-70) but it is never applied to job offers.

`_str_list` below absorbs that corruption on read: it unwraps JSON-encoded
arrays (recursively, since double encoding occurs), cleans escape artifacts, and
never raises on malformed input. It normalizes what ai-service reads and does
NOT mutate the stored document — repairing the write path is core-service's job.
"""

import json

from bson import ObjectId

from database import db
from models.job_summary import JobSummarySource


class InvalidJobId(Exception):
    """job_id is not a well-formed ObjectId."""


class JobNotFound(Exception):
    """No job_offers document with that _id."""


class JobNotAvailable(Exception):
    """The offer exists but its status is not 'open' — closed offers are not summarized."""


# Only the fields the summarizer is allowed to see, plus status for the
# eligibility check. Everything else (recruiter_id, saved_candidates, ...)
# never leaves Mongo.
SUMMARY_SOURCE_PROJECTION = {
    "title": 1,
    "profile_title": 1,
    "description": 1,
    "required_skills": 1,
    "key_skills": 1,
    "contract_type": 1,
    "working_conditions": 1,
    "possible_accommodations": 1,
    "sector": 1,
    "status": 1,
}


def _text(value) -> str:
    """Missing/None/non-string tolerated: always returns a stripped string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


# A JSON-encoded array nested inside another one has been observed on live data,
# so unwrapping is recursive. Three levels is well past anything seen.
MAX_UNWRAP_DEPTH = 3


def _clean_item(value) -> str:
    """
    Strip the escape artifacts left by the double-encoding: escaped quotes
    (`\\"PyTorch\\",`), surrounding quotes, and trailing commas.
    """
    text = _text(value).replace('\\"', '"').replace("\\'", "'")
    text = text.strip().strip(",").strip()
    text = text.strip('"').strip("'").strip()
    return text.strip(",").strip()


def _flatten(value, depth: int) -> list[str]:
    """
    Recursively expand lists and JSON-encoded array strings into flat items.
    `depth` limits only the JSON unwrapping, not plain list nesting.
    """
    if value is None:
        return []

    if isinstance(value, list):
        items: list[str] = []
        for element in value:
            items.extend(_flatten(element, depth))
        return items

    if isinstance(value, str):
        text = value.strip()
        if depth > 0 and text.startswith("[") and text.endswith("]"):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                parsed = None  # malformed: fall through and treat as plain text
            if isinstance(parsed, list):
                return _flatten(parsed, depth - 1)
        item = _clean_item(text)
        return [item] if item else []

    item = _clean_item(value)
    return [item] if item else []


def _str_list(value) -> list[str]:
    """
    Tolerant list coercion (see the ANTI-CORRUPTION LAYER note above):
      a. a real list[str]        -> stripped items, empties dropped
      b. a list holding a string that is a JSON array -> flattened to its elements
      c. a bare JSON-array string -> same flattening
      d. a plain non-JSON string  -> single-element list
      e. None / empty             -> []
    Malformed JSON is treated as plain text. Never raises.
    """
    return _flatten(value, MAX_UNWRAP_DEPTH)


async def fetch_summary_source(job_id: str) -> JobSummarySource:
    """
    Load one job offer as a JobSummarySource.

    Raises InvalidJobId, JobNotFound, or JobNotAvailable. Any field that is
    missing or None on the document defaults to "" or [] rather than failing.
    """
    if not ObjectId.is_valid(job_id):
        raise InvalidJobId(f"Invalid job ID: {job_id!r}.")

    offer = await db.job_offers.find_one(
        {"_id": ObjectId(job_id)}, SUMMARY_SOURCE_PROJECTION
    )
    if offer is None:
        raise JobNotFound(f"Job offer {job_id} not found.")

    status = _text(offer.get("status")).lower()
    if status != "open":
        raise JobNotAvailable(
            f"Job offer {job_id} is not open (status: {status or 'unknown'})."
        )

    return JobSummarySource(
        job_id=str(offer["_id"]),
        title=_text(offer.get("title")),
        profile_title=_text(offer.get("profile_title")) or None,
        description=_text(offer.get("description")),
        required_skills=_str_list(offer.get("required_skills")),
        key_skills=_str_list(offer.get("key_skills")),
        contract_type=_text(offer.get("contract_type")) or None,
        working_conditions=_text(offer.get("working_conditions")) or None,
        possible_accommodations=_text(offer.get("possible_accommodations")) or None,
        sector=_text(offer.get("sector")) or None,
    )
