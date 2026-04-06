from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from gridfs.errors import NoFile
from pydantic import BaseModel, Json

from auth import get_current_recruiter
from database import db, fs
from models import ContractType, OfferStatus
from utils import upload_file_to_gridfs

router = APIRouter(prefix="/job-offers", tags=["job-offers"])


async def _enrich_offers_with_recruiter(offers: list) -> list:
    """Attach company_name, company_logo_id, and recruiter_location from recruiters."""
    if not offers:
        return offers
    rid_set = {o.get("recruiter_id") for o in offers if o.get("recruiter_id")}
    if not rid_set:
        return offers
    oids = []
    for rid in rid_set:
        try:
            oids.append(ObjectId(rid))
        except Exception:
            continue
    if not oids:
        return offers
    cursor = db.recruiters.find(
        {"_id": {"$in": oids}},
        {"company_name": 1, "logo_id": 1, "location": 1},
    )
    recruiters = await cursor.to_list(length=len(oids))
    by_id = {str(r["_id"]): r for r in recruiters}
    for o in offers:
        rid = o.get("recruiter_id")
        r = by_id.get(rid) if rid else None
        if r:
            o["company_name"] = (r.get("company_name") or "").strip()
            lid = r.get("logo_id")
            o["company_logo_id"] = str(lid) if lid else None
            o["recruiter_location"] = (r.get("location") or "").strip()
        else:
            o["company_name"] = ""
            o["company_logo_id"] = None
            o["recruiter_location"] = ""
    return offers


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


@router.get("/company-logo/{logo_id}")
async def get_company_logo(logo_id: str):
    """Public: stream recruiter company logo from GridFS (for job cards)."""
    if not ObjectId.is_valid(logo_id):
        raise HTTPException(status_code=400, detail="Invalid logo id.")
    oid = ObjectId(logo_id)
    rec = await db.recruiters.find_one(
        {"$or": [{"logo_id": logo_id}, {"logo_id": oid}]}
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Not found.")
    try:
        grid_out = await fs.open_download_stream(ObjectId(logo_id))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")
    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)


@router.get("/")
async def list_active_offers():
    """List all job offers with status 'open' (public)."""
    cursor = db.job_offers.find({"status": "open"})
    offers = await cursor.to_list(length=100)
    for o in offers:
        o["_id"] = str(o["_id"])
    await _enrich_offers_with_recruiter(offers)
    return offers


@router.get("/my-offers/")
async def list_my_offers(current_user: dict = Depends(get_current_recruiter)):
    """List job offers created by the connected recruiter."""
    recruiter_id = str(current_user["_id"])
    cursor = db.job_offers.find({"recruiter_id": recruiter_id})
    offers = await cursor.to_list(length=100)
    for o in offers:
        o["_id"] = str(o["_id"])
    await _enrich_offers_with_recruiter(offers)
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
