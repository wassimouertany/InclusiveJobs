from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_candidate
from database import db

router = APIRouter(prefix="/badges", tags=["badges"])

SELF_AWARDABLE = {"hired"}


@router.get("/mine")
async def get_my_badges(current_user: dict = Depends(get_current_candidate)):
    candidate_id = str(current_user["_id"])
    cursor = db.badges.find({"candidate_id": candidate_id}).sort("earned_at", -1)
    badges = await cursor.to_list(length=200)
    for b in badges:
        b["_id"] = str(b["_id"])
    return {"badges": badges}


@router.get("/candidate/{candidate_id}")
async def get_candidate_badges(candidate_id: str):
    cursor = db.badges.find({"candidate_id": candidate_id}).sort("earned_at", -1)
    badges = await cursor.to_list(length=200)
    for b in badges:
        b["_id"] = str(b["_id"])
    return {"badges": badges}


@router.post("/award/{badge_type}")
async def self_award_badge(
    badge_type: str,
    current_user: dict = Depends(get_current_candidate),
):
    if badge_type not in SELF_AWARDABLE:
        raise HTTPException(
            status_code=403,
            detail=f"Only self-awardable badges are allowed: {', '.join(sorted(SELF_AWARDABLE))}.",
        )

    candidate_id = str(current_user["_id"])
    existing = await db.badges.find_one({"candidate_id": candidate_id, "badge_type": badge_type})
    if existing:
        raise HTTPException(status_code=409, detail="Badge already awarded.")

    badge_doc = {
        "candidate_id": candidate_id,
        "badge_type": badge_type,
        "earned_at": datetime.now(timezone.utc),
    }
    result = await db.badges.insert_one(badge_doc)
    badge_doc["_id"] = str(result.inserted_id)
    return badge_doc
