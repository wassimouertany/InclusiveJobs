from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Json

from auth import get_current_recruiter
from database import db
from models import ContractType, OfferStatus
from utils import upload_file_to_gridfs

router = APIRouter(prefix="/job-offers", tags=["job-offers"])


class OfferStatusUpdate(BaseModel):
    """Request body for updating offer status."""
    status: OfferStatus


@router.post("/")
async def create_job_offer(
    current_user: dict = Depends(get_current_recruiter),
    title: str = Form(...),
    description: str = Form(""),
    required_skills: Json[list[str]] = Form("[]"),
    profile_title: str = Form(""),
    contract_type: ContractType = Form(...),
    key_skills: Json[list[str]] = Form("[]"),
    working_conditions: str = Form(""),
    possible_accommodations: str = Form(""),
    document: Optional[UploadFile] = File(None),
):
    """
    Create a job offer (recruiter only).
    Accepts multipart/form-data.
    """
    recruiter_id = str(current_user["_id"])

    document_id: Optional[str] = None
    if document and document.filename:
        document_id = await upload_file_to_gridfs(document)

    offer_dict = {
        "recruiter_id": recruiter_id,
        "title": title,
        "description": description,
        "required_skills": required_skills,
        "document_id": document_id,
        "profile_title": profile_title,
        "contract_type": contract_type.value,
        "key_skills": key_skills,
        "working_conditions": working_conditions,
        "possible_accommodations": possible_accommodations,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.job_offers.insert_one(offer_dict)
    offer_id = str(result.inserted_id)

    return {"id": offer_id}


@router.get("/")
async def list_active_offers():
    """List all job offers with status 'open' (public)."""
    cursor = db.job_offers.find({"status": "open"})
    offers = await cursor.to_list(length=100)
    for o in offers:
        o["_id"] = str(o["_id"])
    return offers


@router.get("/my-offers/")
async def list_my_offers(current_user: dict = Depends(get_current_recruiter)):
    """List job offers created by the connected recruiter."""
    recruiter_id = str(current_user["_id"])
    cursor = db.job_offers.find({"recruiter_id": recruiter_id})
    offers = await cursor.to_list(length=100)
    for o in offers:
        o["_id"] = str(o["_id"])
    return offers


@router.put("/{offer_id}")
async def update_offer_status(
    offer_id: str,
    body: OfferStatusUpdate,
    current_user: dict = Depends(get_current_recruiter),
):
    """Update job offer status (recruiter only, owner of the offer)."""
    try:
        oid = ObjectId(offer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid offer ID.")

    offer = await db.job_offers.find_one({"_id": oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")

    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only update your own offers.")

    await db.job_offers.update_one(
        {"_id": oid},
        {"$set": {"status": body.status.value}},
    )

    return {"message": "Offer status updated.", "status": body.status.value}
