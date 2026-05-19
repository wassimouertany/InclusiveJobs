from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_candidate, get_current_recruiter
from database import db
from models import ApplicationStatus

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplyRequest(BaseModel):
    offer_id: str
    cover_letter: str = ""


class StatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    interview_date: Optional[str] = None
    interview_location: str = ""
    interview_notes: str = ""


def _require_object_id(value: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return ObjectId(value)


@router.post("/")
async def apply_to_offer(
    body: ApplyRequest,
    current_user: dict = Depends(get_current_candidate),
):
    offer_oid = _require_object_id(body.offer_id, "offer ID")
    offer = await db.job_offers.find_one({"_id": offer_oid})
    if not offer or offer.get("status") != "open":
        raise HTTPException(status_code=404, detail="Offer not found or not open.")

    candidate_id = str(current_user["_id"])
    existing = await db.applications.find_one(
        {"offer_id": body.offer_id, "candidate_id": candidate_id}
    )
    if existing:
        raise HTTPException(status_code=409, detail="Already applied.")

    now = datetime.now(timezone.utc)
    result = await db.applications.insert_one({
        "offer_id": body.offer_id,
        "candidate_id": candidate_id,
        "recruiter_id": offer["recruiter_id"],
        "status": "submitted",
        "cover_letter": body.cover_letter,
        "created_at": now,
        "updated_at": now,
    })
    application_id = str(result.inserted_id)

    await db.notifications.insert_one({
        "user_id": offer["recruiter_id"],
        "user_role": "RECRUITER",
        "type": "application_received",
        "title": "New application received",
        "message": (
            f"{current_user['first_name']} {current_user['last_name']}"
            f" applied to {offer['title']}"
        ),
        "is_read": False,
        "related_offer_id": body.offer_id,
        "related_application_id": application_id,
        "created_at": now,
    })

    return {"application_id": application_id, "status": "submitted"}


@router.get("/mine")
async def get_my_applications(current_user: dict = Depends(get_current_candidate)):
    candidate_id = str(current_user["_id"])
    applications = await db.applications.find(
        {"candidate_id": candidate_id}
    ).to_list(length=200)

    for app in applications:
        app["_id"] = str(app["_id"])
        offer_id = app.get("offer_id")
        if offer_id and ObjectId.is_valid(offer_id):
            offer = await db.job_offers.find_one(
                {"_id": ObjectId(offer_id)}, {"title": 1, "recruiter_id": 1}
            )
        else:
            offer = None
        if offer:
            app["offer_title"] = offer.get("title", "")
            rid = offer.get("recruiter_id")
            if rid and ObjectId.is_valid(rid):
                recruiter = await db.recruiters.find_one(
                    {"_id": ObjectId(rid)}, {"company_name": 1}
                )
                app["company_name"] = (recruiter.get("company_name") or "") if recruiter else ""
            else:
                app["company_name"] = ""
        else:
            app["offer_title"] = ""
            app["company_name"] = ""

    applications.sort(
        key=lambda x: x.get("created_at") or datetime.min, reverse=True
    )
    return applications


@router.get("/for-offer/{offer_id}")
async def get_applications_for_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    offer_oid = _require_object_id(offer_id, "offer ID")
    offer = await db.job_offers.find_one({"_id": offer_oid}, {"recruiter_id": 1})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only view applications for your own offers.")

    applications = await db.applications.find(
        {"offer_id": offer_id}
    ).to_list(length=500)

    for app in applications:
        app["_id"] = str(app["_id"])
        cid = app.get("candidate_id")
        if cid and ObjectId.is_valid(cid):
            candidate = await db.candidates.find_one(
                {"_id": ObjectId(cid)},
                {"password": 0, "resume_text_raw": 0},
            )
            if candidate:
                candidate["_id"] = str(candidate["_id"])
            app["candidate"] = candidate
        else:
            app["candidate"] = None

    applications.sort(
        key=lambda x: x.get("created_at") or datetime.min, reverse=True
    )
    return applications


@router.patch("/{application_id}/status")
async def update_application_status(
    application_id: str,
    body: StatusUpdateRequest,
    current_user: dict = Depends(get_current_recruiter),
):
    app_oid = _require_object_id(application_id, "application ID")
    application = await db.applications.find_one({"_id": app_oid})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    if application["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only update applications for your own offers.")

    now = datetime.now(timezone.utc)
    update: dict = {
        "status": body.status.value,
        "updated_at": now,
        "interview_notes": body.interview_notes,
    }
    if body.interview_date:
        try:
            parsed_date = datetime.fromisoformat(body.interview_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid interview_date format. Use ISO 8601.")
        update["interview_date"] = parsed_date
        update["interview_location"] = body.interview_location

    await db.applications.update_one({"_id": app_oid}, {"$set": update})

    offer_title = ""
    offer_id = application.get("offer_id")
    if offer_id and ObjectId.is_valid(offer_id):
        offer = await db.job_offers.find_one({"_id": ObjectId(offer_id)}, {"title": 1})
        if offer:
            offer_title = offer.get("title", "")

    is_interview = body.status == ApplicationStatus.INTERVIEW_SCHEDULED
    await db.notifications.insert_one({
        "user_id": application["candidate_id"],
        "user_role": "CANDIDATE",
        "type": "interview_scheduled" if is_interview else "application_status_changed",
        "title": "Interview scheduled!" if is_interview else "Application status updated",
        "message": (
            f"Your interview for '{offer_title}' is scheduled on {body.interview_date}."
            if is_interview
            else f"Your application for '{offer_title}' is now {body.status.value.replace('_', ' ')}."
        ),
        "is_read": False,
        "related_offer_id": offer_id,
        "related_application_id": application_id,
        "created_at": now,
    })

    updated = await db.applications.find_one({"_id": app_oid})
    updated["_id"] = str(updated["_id"])
    return updated


@router.get("/{application_id}")
async def get_application_detail(application_id: str):
    app_oid = _require_object_id(application_id, "application ID")
    application = await db.applications.find_one({"_id": app_oid})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    application["_id"] = str(application["_id"])

    offer_id = application.get("offer_id")
    if offer_id and ObjectId.is_valid(offer_id):
        offer = await db.job_offers.find_one(
            {"_id": ObjectId(offer_id)}, {"title": 1, "recruiter_id": 1}
        )
        if offer:
            application["offer_title"] = offer.get("title", "")
            rid = offer.get("recruiter_id")
            if rid and ObjectId.is_valid(rid):
                recruiter = await db.recruiters.find_one(
                    {"_id": ObjectId(rid)}, {"company_name": 1}
                )
                application["company_name"] = (recruiter.get("company_name") or "") if recruiter else ""
            else:
                application["company_name"] = ""
        else:
            application["offer_title"] = ""
            application["company_name"] = ""

    cid = application.get("candidate_id")
    if cid and ObjectId.is_valid(cid):
        candidate = await db.candidates.find_one(
            {"_id": ObjectId(cid)}, {"first_name": 1, "last_name": 1}
        )
        if candidate:
            fn = (candidate.get("first_name") or "").strip()
            ln = (candidate.get("last_name") or "").strip()
            application["candidate_name"] = f"{fn} {ln}".strip()
        else:
            application["candidate_name"] = ""
    else:
        application["candidate_name"] = ""

    return application
