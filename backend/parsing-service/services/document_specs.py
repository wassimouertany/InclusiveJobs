"""
Per-document-type behavior: prompt building, normalization, offline regex
fallback, and file text-extraction, as pluggable specs.

Open/Closed Principle: adding a new document type (e.g. "diploma") means
adding one new DocumentTypeSpec subclass and one registry entry below --
no existing branch in parser_service.py or main.py needs to change.

The shared low-level helpers (name heuristics, date/skill/years coercion,
disability-type synonym mapping) stay in services/parser_service.py and are
reused here, since they aren't doc_type-specific themselves.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Any

from resume_extraction import (
    extract_text_from_disability_document,
    extract_text_from_resume_pdf,
)
from services.parser_service import (
    VALID_EDUCATION_LEVELS,
    _coerce_skills,
    _coerce_years,
    _heuristic_extract_names,
    _heuristic_resume_header_names,
    _normalize_disability_type,
    _title_if_all_caps,
    normalize_birth_date_iso,
)


class DocumentTypeSpec(ABC):
    """Everything that varies by document type, in one place per type."""

    doc_type: str

    @abstractmethod
    def build_prompt(self, text: str) -> str:
        """Build the full Gemini prompt from already-trimmed OCR text."""

    @abstractmethod
    def empty_result(self) -> dict[str, Any]:
        """Shape returned when there's nothing to parse or parsing failed."""

    @abstractmethod
    def normalize(
        self, parsed: dict[str, Any], ocr_source: str | None = None
    ) -> dict[str, Any]:
        """Coerce/validate a raw Gemini JSON payload into the stable output shape."""

    @abstractmethod
    def parse_locally(self, text: str) -> dict[str, Any]:
        """Regex/keyword fallback used when the LLM quota is exhausted."""

    @abstractmethod
    def extract_text(self, content: bytes, filename: str) -> str:
        """OCR/text extraction from the raw uploaded file for this document type."""


class ResumeSpec(DocumentTypeSpec):
    doc_type = "resume"

    def build_prompt(self, text: str) -> str:
        return f"""You extract ALL useful structured data from a job resume/CV (plain text, may come from OCR).

RESUME TEXT:
---
{text}
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

    def empty_result(self) -> dict[str, Any]:
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

    def normalize(
        self, parsed: dict[str, Any], ocr_source: str | None = None
    ) -> dict[str, Any]:
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

    def parse_locally(self, text: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        t = text.lower()

        m = re.search(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', text)
        if m:
            result["email"] = m.group(0)

        m = re.search(r'[\+\(]?[0-9][0-9 .\-\(\)]{7,}[0-9]', text)
        if m:
            result["phone_number"] = m.group(0).strip()

        m = re.search(r'(\d+)\s*(?:years?|ans?)\s*(?:of\s*)?(?:experience|expérience)', text, re.I)
        if m:
            result["years_of_experience"] = int(m.group(1))

        for kw, val in [
            ("doctorate", "doctorate"), ("phd", "doctorate"),
            ("master", "masters"), ("mba", "masters"),
            ("ingénieur", "engineering_degree"), ("engineering", "engineering_degree"),
            ("bachelor", "bachelors"), ("licence", "bachelors"), ("b.tech", "bachelors"),
            ("baccalauréat", "high_school"), ("high school", "high_school"),
            ("vocational", "vocational_training"), ("bts", "vocational_training"),
        ]:
            if kw in t:
                result["education_level"] = val
                break

        SKILLS = [
            "python", "java", "javascript", "typescript", "react", "angular", "vue",
            "nodejs", "fastapi", "django", "flask", "spring", "mongodb", "postgresql",
            "mysql", "docker", "kubernetes", "git", "aws", "azure", "figma", "sql",
            "html", "css", "tailwind", "langchain", "machine learning", "tensorflow",
            "pytorch", "scrum", "agile", "jira", "linux", "bash", "c++", "c#", "php",
            "ruby", "swift", "kotlin", "flutter", "dart", "redis", "elasticsearch",
        ]
        result["key_skills"] = [s for s in SKILLS if s in t]

        return result

    def extract_text(self, content: bytes, filename: str) -> str:
        return extract_text_from_resume_pdf(content, filename)


class DisabilityCardSpec(DocumentTypeSpec):
    doc_type = "disability_card"

    def build_prompt(self, text: str) -> str:
        return f"""You extract structured data from a disability identification card (plain text, may come from OCR).

CARD TEXT:
---
{text}
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

    def empty_result(self) -> dict[str, Any]:
        return {
            "disability_type": "",
            "card_number": "",
            "expiry_date": "",
            "first_name": "",
            "last_name": "",
            "birth_date": "",
        }

    def normalize(
        self, parsed: dict[str, Any], ocr_source: str | None = None
    ) -> dict[str, Any]:
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

    def parse_locally(self, text: str) -> dict[str, Any]:
        result: dict[str, Any] = {}
        t = text.lower()

        m = re.search(r'(\d{4}-\d{2}-\d{2})', text)
        if m:
            result["expiry_date"] = m.group(1)
        m2 = re.search(r'(\d{2})[\/\-](\d{2})[\/\-](\d{4})', text)
        if m2:
            result["expiry_date"] = f"{m2.group(3)}-{m2.group(2)}-{m2.group(1)}"

        for kw, val in [
            ("motor", "motor"), ("mobility", "motor"), ("wheelchair", "motor"),
            ("visual", "visual"), ("blind", "visual"), ("sight", "visual"),
            ("hearing", "hearing"), ("deaf", "hearing"),
            ("cognitive", "cognitive"), ("learning", "cognitive"),
            ("psychological", "psychological"), ("mental", "psychological"),
        ]:
            if kw in t:
                result["disability_type"] = val
                break

        return result

    def extract_text(self, content: bytes, filename: str) -> str:
        return extract_text_from_disability_document(content, filename)


DOCUMENT_SPECS: dict[str, DocumentTypeSpec] = {
    "resume": ResumeSpec(),
    "disability_card": DisabilityCardSpec(),
}

# Kept as a name (not a hardcoded frozenset) so it always reflects the
# registry above -- adding an entry to DOCUMENT_SPECS is enough.
DOC_TYPES = DOCUMENT_SPECS.keys()


def get_spec(doc_type: str) -> DocumentTypeSpec:
    try:
        return DOCUMENT_SPECS[doc_type]
    except KeyError:
        raise ValueError(f"doc_type must be one of {sorted(DOCUMENT_SPECS.keys())}") from None
