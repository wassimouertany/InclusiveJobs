"""
Pydantic models for LLM-generated job offer summaries.

JobSummaryContent doubles as the structured-output schema handed to the LLM
(`with_structured_output`), so it is kept deliberately flat: three string
arrays, no nesting, no aliases.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class JobSummarySource(BaseModel):
    """
    Read-only projection of a job_offers document, limited to the fields that
    feed the summarizer. No recruiter identity, no applicant data, no GridFS ids.
    """

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    job_id: str
    title: str = ""
    profile_title: Optional[str] = None
    description: str = ""
    required_skills: list[str] = Field(default_factory=list)
    key_skills: list[str] = Field(default_factory=list)
    contract_type: Optional[str] = None
    working_conditions: Optional[str] = None
    possible_accommodations: Optional[str] = None
    sector: Optional[str] = None


class JobSummaryContent(BaseModel):
    """The summary itself — also the JSON schema the LLM must fill."""

    main_missions: list[str] = Field(
        default_factory=list,
        description="Concrete missions of the role, at most 4 items, each under 15 words.",
    )
    key_skills: list[str] = Field(
        default_factory=list,
        description="Skills explicitly stated in the offer, at most 4 items, each under 15 words.",
    )
    accommodations: list[str] = Field(
        default_factory=list,
        description=(
            "Accessibility accommodations explicitly stated in possible_accommodations "
            "or working_conditions. Empty array when neither states any."
        ),
    )


class JobSummaryResponse(BaseModel):
    """What generate_summary() returns: the summary plus its provenance."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    job_id: str
    lang: str
    cached: bool
    model: str
    prompt_version: str
    generated_at: datetime
    summary: JobSummaryContent
