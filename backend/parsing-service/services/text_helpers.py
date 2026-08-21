"""
Shared, doc_type-agnostic text helpers: date/skill/years coercion, disability-type
synonym mapping, and OCR name-cleanup heuristics.

These don't belong to any one DocumentTypeSpec (they're reused by more than one),
so they live here rather than in document_specs.py or parser_service.py. Both of
those modules import from this one; this module imports from neither of them --
that keeps the dependency graph acyclic:

    text_helpers <- document_specs <- parser_service <- main
"""

from __future__ import annotations

import re
from calendar import monthrange
from datetime import datetime
from typing import Any

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
