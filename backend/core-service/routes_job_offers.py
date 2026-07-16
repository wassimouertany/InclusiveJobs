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
        {"company_name": 1, "logo_id": 1, "location": 1, "company_industry": 1},
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
            o["sector"] = (r.get("company_industry") or "").strip()
        else:
            o["company_name"] = ""
            o["company_logo_id"] = None
            o["recruiter_location"] = ""
            o["sector"] = ""
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

    recruiter = await db.recruiters.find_one(
        {"_id": current_user["_id"]}, {"company_industry": 1}
    )
    sector = (recruiter.get("company_industry") or "").strip() if recruiter else ""

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
        "sector": sector,
        "working_conditions": working_conditions,
        "possible_accommodations": possible_accommodations,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "saved_candidates": [],
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
    cursor = db.job_offers.find({"status": "open"}).sort("created_at", -1)
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


def _require_object_id(value: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return ObjectId(value)


async def _attach_saved_candidates_detail(offer: dict) -> None:
    """Mutate offer dict with `saved_candidates_detail`: [{candidate_id, name}, ...]."""
    saved = offer.get("saved_candidates") or []
    if not saved:
        offer["saved_candidates_detail"] = []
        return
    oids: list[ObjectId] = []
    for s in saved:
        if not s or not ObjectId.is_valid(str(s)):
            continue
        oids.append(ObjectId(str(s)))
    if not oids:
        offer["saved_candidates_detail"] = [
            {"candidate_id": str(s), "name": None, "profile_photo_id": None}
            for s in saved
            if s
        ]
        return
    cursor = db.candidates.find(
        {"_id": {"$in": oids}},
        {"first_name": 1, "last_name": 1, "logo_id": 1},
    )
    candidates = await cursor.to_list(length=len(oids))
    by_id = {str(c["_id"]): c for c in candidates}
    detail: list[dict] = []
    for sid in saved:
        sid_str = str(sid)
        c = by_id.get(sid_str)
        if c:
            fn = (c.get("first_name") or "").strip()
            ln = (c.get("last_name") or "").strip()
            name = f"{fn} {ln}".strip() or None
            lid = c.get("logo_id")
            photo_id = str(lid) if lid else None
            detail.append(
                {
                    "candidate_id": sid_str,
                    "name": name,
                    "profile_photo_id": photo_id,
                }
            )
        else:
            detail.append(
                {"candidate_id": sid_str, "name": None, "profile_photo_id": None}
            )
    offer["saved_candidates_detail"] = detail


@router.get("/saved-candidate-avatar/{candidate_id}")
async def get_saved_candidate_avatar(
    candidate_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """
    Stream a candidate's profile photo (GridFS) for recruiters who saved them on an offer.
    """
    cand_oid = _require_object_id(candidate_id, "candidate ID")
    recruiter_id = str(current_user["_id"])
    cid_norm = str(cand_oid)
    has_access = await db.job_offers.find_one(
        {
            "recruiter_id": recruiter_id,
            "$or": [
                {"saved_candidates": cid_norm},
                {"saved_candidates": cand_oid},
            ],
        },
        {"_id": 1},
    )
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="You can only view photos of candidates on your saved shortlist.",
        )

    cand = await db.candidates.find_one({"_id": cand_oid}, {"logo_id": 1})
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    logo_id = cand.get("logo_id")
    if not logo_id or not ObjectId.is_valid(str(logo_id)):
        raise HTTPException(status_code=404, detail="No profile photo.")

    try:
        grid_out = await fs.open_download_stream(ObjectId(str(logo_id)))
    except NoFile:
        raise HTTPException(status_code=404, detail="File not found.")

    data = await grid_out.read()
    media_type = grid_out.content_type or "image/jpeg"
    return Response(content=data, media_type=media_type)


@router.get("/{offer_id}")
async def get_my_offer_detail(
    offer_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """Return one job offer (owner recruiter only), including saved candidate details."""
    oid = _require_object_id(offer_id, "offer ID")
    offer = await db.job_offers.find_one({"_id": oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only view your own offers.")
    offer["_id"] = str(offer["_id"])
    if offer.get("document_id") is not None:
        offer["document_id"] = str(offer["document_id"])
    await _attach_saved_candidates_detail(offer)
    await _enrich_offers_with_recruiter([offer])
    return offer


@router.delete("/{offer_id}")
async def delete_my_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """Permanently delete a job offer (owner recruiter only). Removes attached GridFS doc if any."""
    oid = _require_object_id(offer_id, "offer ID")
    offer = await db.job_offers.find_one({"_id": oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own offers.")

    doc_id = offer.get("document_id")
    if doc_id:
        try:
            await fs.delete(ObjectId(str(doc_id)))
        except (NoFile, Exception):
            pass

    await db.job_offers.delete_one({"_id": oid})
    return {"message": "Offer deleted.", "id": offer_id}


@router.put("/{offer_id}")
async def update_offer_status(
    offer_id: str,
    body: OfferStatusUpdate,
    current_user: dict = Depends(get_current_recruiter),
):
    """Update job offer status (recruiter only, owner of the offer)."""
    oid = _require_object_id(offer_id, "offer ID")

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


@router.patch("/{offer_id}")
async def update_job_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_recruiter),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    required_skills: Optional[Json[list[str]]] = Form(None),
    profile_title: Optional[str] = Form(None),
    contract_type: Optional[ContractType] = Form(None),
    key_skills: Optional[Json[list[str]]] = Form(None),
    working_conditions: Optional[str] = Form(None),
    possible_accommodations: Optional[str] = Form(None),
    document: Optional[UploadFile] = File(None),
):
    """Update a job offer's details (recruiter only, owner of the offer). Accepts multipart/form-data; all fields optional."""
    oid = _require_object_id(offer_id, "offer ID")

    offer = await db.job_offers.find_one({"_id": oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only update your own offers.")

    update: dict = {}
    for field, value in [
        ("title", title),
        ("description", description),
        ("profile_title", profile_title),
        ("working_conditions", working_conditions),
        ("possible_accommodations", possible_accommodations),
    ]:
        if value is not None:
            update[field] = value

    if required_skills is not None:
        update["required_skills"] = required_skills
    if key_skills is not None:
        update["key_skills"] = key_skills
    if contract_type is not None:
        update["contract_type"] = contract_type.value

    if document and document.filename:
        old_doc_id = offer.get("document_id")
        update["document_id"] = await upload_file_to_gridfs(document)
        if old_doc_id:
            try:
                await fs.delete(ObjectId(str(old_doc_id)))
            except (NoFile, Exception):
                pass

    if not update:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    if "title" in update and not update["title"].strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty.")

    await db.job_offers.update_one({"_id": oid}, {"$set": update})

    updated = await db.job_offers.find_one({"_id": oid})
    updated["_id"] = str(updated["_id"])
    if updated.get("document_id") is not None:
        updated["document_id"] = str(updated["document_id"])
    return updated


@router.post("/{offer_id}/save-candidate/{candidate_id}")
async def save_candidate_to_offer(
    offer_id: str,
    candidate_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """Add a candidate to this offer's saved list (recruiter owner only)."""
    offer_oid = _require_object_id(offer_id, "offer ID")
    _require_object_id(candidate_id, "candidate ID")
    candidate_id_str = str(ObjectId(candidate_id))

    offer = await db.job_offers.find_one({"_id": offer_oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only modify your own offers.")

    await db.job_offers.update_one(
        {"_id": offer_oid},
        {"$addToSet": {"saved_candidates": candidate_id_str}},
    )
    return {"message": "Candidate saved.", "candidate_id": candidate_id_str}


@router.delete("/{offer_id}/save-candidate/{candidate_id}")
async def unsave_candidate_from_offer(
    offer_id: str,
    candidate_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """Remove a candidate from this offer's saved list (recruiter owner only)."""
    offer_oid = _require_object_id(offer_id, "offer ID")
    _require_object_id(candidate_id, "candidate ID")
    candidate_id_str = str(ObjectId(candidate_id))

    offer = await db.job_offers.find_one({"_id": offer_oid})
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found.")
    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only modify your own offers.")

    await db.job_offers.update_one(
        {"_id": offer_oid},
        {"$pull": {"saved_candidates": candidate_id_str}},
    )
    return {"message": "Candidate removed from saved.", "candidate_id": candidate_id_str}
