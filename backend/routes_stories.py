from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_candidate, get_current_recruiter, get_current_user_any_role
from database import db

router = APIRouter(prefix="/stories", tags=["stories"])

VALID_REACTIONS = {"inspiring", "solidarity", "achievement", "supportive"}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class StoryCreate(BaseModel):
    content: str
    is_anonymous: bool = False


class ReactionBody(BaseModel):
    reaction: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _attach_author_info(story: dict) -> dict:
    if story.get("is_anonymous"):
        story["author_name"] = "Anonymous Member"
        story["author_avatar_id"] = None
    return story


async def award_badge(candidate_id: str, badge_type: str) -> None:
    try:
        existing = await db.badges.find_one(
            {"candidate_id": candidate_id, "badge_type": badge_type}
        )
        if not existing:
            await db.badges.insert_one({
                "candidate_id": candidate_id,
                "badge_type": badge_type,
                "earned_at": datetime.now(timezone.utc),
            })
    except Exception:
        pass


# ---------------------------------------------------------------------------
# POST /stories/  — create a story
# ---------------------------------------------------------------------------

@router.post("/")
async def create_story(
    body: StoryCreate,
    current_user: dict = Depends(get_current_user_any_role),
):
    if len(body.content) > 500:
        raise HTTPException(status_code=400, detail="Content must be 500 characters or fewer.")

    role = current_user.get("role", "")
    user_oid = current_user["_id"]

    if role == "CANDIDATE":
        user_doc = await db.candidates.find_one({"_id": user_oid})
        first = (user_doc or {}).get("first_name", "")
        last = (user_doc or {}).get("last_name", "")
        author_name = f"{first} {last}".strip() or "Candidate"
    else:
        user_doc = await db.recruiters.find_one({"_id": user_oid})
        author_name = (user_doc or {}).get("company_name", "Recruiter")

    author_avatar_id = (user_doc or {}).get("logo_id")

    story_doc = {
        "author_id": str(user_oid),
        "author_role": role,
        "author_name": author_name,
        "author_avatar_id": author_avatar_id,
        "content": body.content.strip(),
        "is_anonymous": body.is_anonymous,
        "reactions": {},
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.stories.insert_one(story_doc)
    story_doc["_id"] = str(result.inserted_id)

    await award_badge(str(user_oid), "community_voice")

    return await _attach_author_info(story_doc)


# ---------------------------------------------------------------------------
# GET /stories/mine  — must be before /{story_id} routes
# ---------------------------------------------------------------------------

@router.get("/mine")
async def get_my_stories(
    current_user: dict = Depends(get_current_user_any_role),
):
    user_id = str(current_user["_id"])
    cursor = db.stories.find({"author_id": user_id}).sort("created_at", -1)
    stories = await cursor.to_list(length=200)
    for s in stories:
        s["_id"] = str(s["_id"])
        await _attach_author_info(s)
    return {"stories": stories}


# ---------------------------------------------------------------------------
# GET /stories/  — public feed
# ---------------------------------------------------------------------------

@router.get("/")
async def list_stories(skip: int = 0, limit: int = 20):
    total = await db.stories.count_documents({})
    cursor = db.stories.find().sort("created_at", -1).skip(skip).limit(limit)
    stories = await cursor.to_list(length=limit)
    for s in stories:
        s["_id"] = str(s["_id"])
        await _attach_author_info(s)
        s["total_reactions"] = sum(len(v) for v in s.get("reactions", {}).values())
    return {"stories": stories, "total": total}


# ---------------------------------------------------------------------------
# POST /stories/{story_id}/react  — toggle a reaction
# ---------------------------------------------------------------------------

@router.post("/{story_id}/react")
async def react_to_story(
    story_id: str,
    body: ReactionBody,
    current_user: dict = Depends(get_current_user_any_role),
):
    if body.reaction not in VALID_REACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reaction. Must be one of: {', '.join(sorted(VALID_REACTIONS))}.",
        )
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID.")

    story = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")

    user_id = str(current_user["_id"])
    reaction_key = f"reactions.{body.reaction}"

    if user_id in story.get("reactions", {}).get(body.reaction, []):
        await db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$pull": {reaction_key: user_id}},
        )
    else:
        await db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$addToSet": {reaction_key: user_id}},
        )

    updated = await db.stories.find_one({"_id": ObjectId(story_id)})
    return {"ok": True, "reactions": (updated or {}).get("reactions", {})}


# ---------------------------------------------------------------------------
# DELETE /stories/{story_id}
# ---------------------------------------------------------------------------

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    current_user: dict = Depends(get_current_user_any_role),
):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID.")

    story = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")

    if story.get("author_id") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own stories.")

    await db.stories.delete_one({"_id": ObjectId(story_id)})
    return {"ok": True}
