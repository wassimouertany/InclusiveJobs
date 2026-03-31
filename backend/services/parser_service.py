"""
Gemini-based structured extraction from OCR/plain text (resume, disability card).
"""

from __future__ import annotations

import json
import logging
import os
import re
from calendar import monthrange
from datetime import datetime
from typing import Any

from rag_service import get_llm

logger = logging.getLogger(__name__)

MAX_DOC_TEXT_CHARS = 16000

DOC_TYPES = frozenset({"resume", "disability_card"})

# Match backend EducationLevel enum (avoid importing models circularly)
VALID_EDUCATION_LEVELS = frozenset(
    {
        "no_degree",
        "vocational_training",
        "high_school",
        "bachelors",
        "masters",
        "engineering_degree",
        "doctorate",
        "other",
    }
)

_RESUME_HEADER_SKIP = frozenset(
    {
        "engineer",
        "developer",
        "curriculum",
        "resume",
        "cv",
        "vitae",
        "experience",
        "education",
        "phone",
        "email",
        "address",
        "linkedin",
        "summary",
        "objective",
        "profile",
        "skills",
        "work",
        "employment",
    }
)

ALLOWED_DISABILITY = frozenset(
    {"motor", "visual", "hearing", "cognitive", "psychological", "other"}
)
DISABILITY_SYNONYMS: dict[str, str] = {
    "physical": "motor",
    "mobility": "motor",
    "locomotor": "motor",
    "deaf": "hearing",
    "hard_of_hearing": "hearing",
    "auditory": "hearing",
    "blind": "visual",
    "vision": "visual",
    "sight": "visual",
    "mental_health": "psychological",
    "psychiatric": "psychological",
    "intellectual": "cognitive",
    "learning": "cognitive",
}


def _strip_json_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        if len(parts) >= 2:
            inner = parts[1]
            if inner.lstrip().lower().startswith("json"):
                inner = inner.lstrip()[4:].lstrip()
            return inner.strip()
    return t


def _normalize_disability_type(raw: Any) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().lower().replace(" ", "_").replace("-", "_")
    if not s:
        return None
    if s in ALLOWED_DISABILITY:
        return s
    return DISABILITY_SYNONYMS.get(s)


def _coerce_skills(val: Any) -> list[str]:
    if val is None:
        return []
    if isinstance(val, list):
        out = [str(x).strip() for x in val if str(x).strip()]
        return out[:50]
    if isinstance(val, str):
        return [p.strip() for p in re.split(r"[,;]", val) if p.strip()][:50]
    return []


def _coerce_years(val: Any) -> int | None:
    if val is None or val == "":
        return None
    try:
        y = int(float(val))
        return max(0, min(80, y))
    except (TypeError, ValueError):
        return None


_MONTH_ABBR = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}


def normalize_birth_date_iso(raw: Any) -> str:
    """
    Normalize OCR/Gemini date strings to YYYY-MM-DD for forms and storage.
    Handles ISO, DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY (e.g. 07-DEC-1989).
    Returns "" if parsing fails.
    """
    if raw is None:
        return ""
    s = str(raw).strip()
    if not s:
        return ""

    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        try:
            datetime.strptime(s, "%Y-%m-%d")
            return s
        except ValueError:
            return ""

    u = s.upper().replace(" ", "")
    m = re.match(r"^(\d{1,2})[-/]([A-Z]{3})[-/](\d{4})$", u)
    if m:
        d, mon, y = int(m.group(1)), m.group(2), int(m.group(3))
        month = _MONTH_ABBR.get(mon)
        if not month:
            return ""
        last = monthrange(y, month)[1]
        if d < 1 or d > last:
            return ""
        return f"{y:04d}-{month:02d}-{d:02d}"

    m = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", s.strip())
    if m:
        a, b, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 1900 or y > 2100:
            return ""
        if a > 12:
            d, mo = a, b
        elif b > 12:
            d, mo = b, a
        else:
            d, mo = a, b
        if mo < 1 or mo > 12 or d < 1 or d > monthrange(y, mo)[1]:
            return ""
        return f"{y:04d}-{mo:02d}-{d:02d}"

    return ""


def _clean_name_value(val: str) -> str:
    """Trim OCR line noise; drop values that look like dates or numbers only."""
    v = (val or "").strip()
    v = re.sub(r"\s+", " ", v)
    v = re.sub(r"^[\s:.,\-|]+|[\s:.,\-|]+$", "", v)
    for stop in (
        "date of birth",
        "date of expiry",
        "date d'expir",
        "national disability",
        "number",
        "n°",
        "no.",
        "dob",
        "expiry",
        "card",
    ):
        idx = v.lower().find(stop)
        if idx > 1:
            v = v[:idx].strip()
    if len(v) < 2 or re.fullmatch(r"[\d\s\-/.]+", v):
        return ""
    if re.fullmatch(r"[A-Z]{3}", v.upper()):
        return ""
    return v[:200]


def _title_if_all_caps(name: str) -> str:
    if not name or not name.isupper():
        return name
    return " ".join(w.capitalize() for w in name.split())


def _heuristic_extract_names(ocr_text: str) -> tuple[str, str]:
    """
    Regex fallback when Gemini omits names: common English/French/Tunisian-style labels.
    """
    if not (ocr_text or "").strip():
        return "", ""

    first_pats = [
        r"(?i)given\s+names?\s*\n\s*([^\n]+)",
        r"(?i)given\s+names?\s+[:\s]*\s*(.+?)(?=\s+surname\b|\s+last\s+name|\s+date\s+of|\s+number\b|\s+dob\b|$)",
        r"(?i)given\s+names?\s*[:\s]+\s*([^\n]+)",
        r"(?i)first\s+name\s*\n\s*([^\n]+)",
        r"(?i)first\s+name\s+[:\s]*\s*(.+?)(?=\s+surname\b|\s+last\s+name|\s+date\s+of|\s+number\b|$)",
        r"(?i)first\s+name\s*[:\s]+\s*([^\n]+)",
        r"(?i)forenames?\s*[:\s]+\s*([^\n]+)",
        r"(?i)pr[ée]noms?\s*[:\s]+\s*([^\n]+)",
        r"(?i)prénom\s*[:\s]+\s*([^\n]+)",
        r"(?i)الاسم\s*[:\s]*\s*([^\n]+)",
        r"(?i)nom\s+et\s+pr[ée]nom\s*[:\s]+\s*([^\n]+)",
    ]
    last_pats = [
        r"(?i)surname\s*\n\s*([^\n]+)",
        r"(?i)surname\s+[:\s]*\s*(.+?)(?=\s+given\s+names|\s+first\s+name|\s+date\s+of|\s+number\b|\s+dob\b|$)",
        r"(?i)surname\s*[:\s]+\s*([^\n]+)",
        r"(?i)last\s+name\s*\n\s*([^\n]+)",
        r"(?i)last\s+name\s+[:\s]*\s*(.+?)(?=\s+given\s+names|\s+first\s+name|\s+date\s+of|\s+number\b|$)",
        r"(?i)last\s+name\s*[:\s]+\s*([^\n]+)",
        r"(?i)family\s+name\s*[:\s]+\s*([^\n]+)",
        r"(?i)nom\s+de\s+famille\s*[:\s]+\s*([^\n]+)",
        r"(?im)^nom\s*[:\s]+\s*([^\n]+)",
        r"(?i)اللقب\s*[:\s]*\s*([^\n]+)",
        r"(?i)nom\s+famille\s*[:\s]+\s*([^\n]+)",
    ]

    fn, ln = "", ""
    for pat in first_pats:
        m = re.search(pat, ocr_text)
        if m:
            c = _clean_name_value(m.group(1))
            if c:
                fn = _title_if_all_caps(c)
                break

    for pat in last_pats:
        m = re.search(pat, ocr_text)
        if m:
            c = _clean_name_value(m.group(1))
            if c:
                ln = _title_if_all_caps(c)
                break

    if not fn or not ln:
        flat = " ".join(ocr_text.split())
        if not ln:
            m = re.search(
                r"(?i)surname\s+[:\s]*\s*(.+?)(?=\s+given\s+names|\s+first\s+name|\s+date\s+of|\s+number\b|\s+dob\b|$)",
                flat,
            )
            if m:
                ln = _title_if_all_caps(_clean_name_value(m.group(1)))
        if not fn:
            m = re.search(
                r"(?i)given\s+names?\s+[:\s]*\s*(.+?)(?=\s+surname\b|\s+last\s+name|\s+date\s+of|\s+number\b|\s+dob\b|$)",
                flat,
            )
            if m:
                fn = _title_if_all_caps(_clean_name_value(m.group(1)))

    return fn, ln


def _heuristic_resume_header_names(ocr: str) -> tuple[str, str]:
    """
    Guess name from typical CV header lines (before Gemini / when model omits names).
    """
    if not (ocr or "").strip():
        return "", ""
    lines = [ln.strip() for ln in ocr.splitlines() if ln.strip()][:15]
    for ln in lines[:8]:
        low = ln.lower()
        if any(b in low for b in _RESUME_HEADER_SKIP):
            continue
        if "@" in ln or re.search(r"\+\d|\d{2,}\.\d{2,}\.\d{4}", ln):
            continue
        words = re.findall(r"[A-Za-zÀ-ÿ''\-]+", ln)
        if not (2 <= len(words) <= 5) or len(ln) > 90:
            continue
        raw = " ".join(words)
        if len(raw) < 4:
            continue
        if len(words) >= 3:
            fn = " ".join(words[:-1])
            last = words[-1]
        else:
            fn, last = words[0], words[1]
        fn, last = _title_if_all_caps(fn), _title_if_all_caps(last)
        if fn and last:
            return fn.strip(), last.strip()
    return "", ""


async def parse_document_text(text: str, doc_type: str) -> dict[str, Any]:
    """
    Ask Gemini to return strict JSON for the given document OCR text.

    doc_type:
      - "resume" -> profile_title, key_skills (list), years_of_experience (int)
      - "disability_card" -> disability_type, card_number, expiry_date, first_name, last_name, birth_date
    """
    if doc_type not in DOC_TYPES:
        raise ValueError(f"doc_type must be one of {sorted(DOC_TYPES)}")
    if not (text or "").strip():
        return _empty_result(doc_type)

    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("GOOGLE_API_KEY not set; skipping Gemini document parse")
        return _empty_result(doc_type)

    trimmed = text.strip()
    if len(trimmed) > MAX_DOC_TEXT_CHARS:
        trimmed = trimmed[:MAX_DOC_TEXT_CHARS] + "\n[... truncated ...]"

    if doc_type == "resume":
        prompt = f"""You extract ALL useful structured data from a job resume/CV (plain text, may come from OCR).

RESUME TEXT:
---
{trimmed}
---

Respond with ONLY a valid JSON object and no other text (no markdown fences). Use exactly these keys:
{{
  "first_name": "<candidate given / first name(s), Title Case, else empty>",
  "last_name": "<family / surname, else empty>",
  "birth_date": "<YYYY-MM-DD if date of birth or age can be inferred; else empty>",
  "email": "<primary email if visible, lowercase, else empty>",
  "phone_number": "<phone / mobile in international or local form, else empty>",
  "address": "<city, country or full address line if visible, else empty>",
  "industry": "<short sector e.g. Software, Healthcare, else empty>",
  "education_level": "<exactly one of: no_degree, vocational_training, high_school, bachelors, masters, engineering_degree, doctorate, other — from highest completed degree>",
  "gender": "<exactly male or female if explicitly stated, else empty string>",
  "profile_title": "<current or target job title / headline, else empty>",
  "key_skills": ["<skill1>", "<skill2>"],
  "years_of_experience": <integer total professional years, estimate from employment history, or 0>
}}

Rules:
- NAMES: Parse from header (top of CV), "Name:", contact block, or signature. Western order: first_name = given names, last_name = surname. For single-line headers like "Jean Dupont", split given name vs family name logically.
- birth_date: only if explicit DOB or clear birth year; else "".
- education_level MUST be one of the listed snake_case values or "" if unknown.
- key_skills: max 25 concise items, no duplicates.
- years_of_experience: non-negative integer; 0 if student only or unknown.
- Use "" or [] or 0 for anything not found.
"""
    else:
        prompt = f"""You extract structured data from a disability identification card (plain text, may come from OCR).

CARD TEXT:
---
{trimmed}
---

Respond with ONLY a valid JSON object and no other text (no markdown fences). Use exactly these keys:
{{
  "disability_type": "<one of: motor, visual, hearing, cognitive, psychological, other>",
  "card_number": "<id or reference number if visible, else empty string>",
  "expiry_date": "<expiry as printed, prefer ISO YYYY-MM-DD if clear, else raw string or empty>",
  "first_name": "<given names / first name(s) as on card, Title Case, else empty>",
  "last_name": "<surname / family name as on card, else empty>",
  "birth_date": "<date of birth ONLY as YYYY-MM-DD if you can infer it, else empty string>"
}}

Rules:
- disability_type MUST be exactly one of: motor, visual, hearing, cognitive, psychological, other.
- Map common terms (e.g. physical/mobility -> motor, deaf -> hearing).
- If unclear, use "other" for disability_type.
- NAMES ARE CRITICAL: scan the whole text. Map labels to JSON fields in ANY language you see, for example:
  * English: "Surname" / "Family name" / "Last name" -> last_name; "Given names" / "First name" / "Forename" -> first_name
  * French: "Nom" / "Nom de famille" -> last_name; "Prénom" / "Prénoms" -> first_name (if only "Nom et prénom" on one line, split into last then first if possible)
  * Arabic: اللقب / اسم العائلة -> last_name; الاسم / الاسم الشخصي -> first_name
- If names appear as ALL CAPS (e.g. SMITH, JANE ELIZABETH), still fill first_name and last_name with that text (normalize to readable Title Case in JSON values).
- Do NOT leave first_name/last_name empty if the OCR text clearly contains a person name next to any of these labels.
- For birth_date convert formats like 07-DEC-1989 or 17/01/2028-style birth lines to YYYY-MM-DD when possible.
"""

    try:
        llm = get_llm()
        response = await llm.ainvoke(prompt)
        raw_out = getattr(response, "content", str(response))
        if isinstance(raw_out, list):
            raw_out = "".join(
                getattr(b, "text", str(b)) for b in raw_out
            )
        raw_out = str(raw_out).strip()
        parsed = json.loads(_strip_json_fences(raw_out))
    except Exception as exc:
        logger.warning("Gemini document parse failed: %s", exc)
        return _empty_result(doc_type)

    return _normalize_parsed(parsed, doc_type, ocr_source=trimmed)


def _empty_result(doc_type: str) -> dict[str, Any]:
    if doc_type == "resume":
        return {
            "first_name": "",
            "last_name": "",
            "birth_date": "",
            "email": "",
            "phone_number": "",
            "address": "",
            "industry": "",
            "education_level": "",
            "gender": "",
            "profile_title": "",
            "key_skills": [],
            "years_of_experience": 0,
        }
    return {
        "disability_type": "",
        "card_number": "",
        "expiry_date": "",
        "first_name": "",
        "last_name": "",
        "birth_date": "",
    }


def _normalize_parsed(
    parsed: dict[str, Any],
    doc_type: str,
    ocr_source: str | None = None,
) -> dict[str, Any]:
    if doc_type == "resume":
        title = str(parsed.get("profile_title") or "").strip()
        skills = _coerce_skills(parsed.get("key_skills"))
        years = _coerce_years(parsed.get("years_of_experience"))
        if years is None:
            years = 0
        fn = str(parsed.get("first_name") or "").strip()
        ln = str(parsed.get("last_name") or "").strip()
        bd_raw = str(parsed.get("birth_date") or "").strip()
        bd_iso = normalize_birth_date_iso(bd_raw) if bd_raw else ""
        edu = str(parsed.get("education_level") or "").strip().lower().replace(" ", "_")
        if edu not in VALID_EDUCATION_LEVELS:
            edu = ""
        gen = str(parsed.get("gender") or "").strip().lower()
        if gen not in ("male", "female"):
            gen = ""
        if ocr_source and (not fn or not ln):
            hf, hl = _heuristic_extract_names(ocr_source)
            if not fn and hf:
                fn = hf
            if not ln and hl:
                ln = hl
        if ocr_source and (not fn or not ln):
            rf, rl = _heuristic_resume_header_names(ocr_source[:2000])
            if not fn and rf:
                fn = rf
            if not ln and rl:
                ln = rl
        fn = _title_if_all_caps(fn) if fn else ""
        ln = _title_if_all_caps(ln) if ln else ""
        return {
            "first_name": fn,
            "last_name": ln,
            "birth_date": bd_iso,
            "email": str(parsed.get("email") or "").strip().lower(),
            "phone_number": str(parsed.get("phone_number") or "").strip(),
            "address": str(parsed.get("address") or "").strip(),
            "industry": str(parsed.get("industry") or "").strip(),
            "education_level": edu,
            "gender": gen,
            "profile_title": title,
            "key_skills": skills,
            "years_of_experience": years,
        }

    dt = _normalize_disability_type(parsed.get("disability_type"))
    bd_gemini = str(parsed.get("birth_date") or "").strip()
    bd_iso = normalize_birth_date_iso(bd_gemini) if bd_gemini else ""
    fn = str(parsed.get("first_name") or "").strip()
    ln = str(parsed.get("last_name") or "").strip()
    if ocr_source and (not fn or not ln):
        hf, hl = _heuristic_extract_names(ocr_source)
        if not fn and hf:
            fn = hf
        if not ln and hl:
            ln = hl
    fn = _title_if_all_caps(fn) if fn else ""
    ln = _title_if_all_caps(ln) if ln else ""
    return {
        "disability_type": dt or "",
        "card_number": str(parsed.get("card_number") or "").strip(),
        "expiry_date": str(parsed.get("expiry_date") or "").strip(),
        "first_name": fn,
        "last_name": ln,
        "birth_date": bd_iso,
    }
