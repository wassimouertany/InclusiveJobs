from datetime import date, datetime, timezone
from typing import Optional

import bcrypt
from bson import ObjectId
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import Json

from auth import (
    create_access_token,
    get_current_admin,
    get_current_candidate,
    get_current_recruiter,
    verify_password,
)
from database import db, fs
from gridfs.errors import NoFile
from resume_extraction import (
    extract_text_from_disability_document,
    extract_text_from_resume_pdf,
)
from services.parser_service import normalize_birth_date_iso, parse_document_text
from utils import upload_file_to_gridfs, upload_file_to_gridfs_bytes
from rag_service import invalidate_candidate_index_cache
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


def _allowed_disability_values() -> set[str]:
    return {e.value for e in DisabilityType}


def _allowed_education_values() -> set[str]:
    return {e.value for e in EducationLevel}


def _birth_date_from_parsed(d: dict) -> Optional[date]:
    if not d:
        return None
    raw = (d.get("birth_date") or "").strip()
    if not raw:
        return None
    iso = normalize_birth_date_iso(raw)
    if not iso and len(raw) >= 10 and raw[4] == "-":
        try:
            datetime.strptime(raw[:10], "%Y-%m-%d")
            iso = raw[:10]
        except ValueError:
            iso = ""
    if not iso:
        return None
    try:
        return date.fromisoformat(iso[:10])
    except ValueError:
        return None


def _merge_resume_fields(
    profile_title: str,
    key_skills: list,
    years_of_experience: int,
    parsed_resume: dict,
) -> tuple[str, list, int]:
    pt = (parsed_resume.get("profile_title") or "").strip()
    ks = parsed_resume.get("key_skills")
    ks_list = ks if isinstance(ks, list) else []
    has_parsed_content = bool(pt) or bool(ks_list)
    out_title = pt or profile_title
    out_skills = ks_list if ks_list else key_skills
    y = parsed_resume.get("years_of_experience")
    out_years = years_of_experience
    if isinstance(y, int):
        if y > 0:
            out_years = y
        elif years_of_experience == 0:
            out_years = y
    return out_title, out_skills, out_years


def _resolve_disability_type(
    form_value: DisabilityType,
    parsed_card: dict,
) -> str:
    raw = (parsed_card.get("disability_type") or "").strip()
    if raw in _allowed_disability_values():
        return raw
    return form_value.value


def _merge_identity_from_documents(
    first_name: str,
    last_name: str,
    birth_date: date,
    parsed_card: dict,
    parsed_resume: dict,
) -> tuple[str, str, date]:
    """Card wins for name/DOB when present; otherwise use resume; else form."""
    fn_c = (parsed_card.get("first_name") or "").strip()
    ln_c = (parsed_card.get("last_name") or "").strip()
    fn_r = (parsed_resume.get("first_name") or "").strip()
    ln_r = (parsed_resume.get("last_name") or "").strip()
    out_fn = fn_c or fn_r or first_name
    out_ln = ln_c or ln_r or last_name
    bd = _birth_date_from_parsed(parsed_card)
    if bd is None:
        bd = _birth_date_from_parsed(parsed_resume)
    if bd is None:
        bd = birth_date
    return out_fn, out_ln, bd


def _merge_contact_from_resume(
    email: str,
    phone_number: str,
    address: str,
    industry: str,
    education_level: EducationLevel,
    gender: Gender,
    parsed_resume: dict,
) -> tuple[str, str, str, str, str, str]:
    pr = parsed_resume or {}
    em = (pr.get("email") or "").strip()
    ph = (pr.get("phone_number") or "").strip()
    ad = (pr.get("address") or "").strip()
    ind = (pr.get("industry") or "").strip()
    edu = (pr.get("education_level") or "").strip()
    gen = (pr.get("gender") or "").strip().lower()
    out_e = em if em else email
    out_p = ph if ph else phone_number
    out_a = ad if ad else address
    out_i = ind if ind else industry
    out_edu = edu if edu in _allowed_education_values() else education_level.value
    out_g = gen if gen in ("male", "female") else gender.value
    return out_e, out_p, out_a, out_i, out_edu, out_g


@router.post("/candidates/extract-documents")
async def extract_candidate_documents(
    resume: Optional[UploadFile] = File(None),
    disability_card: Optional[UploadFile] = File(None),
):
    """
    OCR + Gemini: extract resume fields and/or disability card fields for registration auto-fill.
    Does not persist data.
    """
    if not resume and not disability_card:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one file: resume (PDF) or disability_card (PDF/image).",
        )

    out: dict = {"resume": None, "disability_card": None}

    if resume and resume.filename:
        if not resume.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Resume must be a PDF file.")
        rb = await resume.read()
        raw = extract_text_from_resume_pdf(rb) if rb else ""
        out["resume"] = await parse_document_text(raw, "resume")

    if disability_card and disability_card.filename:
        db = await disability_card.read()
        raw_dc = (
            extract_text_from_disability_document(db, disability_card.filename or "")
            if db
            else ""
        )
        out["disability_card"] = await parse_document_text(raw_dc, "disability_card")

    return out


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
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    if resume and resume.filename and not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume must be a PDF file.")

    logo_id: Optional[str] = None
    disability_card_id: Optional[str] = None
    resume_id: Optional[str] = None
    resume_text_raw = ""
    disability_card_text = ""

    if logo and logo.filename:
        logo_id = await upload_file_to_gridfs(logo)
    if disability_card and disability_card.filename:
        dc_bytes = await disability_card.read()
        if dc_bytes:
            disability_card_text = extract_text_from_disability_document(
                dc_bytes, disability_card.filename or ""
            )
        await disability_card.seek(0)
        disability_card_id = await upload_file_to_gridfs(disability_card)
    if resume and resume.filename:
        resume_bytes = await resume.read()
        if resume_bytes:
            resume_text_raw = extract_text_from_resume_pdf(resume_bytes)
        await resume.seek(0)
        resume_id = await upload_file_to_gridfs(resume)

    parsed_resume: dict = {}
    if resume_text_raw.strip():
        parsed_resume = await parse_document_text(resume_text_raw, "resume")

    parsed_card: dict = {}
    if disability_card_text.strip():
        parsed_card = await parse_document_text(disability_card_text, "disability_card")

    merged_title, merged_skills, merged_years = _merge_resume_fields(
        profile_title, key_skills, years_of_experience, parsed_resume
    )
    merged_disability = _resolve_disability_type(disability_type, parsed_card)
    merged_fn, merged_ln, merged_birth = _merge_identity_from_documents(
        first_name, last_name, birth_date, parsed_card, parsed_resume
    )
    merged_email, merged_phone, merged_addr, merged_ind, merged_edu, merged_gen = (
        _merge_contact_from_resume(
            email,
            phone_number,
            address,
            industry,
            education_level,
            gender,
            parsed_resume,
        )
    )

    try:
        validate_email(merged_email)
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format.")

    existing = await db.candidates.find_one({"email": merged_email})
    if existing:
        raise HTTPException(status_code=400, detail="This email is already associated with an account.")

    candidate_dict = {
        "role": "CANDIDATE",
        "last_name": merged_ln,
        "first_name": merged_fn,
        "birth_date": str(merged_birth),
        "email": merged_email,
        "password": hash_password(password),
        "phone_number": merged_phone,
        "address": merged_addr,
        "industry": merged_ind,
        "gender": merged_gen,
        "years_of_experience": merged_years,
        "education_level": merged_edu,
        "work_accommodations": work_accommodations,
        "profile_title": merged_title,
        "key_skills": merged_skills,
        "disability_type": merged_disability,
        "accessibility_needs": accessibility_needs,
        "work_preference": work_preference.value,
        "availability_status": availability_status.value,
        "logo_id": logo_id,
        "disability_card_id": disability_card_id,
        "resume_id": resume_id,
        "resume_text_raw": resume_text_raw,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.candidates.insert_one(candidate_dict)
    candidate_id = str(result.inserted_id)
    invalidate_candidate_index_cache()

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

@router.get("/candidates/me")
async def get_my_profile(current_user: dict = Depends(get_current_candidate)):
    """Return the currently authenticated candidate's own profile."""
    current_user["_id"] = str(current_user["_id"])
    current_user.pop("password", None)
    return current_user


@router.patch("/candidates/me")
async def update_candidate_profile(
    current_user: dict = Depends(get_current_candidate),
    # Text fields (all optional)
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    industry: Optional[str] = Form(None),
    profile_title: Optional[str] = Form(None),
    years_of_experience: Optional[int] = Form(None),
    education_level: Optional[str] = Form(None),
    work_preference: Optional[str] = Form(None),
    availability_status: Optional[str] = Form(None),
    disability_type: Optional[str] = Form(None),
    accessibility_needs: Optional[str] = Form(None),
    key_skills: Optional[Json[list[str]]] = Form(None),
    work_accommodations: Optional[Json[list[str]]] = Form(None),
    # File uploads (all optional)
    photo: Optional[UploadFile] = File(None),
    resume: Optional[UploadFile] = File(None),
    disability_card: Optional[UploadFile] = File(None),
):
    """Update the currently authenticated candidate's profile. All fields optional."""
    candidate_id = current_user["_id"]
    update: dict = {"updated_at": datetime.now(timezone.utc)}

    for field, value in [
        ("first_name", first_name),
        ("last_name", last_name),
        ("phone_number", phone_number),
        ("address", address),
        ("industry", industry),
        ("profile_title", profile_title),
        ("work_preference", work_preference),
        ("availability_status", availability_status),
        ("disability_type", disability_type),
        ("accessibility_needs", accessibility_needs),
    ]:
        if value is not None:
            update[field] = value.strip() if isinstance(value, str) else value

    if years_of_experience is not None:
        update["years_of_experience"] = years_of_experience
    if education_level is not None:
        update["education_level"] = education_level
    if key_skills is not None:
        update["key_skills"] = key_skills
    if work_accommodations is not None:
        update["work_accommodations"] = work_accommodations

    if photo and photo.filename:
        photo_id = await upload_file_to_gridfs(photo)
        update["logo_id"] = photo_id

    if resume and resume.filename:
        if not resume.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Resume must be a PDF.")
        resume_bytes = await resume.read()
        resume_id = await upload_file_to_gridfs_bytes(
            resume_bytes, resume.filename, "application/pdf"
        )
        update["resume_id"] = resume_id
        raw_text = extract_text_from_resume_pdf(resume_bytes) if resume_bytes else ""
        update["resume_text_raw"] = raw_text[:12000]

    if disability_card and disability_card.filename:
        card_id = await upload_file_to_gridfs(disability_card)
        update["disability_card_id"] = card_id

    if len(update) <= 1:  # only updated_at — nothing substantive
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    await db.candidates.update_one({"_id": candidate_id}, {"$set": update})
    invalidate_candidate_index_cache()

    updated = await db.candidates.find_one({"_id": candidate_id})
    updated["_id"] = str(updated["_id"])
    updated.pop("password", None)
    updated.pop("resume_text_raw", None)
    return updated


@router.get("/candidates/me/profile-photo")
async def get_my_profile_photo(current_user: dict = Depends(get_current_candidate)):
    """Stream the candidate's profile picture from GridFS (JWT required)."""
    logo_id = current_user.get("logo_id")
    if not logo_id or not ObjectId.is_valid(str(logo_id)):
        raise HTTPException(status_code=404, detail="No profile photo.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(logo_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)


@router.get("/recruiters/me")
async def get_my_recruiter_profile(current_user: dict = Depends(get_current_recruiter)):
    """Return the currently authenticated recruiter's own profile."""
    current_user["_id"] = str(current_user["_id"])
    current_user.pop("password", None)
    return current_user


@router.get("/recruiters/me/logo")
async def get_my_recruiter_logo(current_user: dict = Depends(get_current_recruiter)):
    """Stream the recruiter's company logo from GridFS (JWT required)."""
    logo_id = current_user.get("logo_id")
    if not logo_id or not ObjectId.is_valid(str(logo_id)):
        raise HTTPException(status_code=404, detail="No logo.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(logo_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)


@router.get("/recruiters/{recruiter_id}/logo")
async def get_recruiter_logo_public(recruiter_id: str):
    """Public recruiter logo stream — no auth required."""
    if not ObjectId.is_valid(recruiter_id):
        raise HTTPException(status_code=400, detail="Invalid recruiter ID.")

    recruiter = await db.recruiters.find_one(
        {"_id": ObjectId(recruiter_id)}, {"logo_id": 1}
    )
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found.")

    logo_id = recruiter.get("logo_id")
    if not logo_id or not ObjectId.is_valid(str(logo_id)):
        raise HTTPException(status_code=404, detail="No logo.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(logo_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)


# ---------------------------------------------------------------------------
# Recruiter public profile helpers
# ---------------------------------------------------------------------------

def _compute_inclusion_score(recruiter: dict, total_offers: int, total_hires: int) -> int:
    base = 0
    if recruiter.get("employees_with_disability", 0) > 0:
        base += 30
    strategy = recruiter.get("inclusion_strategy", "")
    if strategy and len(strategy) > 50:
        base += 20
    if total_hires >= 1:
        base += 20
    if total_hires >= 5:
        base += 15
    if total_offers >= 3:
        base += 15
    return min(base, 100)


def _inclusion_level(score: int) -> str:
    if score >= 85:
        return "Champion"
    if score >= 65:
        return "Gold"
    if score >= 40:
        return "Silver"
    return "Bronze"


async def _build_recruiter_public(recruiter: dict) -> dict:
    rid = str(recruiter["_id"])
    total_offers = await db.job_offers.count_documents({"recruiter_id": rid, "status": "open"})
    total_hires = await db.applications.count_documents({"recruiter_id": rid, "status": "accepted"})
    score = _compute_inclusion_score(recruiter, total_offers, total_hires)
    return {
        "_id": rid,
        "company_name": recruiter.get("company_name", ""),
        "company_industry": recruiter.get("company_industry", ""),
        "location": recruiter.get("location", ""),
        "employee_count": recruiter.get("employee_count", 0),
        "employees_with_disability": recruiter.get("employees_with_disability", 0),
        "inclusion_strategy": recruiter.get("inclusion_strategy", ""),
        "logo_id": recruiter.get("logo_id"),
        "founded_year": recruiter.get("founded_year", 0),
        "created_at": recruiter.get("created_at"),
        "total_offers": total_offers,
        "total_hires": total_hires,
        "inclusion_score": score,
        "inclusion_level": _inclusion_level(score),
    }


@router.get("/recruiters/public/")
async def list_recruiters_public():
    """Public leaderboard — all recruiters ranked by inclusion_score desc, limit 20."""
    cursor = db.recruiters.find()
    recruiters = await cursor.to_list(length=500)
    results = []
    for r in recruiters:
        results.append(await _build_recruiter_public(r))
    results.sort(key=lambda x: x["inclusion_score"], reverse=True)
    return {"recruiters": results[:20]}


@router.get("/recruiters/public/{recruiter_id}")
async def get_recruiter_public(recruiter_id: str):
    """Public recruiter profile with inclusion stats. No auth required."""
    if not ObjectId.is_valid(recruiter_id):
        raise HTTPException(status_code=400, detail="Invalid recruiter ID.")

    recruiter = await db.recruiters.find_one({"_id": ObjectId(recruiter_id)})
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found.")

    return await _build_recruiter_public(recruiter)


@router.get("/candidates/{candidate_id}")
async def get_candidate_by_id(candidate_id: str):
    """Public candidate profile endpoint for recruiter viewing."""
    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=400, detail="Invalid candidate ID.")

    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    candidate["_id"] = str(candidate["_id"])
    candidate.pop("password", None)
    candidate.pop("resume_text_raw", None)
    candidate.pop("disability_card_id", None)

    logo_id = candidate.get("logo_id")
    if logo_id and ObjectId.is_valid(str(logo_id)):
        candidate["photo_url"] = f"/users/candidates/{candidate['_id']}/photo"

    return candidate


@router.get("/candidates/{candidate_id}/resume")
async def get_candidate_resume(candidate_id: str):
    """Public candidate resume stream endpoint."""
    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=400, detail="Invalid candidate ID.")

    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)}, {"resume_id": 1})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    resume_id = candidate.get("resume_id")
    if not resume_id or not ObjectId.is_valid(str(resume_id)):
        raise HTTPException(status_code=404, detail="No resume found.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(resume_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="resume.pdf"'},
    )


@router.get("/candidates/{candidate_id}/photo")
async def get_candidate_photo(candidate_id: str):
    """Public candidate photo stream endpoint."""
    if not ObjectId.is_valid(candidate_id):
        raise HTTPException(status_code=400, detail="Invalid candidate ID.")

    candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)}, {"logo_id": 1})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    logo_id = candidate.get("logo_id")
    if not logo_id or not ObjectId.is_valid(str(logo_id)):
        raise HTTPException(status_code=404, detail="No profile photo.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(logo_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)