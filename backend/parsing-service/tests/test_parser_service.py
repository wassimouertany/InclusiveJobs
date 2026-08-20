"""
Characterization tests for services/parser_service.py.

These tests freeze the CURRENT behavior of the pure/offline helper functions
(the ones that don't call the LLM) so that upcoming SOLID refactorings can be
verified against a known-good baseline. They intentionally do NOT assert what
the "correct" behavior should be — including quirks such as the ambiguous
DD/MM date-order assumption in `normalize_birth_date_iso`, or the first-match-
wins keyword scanning in `_parse_locally`. If a refactor changes one of these
values, that is a behavior change to flag and discuss, not a bug in the test.

`parse_document_text` is also covered, but only its non-LLM-reaching paths
(unknown doc_type, blank text, missing API key) plus its LLM-touching paths
driven through a FakeLLM stand-in (monkeypatched onto `parser_service.get_llm`)
— no real network/SDK call is ever made.
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from services import parser_service
from services.parser_service import (
    _coerce_skills,
    _coerce_years,
    _empty_result,
    _normalize_disability_type,
    _normalize_parsed,
    _parse_locally,
    normalize_birth_date_iso,
)


# ---------------------------------------------------------------------------
# normalize_birth_date_iso
# ---------------------------------------------------------------------------

class TestNormalizeBirthDateIso:
    @pytest.mark.parametrize(
        "raw, expected",
        [
            # already ISO
            ("1989-12-07", "1989-12-07"),
            # DD-MMM-YYYY / DD/MMM/YYYY (month abbreviation)
            ("07-DEC-1989", "1989-12-07"),
            ("07/DEC/1989", "1989-12-07"),
            # DD/MM/YYYY where day > 12 is unambiguous
            ("17/01/2028", "2028-01-17"),
            ("13/05/2020", "2020-05-13"),
            # ambiguous DD/MM vs MM/DD: current code always assumes DD/MM
            # when neither component exceeds 12 -- freezing that assumption.
            ("05/06/2020", "2020-06-05"),
            # dot separator also accepted
            ("17.01.2028", "2028-01-17"),
        ],
    )
    def test_valid_formats(self, raw, expected):
        assert normalize_birth_date_iso(raw) == expected

    @pytest.mark.parametrize(
        "raw",
        [
            "",
            None,
            "not a date",
            "1989-02-30",  # invalid ISO calendar date
            "31-FEB-1989",  # day out of range for month
            "07-XXX-1989",  # unknown month abbreviation
        ],
    )
    def test_unparseable_returns_empty_string(self, raw):
        assert normalize_birth_date_iso(raw) == ""


# ---------------------------------------------------------------------------
# _coerce_skills
# ---------------------------------------------------------------------------

class TestCoerceSkills:
    def test_none_returns_empty_list(self):
        assert _coerce_skills(None) == []

    def test_list_input_strips_and_drops_blank_entries(self):
        assert _coerce_skills([" Python ", "Java", "", "  "]) == ["Python", "Java"]

    def test_string_input_splits_on_comma_or_semicolon(self):
        assert _coerce_skills("python, java; go ,,") == ["python", "java", "go"]

    def test_unsupported_type_returns_empty_list(self):
        assert _coerce_skills(123) == []

    def test_caps_at_50_items(self):
        skills = [f"skill{i}" for i in range(60)]
        result = _coerce_skills(skills)
        assert len(result) == 50
        assert result[0] == "skill0"
        assert result[-1] == "skill49"


# ---------------------------------------------------------------------------
# _coerce_years
# ---------------------------------------------------------------------------

class TestCoerceYears:
    @pytest.mark.parametrize(
        "raw, expected",
        [
            (None, None),
            ("", None),
            ("5", 5),
            ("5.7", 5),  # truncates via int(float(...))
            (-3, 0),  # clamped to lower bound
            (100, 80),  # clamped to upper bound
            ("abc", None),  # unparseable -> None
            ("42", 42),
        ],
    )
    def test_coerce_years(self, raw, expected):
        assert _coerce_years(raw) == expected


# ---------------------------------------------------------------------------
# _normalize_disability_type
# ---------------------------------------------------------------------------

class TestNormalizeDisabilityType:
    @pytest.mark.parametrize(
        "raw, expected",
        [
            (None, None),
            ("", None),
            ("motor", "motor"),
            ("Physical", "motor"),  # synonym
            ("Mobility", "motor"),  # synonym
            ("unknown_xyz", None),  # not allowed, not a synonym
            ("Hard of Hearing", "hearing"),  # spaces -> underscores -> synonym
            ("MENTAL_HEALTH", "psychological"),
            ("  Deaf  ", "hearing"),
        ],
    )
    def test_normalize_disability_type(self, raw, expected):
        assert _normalize_disability_type(raw) == expected


# ---------------------------------------------------------------------------
# _empty_result
# ---------------------------------------------------------------------------

class TestEmptyResult:
    def test_resume_shape(self):
        assert _empty_result("resume") == {
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

    def test_disability_card_shape(self):
        assert _empty_result("disability_card") == {
            "disability_type": "",
            "card_number": "",
            "expiry_date": "",
            "first_name": "",
            "last_name": "",
            "birth_date": "",
        }


# ---------------------------------------------------------------------------
# _parse_locally (regex/keyword fallback, no LLM call)
# ---------------------------------------------------------------------------

class TestParseLocally:
    RESUME_TEXT = (
        "John Doe\n"
        "Email: john.doe@example.com\n"
        "Phone: +216 22 333 444\n"
        "5 years of experience in software development.\n"
        "Master of Science in Computer Science.\n"
        "Skills: Python, React, Docker, MongoDB, Git\n"
    )

    def test_resume_extraction(self):
        result = _parse_locally(self.RESUME_TEXT, "resume")
        assert result == {
            "email": "john.doe@example.com",
            "phone_number": "+216 22 333 444",
            "years_of_experience": 5,
            "education_level": "masters",
            "key_skills": ["python", "react", "mongodb", "docker", "git"],
        }

    CARD_TEXT = (
        "Disability Identification Card\n"
        "Surname: SMITH\n"
        "Given Names: JANE\n"
        "Date of Birth: 07-DEC-1989\n"
        "Disability Type: Visual impairment - blind\n"
        "Expiry Date: 17/01/2028\n"
    )

    def test_disability_card_extraction(self):
        result = _parse_locally(self.CARD_TEXT, "disability_card")
        # Note: the DD/MM/YYYY expiry line is matched by a second, more
        # specific regex that overwrites the first (YYYY-MM-DD-shaped) match
        # if both are present in the text -- current code always keeps
        # whichever pattern is checked last, freezing that here.
        assert result == {
            "expiry_date": "2028-01-17",
            "disability_type": "visual",
        }

    CARD_TEXT_KEYWORDS_ONLY = (
        "National Disability Card\n"
        "Type: wheelchair user, mobility impairment\n"
        "Expiry: 2028-01-17\n"
    )

    def test_disability_card_first_matching_keyword_wins(self):
        # "wheelchair" appears before "mobility" in the keyword list and in
        # the text; first-match-wins is the current (undocumented) behavior.
        result = _parse_locally(self.CARD_TEXT_KEYWORDS_ONLY, "disability_card")
        assert result == {
            "expiry_date": "2028-01-17",
            "disability_type": "motor",
        }


# ---------------------------------------------------------------------------
# _normalize_parsed -- resume
# ---------------------------------------------------------------------------

class TestNormalizeParsedResume:
    def test_nominal_case(self):
        parsed = {
            "first_name": "john",
            "last_name": "doe",
            "birth_date": "07-DEC-1989",
            "email": "  JOHN.DOE@EXAMPLE.COM ",
            "phone_number": " +216 22 333 444 ",
            "address": "Tunis, Tunisia",
            "industry": "Software",
            "education_level": "Masters",
            "gender": "Male",
            "profile_title": "Backend Developer",
            "key_skills": ["Python", "React", ""],
            "years_of_experience": "5.9",
        }
        assert _normalize_parsed(parsed, "resume") == {
            "first_name": "john",
            "last_name": "doe",
            "birth_date": "1989-12-07",
            "email": "john.doe@example.com",
            "phone_number": "+216 22 333 444",
            "address": "Tunis, Tunisia",
            "industry": "Software",
            "education_level": "masters",
            "gender": "male",
            "profile_title": "Backend Developer",
            "key_skills": ["Python", "React"],
            "years_of_experience": 5,
        }

    def test_missing_fields_defaults_to_empty(self):
        assert _normalize_parsed({}, "resume") == _empty_result("resume")

    def test_all_caps_names_are_title_cased(self):
        parsed = {
            "first_name": "JANE ELIZABETH",
            "last_name": "SMITH",
            "education_level": "not_a_real_level",
        }
        result = _normalize_parsed(parsed, "resume")
        assert result["first_name"] == "Jane Elizabeth"
        assert result["last_name"] == "Smith"

    def test_invalid_education_level_is_blanked(self):
        parsed = {"education_level": "PhD in Rocket Science"}
        result = _normalize_parsed(parsed, "resume")
        assert result["education_level"] == ""

    def test_missing_names_fall_back_to_ocr_heuristics(self):
        ocr_source = "Jane Smith\nSoftware Engineer\njane@example.com"
        parsed = {"profile_title": "Engineer"}
        result = _normalize_parsed(parsed, "resume", ocr_source=ocr_source)
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Smith"
        assert result["profile_title"] == "Engineer"


# ---------------------------------------------------------------------------
# _normalize_parsed -- disability_card
# ---------------------------------------------------------------------------

class TestNormalizeParsedDisabilityCard:
    def test_nominal_case(self):
        parsed = {
            "disability_type": "Physical",
            "card_number": " AB123 ",
            "expiry_date": " 2028-01-17 ",
            "first_name": "jane",
            "last_name": "smith",
            "birth_date": "07-DEC-1989",
        }
        assert _normalize_parsed(parsed, "disability_card") == {
            "disability_type": "motor",  # "Physical" is a synonym for "motor"
            "card_number": "AB123",
            "expiry_date": "2028-01-17",
            "first_name": "jane",
            "last_name": "smith",
            "birth_date": "1989-12-07",
        }

    def test_missing_fields_defaults_to_empty(self):
        assert _normalize_parsed({}, "disability_card") == _empty_result(
            "disability_card"
        )

    def test_all_caps_names_are_title_cased_and_unknown_type_blanked(self):
        parsed = {
            "disability_type": "unknown_type",
            "first_name": "JANE",
            "last_name": "SMITH",
        }
        result = _normalize_parsed(parsed, "disability_card")
        assert result["disability_type"] == ""  # not allowed, not a synonym
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Smith"

    def test_missing_names_fall_back_to_ocr_heuristics(self):
        ocr_source = "Surname: SMITH\nGiven Names: JANE\n"
        parsed = {"disability_type": "motor"}
        result = _normalize_parsed(parsed, "disability_card", ocr_source=ocr_source)
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Smith"
        assert result["disability_type"] == "motor"


# ---------------------------------------------------------------------------
# parse_document_text -- paths that never reach the LLM
# ---------------------------------------------------------------------------

class TestParseDocumentTextNoLlm:
    async def test_unknown_doc_type_raises_valueerror_with_exact_message(self):
        with pytest.raises(ValueError) as exc_info:
            await parser_service.parse_document_text("some text", "diploma")
        # Exact message frozen on purpose: the next refactor must preserve it
        # (or this test must be updated deliberately, not silently).
        assert str(exc_info.value) == "doc_type must be one of ['disability_card', 'resume']"

    @pytest.mark.parametrize("doc_type", ["resume", "disability_card"])
    @pytest.mark.parametrize("blank_text", ["", "   ", "\n\t  \n"])
    async def test_blank_text_returns_empty_result_without_llm_call(
        self, monkeypatch, doc_type, blank_text
    ):
        # If this ever reached the LLM it would try a real network call and
        # error/hang in CI, so also assert get_llm is never invoked.
        def _fail_if_called():
            raise AssertionError("get_llm() must not be called for blank text")

        monkeypatch.setattr(parser_service, "get_llm", _fail_if_called)
        result = await parser_service.parse_document_text(blank_text, doc_type)
        assert result == _empty_result(doc_type)

    @pytest.mark.parametrize("doc_type", ["resume", "disability_card"])
    async def test_missing_google_api_key_returns_empty_result_without_llm_call(
        self, monkeypatch, doc_type
    ):
        monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

        def _fail_if_called():
            raise AssertionError("get_llm() must not be called without GOOGLE_API_KEY")

        monkeypatch.setattr(parser_service, "get_llm", _fail_if_called)
        result = await parser_service.parse_document_text(
            "Some non-blank document text", doc_type
        )
        assert result == _empty_result(doc_type)


# ---------------------------------------------------------------------------
# parse_document_text -- LLM-touching paths, via a FakeLLM (no network)
# ---------------------------------------------------------------------------

class FakeLLM:
    """Stand-in for the LangChain chat model: only needs an async ainvoke()."""

    def __init__(self, content: str | None = None, exception: Exception | None = None):
        self._content = content
        self._exception = exception
        self.received_prompt: str | None = None

    async def ainvoke(self, prompt: str):
        self.received_prompt = prompt
        if self._exception is not None:
            raise self._exception
        return SimpleNamespace(content=self._content)


class TestParseDocumentTextWithFakeLlm:
    RESUME_TEXT = "John Doe\nEmail: john.doe@example.com\n5 years of experience.\n"

    def _install_fake_llm(self, monkeypatch, fake_llm: FakeLLM):
        monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
        monkeypatch.setattr(parser_service, "get_llm", lambda: fake_llm)

    async def test_nominal_resume_response_is_run_through_normalize_parsed(
        self, monkeypatch
    ):
        raw_json = json.dumps(
            {
                "first_name": "JANE",
                "last_name": "DOE",
                "birth_date": "",
                "email": "",
                "phone_number": "",
                "address": "",
                "industry": "",
                "education_level": "Masters",
                "gender": "",
                "profile_title": "Engineer",
                "key_skills": ["Python"],
                "years_of_experience": 3,
            }
        )
        fake = FakeLLM(content=raw_json)
        self._install_fake_llm(monkeypatch, fake)

        result = await parser_service.parse_document_text(self.RESUME_TEXT, "resume")

        # These values only come out this way if _normalize_parsed ran:
        # ALL-CAPS names title-cased, education_level lowercased/validated.
        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Doe"
        assert result["education_level"] == "masters"
        assert result["profile_title"] == "Engineer"
        assert result["key_skills"] == ["Python"]
        assert result["years_of_experience"] == 3

    async def test_markdown_fenced_json_is_stripped_before_parsing(self, monkeypatch):
        raw_json = json.dumps(
            {
                "first_name": "JANE",
                "last_name": "DOE",
                "education_level": "Masters",
                "key_skills": [],
                "years_of_experience": 0,
            }
        )
        fenced = f"```json\n{raw_json}\n```"
        fake = FakeLLM(content=fenced)
        self._install_fake_llm(monkeypatch, fake)

        result = await parser_service.parse_document_text(self.RESUME_TEXT, "resume")

        assert result["first_name"] == "Jane"
        assert result["last_name"] == "Doe"
        assert result["education_level"] == "masters"

    async def test_non_json_response_returns_empty_result(self, monkeypatch):
        fake = FakeLLM(content="Sorry, I cannot help with that request.")
        self._install_fake_llm(monkeypatch, fake)

        result = await parser_service.parse_document_text(self.RESUME_TEXT, "resume")

        assert result == _empty_result("resume")

    async def test_quota_exhausted_falls_back_to_local_parser(self, monkeypatch):
        fake = FakeLLM(exception=Exception("429 RESOURCE_EXHAUSTED"))
        self._install_fake_llm(monkeypatch, fake)

        result = await parser_service.parse_document_text(self.RESUME_TEXT, "resume")

        # The fallback must delegate to _parse_locally on the ORIGINAL text
        # (not the trimmed/prompt-wrapped version).
        assert result == _parse_locally(self.RESUME_TEXT, "resume")
        # Sanity: confirm the fallback actually extracted something, so this
        # test would fail loudly if the delegation were silently dropped.
        assert result["email"] == "john.doe@example.com"

    async def test_long_text_is_truncated_in_prompt_sent_to_llm(self, monkeypatch):
        long_text = "A" * (parser_service.MAX_DOC_TEXT_CHARS + 500)
        fake = FakeLLM(content=json.dumps({}))
        self._install_fake_llm(monkeypatch, fake)

        await parser_service.parse_document_text(long_text, "resume")

        assert fake.received_prompt is not None
        assert "[... truncated ...]" in fake.received_prompt
        # The prompt must not carry the full untruncated text through.
        assert long_text not in fake.received_prompt
