import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_admin
from database import db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/setup")
async def setup_first_admin(body: dict):
    """Create the first admin account. Disabled once any admin exists."""
    existing = await db.admins.count_documents({})
    if existing > 0:
        raise HTTPException(status_code=403, detail="Admin already exists")

    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    await db.admins.insert_one({
        "email": email,
        "password": hashed,
        "role": "ADMIN",
        "created_at": datetime.now(timezone.utc),
    })
    return {"message": "Admin created successfully"}


def _normalize_doc(doc: dict) -> None:
    import json as _json
    for field in ("work_accommodations", "key_skills"):
        val = doc.get(field)
        if isinstance(val, str):
            try:
                parsed = _json.loads(val)
                if isinstance(parsed, list):
                    doc[field] = parsed
            except Exception:
                doc[field] = []
        elif val is None:
            doc[field] = []


def _fill_daily_trend(raw: list, days: int = 30) -> list:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    lookup = {r["_id"]: r["count"] for r in raw}
    result = []
    for i in range(days):
        d = start + timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        result.append({"date": date_str, "count": lookup.get(date_str, 0)})
    return result


def _trend_pipeline(since: datetime) -> list:
    return [
        {"$match": {"created_at": {"$gte": since}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]


@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    (
        total_candidates,
        total_recruiters,
        actively_looking,
        total_offers,
        open_offers,
        total_applications,
        apps_submitted,
        apps_under_review,
        apps_interview,
        apps_accepted,
        apps_rejected,
        total_stories,
        total_badges,
        hired_badges,
        new_candidates_7d,
        new_applications_7d,
        new_offers_7d,
        disability_raw,
        work_pref_raw,
        registrations_raw,
        applications_trend_raw,
    ) = await asyncio.gather(
        db.candidates.count_documents({}),
        db.recruiters.count_documents({}),
        db.candidates.count_documents({"availability_status": "actively_looking"}),
        db.job_offers.count_documents({}),
        db.job_offers.count_documents({"status": "open"}),
        db.applications.count_documents({}),
        db.applications.count_documents({"status": "submitted"}),
        db.applications.count_documents({"status": "under_review"}),
        db.applications.count_documents({"status": "interview_scheduled"}),
        db.applications.count_documents({"status": "accepted"}),
        db.applications.count_documents({"status": "rejected"}),
        db.stories.count_documents({}),
        db.badges.count_documents({}),
        db.badges.count_documents({"badge_type": "hired"}),
        db.candidates.count_documents({"created_at": {"$gte": seven_days_ago}}),
        db.applications.count_documents({"created_at": {"$gte": seven_days_ago}}),
        db.job_offers.count_documents({"created_at": {"$gte": seven_days_ago}}),
        db.candidates.aggregate([
            {"$group": {"_id": "$disability_type", "count": {"$sum": 1}}}
        ]).to_list(length=20),
        db.candidates.aggregate([
            {"$group": {"_id": "$work_preference", "count": {"$sum": 1}}}
        ]).to_list(length=20),
        db.candidates.aggregate(_trend_pipeline(thirty_days_ago)).to_list(length=30),
        db.applications.aggregate(_trend_pipeline(thirty_days_ago)).to_list(length=30),
    )

    # Top inclusive recruiters: aggregate accepted applications, then fetch recruiter docs in parallel
    top_recruiter_agg = await db.applications.aggregate([
        {"$match": {"status": "accepted"}},
        {"$group": {"_id": "$recruiter_id", "total_accepted": {"$sum": 1}}},
        {"$sort": {"total_accepted": -1}},
        {"$limit": 5},
    ]).to_list(length=5)

    async def _fetch_recruiter(entry: dict) -> Optional[dict]:
        rid = entry["_id"]
        query = {"_id": ObjectId(rid)} if ObjectId.is_valid(str(rid)) else {"_id": rid}
        rec = await db.recruiters.find_one(
            query, {"company_name": 1, "employees_with_disability": 1}
        )
        if not rec:
            return None
        return {
            "company_name": rec.get("company_name", ""),
            "employees_with_disability": rec.get("employees_with_disability"),
            "total_accepted": entry["total_accepted"],
        }

    recruiter_results = await asyncio.gather(
        *[_fetch_recruiter(e) for e in top_recruiter_agg]
    )
    top_inclusive_recruiters = [r for r in recruiter_results if r is not None]

    conversion_rate = (
        round(apps_accepted / total_applications * 100, 1) if total_applications > 0 else 0.0
    )

    disability_breakdown = {
        (r["_id"] or "unknown").lower(): r["count"]
        for r in disability_raw
        if r.get("_id")
    }
    work_preference_breakdown = {
        (r["_id"] or "unknown").lower(): r["count"]
        for r in work_pref_raw
        if r.get("_id")
    }

    return {
        "total_candidates": total_candidates,
        "total_recruiters": total_recruiters,
        "actively_looking": actively_looking,
        "total_offers": total_offers,
        "open_offers": open_offers,
        "total_applications": total_applications,
        "applications_submitted": apps_submitted,
        "applications_under_review": apps_under_review,
        "applications_interview_scheduled": apps_interview,
        "applications_accepted": apps_accepted,
        "applications_rejected": apps_rejected,
        "conversion_rate": conversion_rate,
        "disability_breakdown": disability_breakdown,
        "work_preference_breakdown": work_preference_breakdown,
        "top_inclusive_recruiters": top_inclusive_recruiters,
        "total_stories": total_stories,
        "total_badges_awarded": total_badges,
        "hired_badges": hired_badges,
        "new_candidates_7d": new_candidates_7d,
        "new_applications_7d": new_applications_7d,
        "new_offers_7d": new_offers_7d,
        "registrations_trend": _fill_daily_trend(registrations_raw, 30),
        "applications_trend": _fill_daily_trend(applications_trend_raw, 30),
    }


# ── USERS ──────────────────────────────────────────────────────────────────

@router.get("/users/candidates")
async def admin_list_candidates(current_user: dict = Depends(get_current_admin)):
    cursor = db.candidates.find({}, {"password": 0, "resume_text_raw": 0})
    docs = await cursor.to_list(length=500)
    for d in docs:
        d["_id"] = str(d["_id"])
        _normalize_doc(d)
    return docs


@router.get("/users/recruiters")
async def admin_list_recruiters(current_user: dict = Depends(get_current_admin)):
    cursor = db.recruiters.find({}, {"password": 0})
    docs = await cursor.to_list(length=500)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


@router.patch("/users/{role}/{user_id}/status")
async def admin_set_user_status(
    role: str,
    user_id: str,
    body: dict,
    current_user: dict = Depends(get_current_admin),
):
    status = body.get("status")
    if status not in ("active", "suspended"):
        raise HTTPException(status_code=400, detail="status must be 'active' or 'suspended'")
    col = db.candidates if role == "candidate" else db.recruiters
    await col.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True}


# ── JOBS ───────────────────────────────────────────────────────────────────

@router.get("/jobs")
async def admin_list_jobs(current_user: dict = Depends(get_current_admin)):
    cursor = db.job_offers.find()
    docs = await cursor.to_list(length=500)
    for d in docs:
        d["_id"] = str(d["_id"])
        d["recruiter_id"] = str(d.get("recruiter_id", ""))
        try:
            r = await db.recruiters.find_one(
                {"_id": ObjectId(d["recruiter_id"])}, {"company_name": 1, "location": 1}
            )
            if r:
                d["company_name"] = r.get("company_name", "")
                d["location"] = r.get("location", "")
            else:
                d["company_name"] = ""
                d["location"] = ""
        except Exception:
            d["company_name"] = ""
            d["location"] = ""
    return docs


@router.patch("/jobs/{job_id}/status")
async def admin_set_job_status(
    job_id: str,
    body: dict,
    current_user: dict = Depends(get_current_admin),
):
    status = body.get("status")
    if status not in ("open", "closed", "archived"):
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.job_offers.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"status": status}},
    )
    return {"ok": True}


# ── APPLICATIONS ───────────────────────────────────────────────────────────

@router.get("/applications")
async def admin_list_applications(current_user: dict = Depends(get_current_admin)):
    cursor = db.applications.find()
    docs = await cursor.to_list(length=500)
    result = []
    for d in docs:
        d["_id"] = str(d["_id"])
        try:
            cand = await db.candidates.find_one(
                {"_id": ObjectId(d["candidate_id"])}, {"first_name": 1, "last_name": 1}
            )
            job = await db.job_offers.find_one(
                {"_id": ObjectId(d["offer_id"])}, {"title": 1}
            )
            recruiter = await db.recruiters.find_one(
                {"_id": ObjectId(d["recruiter_id"])}, {"company_name": 1}
            )
            d["candidate_name"] = (
                f"{cand.get('first_name', '')} {cand.get('last_name', '')}".strip()
                if cand else "Unknown"
            )
            d["job_title"] = job.get("title", "") if job else ""
            d["company_name"] = recruiter.get("company_name", "") if recruiter else ""
        except Exception:
            d["candidate_name"] = "Unknown"
            d["job_title"] = ""
            d["company_name"] = ""
        result.append(d)
    return result
