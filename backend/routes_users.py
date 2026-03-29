from datetime import date, datetime, timezone
from typing import Optional

import bcrypt
from bson import ObjectId
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import Json

from auth import create_access_token, get_current_admin, verify_password
from database import db, fs
from utils import upload_file_to_gridfs
from models import (
    AdminCreate,
    AvailabilityStatus,
    DisabilityType,
    EducationLevel,
    Gender,
    LoginRequest,
    WorkPreference,
)

router = APIRouter(prefix="/users", tags=["users"])


def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


@router.post("/candidates/")
async def register_candidate(
    last_name: str = Form(...),
    first_name: str = Form(...),
    birth_date: date = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone_number: str = Form(""),
    address: str = Form(""),
    industry: str = Form(""),
    gender: Gender = Form(...),
    years_of_experience: int = Form(0),
    education_level: EducationLevel = Form(...),
    work_accommodations: Json[list[str]] = Form("[]"),
    profile_title: str = Form(""),
    key_skills: Json[list[str]] = Form("[]"),
    disability_type: DisabilityType = Form(...),
    accessibility_needs: str = Form(""),
    work_preference: WorkPreference = Form(...),
    availability_status: AvailabilityStatus = Form(...),
    logo: Optional[UploadFile] = File(None),
    disability_card: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
):
    """
    Register a candidate.
    Accepts multipart/form-data with text fields and files (logo, disability_card, resume).
    """
    try:
        validate_email(email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    existing = await db.candidates.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already associated with an account.")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    if resume and resume.filename and not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume must be a PDF file.")

    logo_id: Optional[str] = None
    disability_card_id: Optional[str] = None
    resume_id: Optional[str] = None

    if logo and logo.filename:
        logo_id = await upload_file_to_gridfs(logo)
    if disability_card and disability_card.filename:
        disability_card_id = await upload_file_to_gridfs(disability_card)
    if resume and resume.filename:
        resume_id = await upload_file_to_gridfs(resume)

    candidate_dict = {
        "role": "CANDIDATE",
        "last_name": last_name,
        "first_name": first_name,
        "birth_date": str(birth_date),
        "email": email,
        "password": hash_password(password),
        "phone_number": phone_number,
        "address": address,
        "industry": industry,
        "gender": gender.value,
        "years_of_experience": years_of_experience,
        "education_level": education_level.value,
        "work_accommodations": work_accommodations,
        "profile_title": profile_title,
        "key_skills": key_skills,
        "disability_type": disability_type.value,
        "accessibility_needs": accessibility_needs,
        "work_preference": work_preference.value,
        "availability_status": availability_status.value,
        "logo_id": logo_id,
        "disability_card_id": disability_card_id,
        "resume_id": resume_id,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.candidates.insert_one(candidate_dict)
    candidate_id = str(result.inserted_id)

    return {
        "id": candidate_id,
        "message": "Candidate registered successfully.",
    }


@router.post("/login/")
async def login(request: LoginRequest):
    """
    Authenticate with email/password.
    Accepts JSON body with email and password.
    """
    user = await db.candidates.find_one({"email": request.email})
    role = "CANDIDATE"
    if user is None:
        user = await db.recruiters.find_one({"email": request.email})
        role = "RECRUITER"
    if user is None:
        user = await db.admins.find_one({"email": request.email})
        role = "ADMIN"

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = user.get("role", role)

    token = create_access_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "id": str(user["_id"]),
    }


@router.post("/recruiters/")
async def register_recruiter(
    email: str = Form(...),
    password: str = Form(...),
    company_name: str = Form(...),
    company_industry: str = Form(""),
    phone_number: str = Form(""),
    location: str = Form(""),
    founded_year: int = Form(0),
    employee_count: int = Form(0),
    employees_with_disability: int = Form(0),
    inclusion_strategy: str = Form(""),
    logo: Optional[UploadFile] = File(None),
):
    """
    Register a recruiter.
    Accepts multipart/form-data with text fields, integers and logo file.
    """
    try:
        validate_email(email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    existing_recruiter = await db.recruiters.find_one({"email": email})
    existing_candidate = await db.candidates.find_one({"email": email})
    if existing_recruiter or existing_candidate:
        raise HTTPException(status_code=400, detail="This email is already in use.")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    if logo and logo.filename:
        allowed_extensions = (".png", ".jpg", ".jpeg")
        if not logo.filename.lower().endswith(allowed_extensions):
            raise HTTPException(status_code=400, detail="Logo must be a PNG or JPEG image.")

    logo_id: Optional[str] = None
    if logo and logo.filename:
        logo_id = await upload_file_to_gridfs(logo)

    recruiter_dict = {
        "role": "RECRUITER",
        "email": email,
        "password": hash_password(password),
        "company_name": company_name,
        "company_industry": company_industry,
        "phone_number": phone_number,
        "location": location,
        "founded_year": founded_year,
        "employee_count": employee_count,
        "employees_with_disability": employees_with_disability,
        "inclusion_strategy": inclusion_strategy,
        "logo_id": logo_id,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.recruiters.insert_one(recruiter_dict)
    recruiter_id = str(result.inserted_id)

    return {
        "id": recruiter_id,
        "message": "Recruiter registered successfully.",
    }


@router.post("/admins/")
async def create_admin(admin_data: AdminCreate):
    """
    Create an administrator.
    Accepts JSON body with email and password.
    """
    try:
        validate_email(admin_data.email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    existing_admin = await db.admins.find_one({"email": admin_data.email})
    existing_recruiter = await db.recruiters.find_one({"email": admin_data.email})
    existing_candidate = await db.candidates.find_one({"email": admin_data.email})
    if existing_admin or existing_recruiter or existing_candidate:
        raise HTTPException(status_code=400, detail="This email is already in use.")

    if len(admin_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    admin_dict = {
        "role": "ADMIN",
        "email": admin_data.email,
        "password": hash_password(admin_data.password),
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.admins.insert_one(admin_dict)
    admin_id = str(result.inserted_id)

    return {
        "id": admin_id,
        "message": "Administrator created successfully.",
    }


@router.get("/admin/candidates/")
async def list_candidates(admin: dict = Depends(get_current_admin)):
    """List all candidates (admin only)."""
    cursor = db.candidates.find()
    candidates = await cursor.to_list(length=100)
    for c in candidates:
        c["_id"] = str(c["_id"])
    return candidates


@router.get("/admin/recruiters/")
async def list_recruiters(admin: dict = Depends(get_current_admin)):
    """List all recruiters (admin only)."""
    cursor = db.recruiters.find()
    recruiters = await cursor.to_list(length=100)
    for r in recruiters:
        r["_id"] = str(r["_id"])
    return recruiters


@router.delete("/admin/users/{role}/{user_id}")
async def delete_user(
    role: str,
    user_id: str,
    admin: dict = Depends(get_current_admin),
):
    """Delete a user (candidate or recruiter) and associated GridFS files."""
    if role not in ("candidate", "recruiter"):
        raise HTTPException(status_code=400, detail="Invalid role. Use 'candidate' or 'recruiter'.")

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID.")

    collection = db.candidates if role == "candidate" else db.recruiters
    user = await collection.find_one({"_id": oid})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    file_fields = ["logo_id", "disability_card_id", "resume_id"]
    for field in file_fields:
        file_id = user.get(field)
        if file_id and ObjectId.is_valid(str(file_id)):
            try:
                await fs.delete(ObjectId(file_id))
            except Exception:
                pass

    await collection.delete_one({"_id": oid})
    return {"message": f"{role.capitalize()} deleted successfully."}
