from datetime import date, datetime
from enum import Enum
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class EducationLevel(str, Enum):
    NO_DEGREE = "no_degree"
    VOCATIONAL_TRAINING = "vocational_training"
    HIGH_SCHOOL = "high_school"
    BACHELORS = "bachelors"
    MASTERS = "masters"
    ENGINEERING_DEGREE = "engineering_degree"
    DOCTORATE = "doctorate"
    OTHER = "other"


class DisabilityType(str, Enum):
    MOTOR = "motor"
    VISUAL = "visual"
    HEARING = "hearing"
    COGNITIVE = "cognitive"
    PSYCHOLOGICAL = "psychological"
    OTHER = "other"


class WorkPreference(str, Enum):
    FULLY_REMOTE = "fully_remote"
    HYBRID = "hybrid"
    ON_SITE = "on_site"
    FLEXIBLE_HOURS = "flexible_hours"
    PART_TIME = "part_time"


class AvailabilityStatus(str, Enum):
    ACTIVELY_LOOKING = "actively_looking"
    UNAVAILABLE = "unavailable"


class Role(str, Enum):
    RECRUITER = "RECRUITER"
    CANDIDATE = "CANDIDATE"
    ADMIN = "ADMIN"


class ContractType(str, Enum):
    PERMANENT = "permanent"  # CDI
    FIXED_TERM = "fixed_term"  # CDD
    CIVP = "civp"
    KARAMA = "karama"
    INTERNSHIP = "internship"  # Stage


class OfferStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    ARCHIVED = "archived"


class LoginRequest(BaseModel):
    """Request body for login (JSON)."""
    email: str
    password: str


class CandidateDB(BaseModel):
    """MongoDB document model for a candidate."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.CANDIDATE)
    last_name: str
    first_name: str
    birth_date: date
    email: str
    password: str
    phone_number: str = ""
    address: str = ""
    industry: str = ""
    gender: Gender
    years_of_experience: int = 0
    education_level: EducationLevel
    work_accommodations: list[str] = Field(default_factory=list)
    profile_title: str = ""
    key_skills: list[str] = Field(default_factory=list)
    disability_type: DisabilityType
    accessibility_needs: str = ""
    work_preference: WorkPreference
    availability_status: AvailabilityStatus

    # GridFS file IDs
    logo_id: Optional[str] = None
    disability_card_id: Optional[str] = None
    resume_id: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convert MongoDB ObjectId to str for id field."""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class RecruiterDB(BaseModel):
    """MongoDB document model for a recruiter."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.RECRUITER)
    email: str
    password: str
    company_name: str
    company_industry: str = ""
    phone_number: str = ""
    location: str = ""
    founded_year: int = 0
    employee_count: int = 0
    employees_with_disability: int = 0
    inclusion_strategy: str = ""

    # GridFS file ID for logo
    logo_id: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convert MongoDB ObjectId to str for id field."""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class AdminCreate(BaseModel):
    """Request body for creating an admin."""
    email: str
    password: str


class AdminDB(BaseModel):
    """MongoDB document model for an admin."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    role: Role = Field(default=Role.ADMIN)
    email: str
    password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convert MongoDB ObjectId to str for id field."""
        if isinstance(v, ObjectId):
            return str(v)
        return v


class JobOfferDB(BaseModel):
    """MongoDB document model for a job offer."""

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = Field(default=None, alias="_id")
    recruiter_id: str
    title: str
    description: str
    required_skills: list[str] = Field(default_factory=list)
    document_id: Optional[str] = None
    profile_title: str = ""
    contract_type: ContractType
    key_skills: list[str] = Field(default_factory=list)
    working_conditions: str = ""
    possible_accommodations: str = ""
    status: OfferStatus = Field(default=OfferStatus.OPEN)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convert MongoDB ObjectId to str for id field."""
        if isinstance(v, ObjectId):
            return str(v)
        return v
