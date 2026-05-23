from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_candidate, get_current_recruiter, get_current_user_any_role
from database import db

router = APIRouter(prefix="/stories", tags=["stories"])

VALID_REACTIONS = {"inspiring", "solidarity", "achievement", "supportive"}

REACTION_LABELS = {
    "inspiring":   "💪 Inspiring",
    "solidarity":  "❤️ Solidarity",
    "achievement": "🏆 Achievement",
    "supportive":  "🤝 Supportive",
}


# ---------------------------------------------------------------------------
# Request bodies
# ---------------------------------------------------------------------------

class StoryCreate(BaseModel):
    content: str
    is_anonymous: bool = False


class ReactionBody(BaseModel):
    reaction: str


class CommentBody(BaseModel):
    content: str
    is_anonymous: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _attach_author_info(story: dict) -> dict:
    if story.get("is_anonymous"):
        story["author_name"] = "Anonymous Member"
        story["author_avatar_id"] = None
    return story


def _anonymize_comment(comment: dict) -> dict:
    c = dict(comment)
    if c.get("is_anonymous"):
        c["author_name"] = "Anonymous Member"
        c["author_avatar_id"] = None
    return c


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


async def _get_display_name(user_oid: ObjectId, role: str) -> str:
    if role == "CANDIDATE":
        doc = await db.candidates.find_one({"_id": user_oid})
        first = (doc or {}).get("first_name", "")
        last  = (doc or {}).get("last_name",  "")
        return f"{first} {last}".strip() or "Candidate"
    doc = await db.recruiters.find_one({"_id": user_oid})
    return (doc or {}).get("company_name", "Recruiter")


async def _insert_notification(
    user_id: str,
    user_role: str,
    notif_type: str,
    title: str,
    message: str,
    related_story_id: Optional[str] = None,
) -> None:
    try:
        await db.notifications.insert_one({
            "user_id":               user_id,
            "user_role":             user_role,
            "type":                  notif_type,
            "title":                 title,
            "message":               message,
            "is_read":               False,
            "related_offer_id":      None,
            "related_application_id": None,
            "related_story_id":      related_story_id,
            "created_at":            datetime.now(timezone.utc),
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
        "comments": [],
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
    already_reacted = user_id in story.get("reactions", {}).get(body.reaction, [])

    if already_reacted:
        await db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$pull": {reaction_key: user_id}},
        )
    else:
        await db.stories.update_one(
            {"_id": ObjectId(story_id)},
            {"$addToSet": {reaction_key: user_id}},
        )
        # Notify the story author (but not if reacting to own story)
        if story.get("author_id") != user_id:
            reactor_name = await _get_display_name(current_user["_id"], current_user.get("role", ""))
            await _insert_notification(
                user_id=story["author_id"],
                user_role=story["author_role"],
                notif_type="story_reaction",
                title="Someone reacted to your story",
                message=f"{reactor_name} reacted {REACTION_LABELS.get(body.reaction, body.reaction)} to your story",
                related_story_id=str(story["_id"]),
            )

    updated = await db.stories.find_one({"_id": ObjectId(story_id)})
    return {"ok": True, "reactions": (updated or {}).get("reactions", {})}


# ---------------------------------------------------------------------------
# POST /stories/{story_id}/comments
# ---------------------------------------------------------------------------

@router.post("/{story_id}/comments")
async def add_comment(
    story_id: str,
    body: CommentBody,
    current_user: dict = Depends(get_current_user_any_role),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty.")
    if len(body.content) > 300:
        raise HTTPException(status_code=400, detail="Comment must be 300 characters or fewer.")
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID.")

    story = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")

    role = current_user.get("role", "")
    user_oid = current_user["_id"]
    user_id = str(user_oid)

    if role == "CANDIDATE":
        user_doc = await db.candidates.find_one({"_id": user_oid})
        first = (user_doc or {}).get("first_name", "")
        last  = (user_doc or {}).get("last_name",  "")
        author_name = f"{first} {last}".strip() or "Candidate"
    else:
        user_doc = await db.recruiters.find_one({"_id": user_oid})
        author_name = (user_doc or {}).get("company_name", "Recruiter")

    author_avatar_id = (user_doc or {}).get("logo_id")

    comment = {
        "_id":              str(ObjectId()),
        "author_id":        user_id,
        "author_role":      role,
        "author_name":      author_name,
        "author_avatar_id": author_avatar_id,
        "content":          body.content.strip(),
        "is_anonymous":     body.is_anonymous,
        "created_at":       datetime.now(timezone.utc).isoformat(),
    }

    await db.stories.update_one(
        {"_id": ObjectId(story_id)},
        {"$push": {"comments": comment}},
    )

    # Notify story author (skip self-comment)
    if story.get("author_id") != user_id:
        display = author_name if not body.is_anonymous else "Someone"
        await _insert_notification(
            user_id=story["author_id"],
            user_role=story["author_role"],
            notif_type="story_comment",
            title="New comment on your story",
            message=f"{display} commented on your story",
            related_story_id=str(story["_id"]),
        )

    await award_badge(user_id, "community_voice")

    return _anonymize_comment(comment)


# ---------------------------------------------------------------------------
# DELETE /stories/{story_id}/comments/{comment_id}
# ---------------------------------------------------------------------------

@router.delete("/{story_id}/comments/{comment_id}")
async def delete_comment(
    story_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user_any_role),
):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID.")

    story = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")

    comment = next(
        (c for c in story.get("comments", []) if c.get("_id") == comment_id),
        None,
    )
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")
    if comment.get("author_id") != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="You can only delete your own comments.")

    await db.stories.update_one(
        {"_id": ObjectId(story_id)},
        {"$pull": {"comments": {"_id": comment_id}}},
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# GET /stories/{story_id}/comments
# ---------------------------------------------------------------------------

@router.get("/{story_id}/comments")
async def get_comments(story_id: str):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID.")

    story = await db.stories.find_one({"_id": ObjectId(story_id)}, {"comments": 1})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")

    comments = [_anonymize_comment(c) for c in story.get("comments", [])]
    return {"comments": comments, "count": len(comments)}


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
