from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_candidate, get_current_recruiter
from database import db
from rag_service import find_matching_candidates, find_matching_offers
from bson import ObjectId

router = APIRouter(prefix="/ai", tags=["ai-matching"])
##hello world

@router.get("/matches/for-offer/{offer_id}")
async def get_candidates_for_offer(
    offer_id: str,
    top_k: int = 10,
    current_user: dict = Depends(get_current_recruiter),
):
    """
    Recruiter endpoint: given one of their job offers,
    returns the top_k most compatible candidates with AI explanations.
    """
    try:
        oid = ObjectId(offer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid offer ID.")

    offer = await db.job_offers.find_one({"_id": oid})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your offer.")

    matches = await find_matching_candidates(offer, top_k=top_k)
    return {"offer_id": offer_id, "matches": matches}


@router.get("/matches/for-candidate")
async def get_offers_for_candidate(
    top_k: int = 10,
    current_user: dict = Depends(get_current_candidate),
):
    """
    Candidate endpoint: returns the top_k most compatible job offers
    for the currently logged-in candidate, with AI explanations.
    """
    matches = await find_matching_offers(current_user, top_k=top_k)
    return {"candidate_id": str(current_user["_id"]), "matches": matches}


@router.get("/analyze/{offer_id}/{candidate_id}")
async def analyze_pair(
    offer_id: str,
    candidate_id: str,
    current_user: dict = Depends(get_current_recruiter),
):
    """
    Deep-dive: analyze the compatibility between one specific offer
    and one specific candidate. Used when a recruiter clicks 'View AI Analysis'.
    """
    try:
        offer = await db.job_offers.find_one({"_id": ObjectId(offer_id)})
        candidate = await db.candidates.find_one({"_id": ObjectId(candidate_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID.")

    if not offer or not candidate:
        raise HTTPException(status_code=404, detail="Offer or candidate not found.")

    if offer["recruiter_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your offer.")

    # Run both directions for a complete picture
    from rag_service import _explain_match, build_candidate_text, build_offer_text
    result = await _explain_match(
        entity_a=build_offer_text(offer),
        entity_b=build_candidate_text(candidate),
        context_a="job offer",
        context_b="candidate profile",
    )
    return {
        "offer_id": offer_id,
        "candidate_id": candidate_id,
        "offer_title": offer.get("title"),
        "candidate_name": f"{candidate.get('first_name','')} {candidate.get('last_name','')}".strip(),
        **result,
    }