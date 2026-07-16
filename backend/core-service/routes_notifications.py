from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_any_role
from database import db

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _require_object_id(value: str, field_name: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return ObjectId(value)


@router.get("/")
async def list_notifications(current_user: dict = Depends(get_current_user_any_role)):
    user_id = str(current_user["_id"])
    notifications = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(length=50)

    for n in notifications:
        n["_id"] = str(n["_id"])

    unread_count = sum(1 for n in notifications if not n.get("is_read"))
    return {"notifications": notifications, "unread_count": unread_count}


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user_any_role)):
    user_id = str(current_user["_id"])
    count = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    return {"count": count}


@router.patch("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user_any_role)):
    user_id = str(current_user["_id"])
    result = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}},
    )
    return {"updated": result.modified_count}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user_any_role),
):
    notif_oid = _require_object_id(notification_id, "notification ID")
    user_id = str(current_user["_id"])
    result = await db.notifications.update_one(
        {"_id": notif_oid, "user_id": user_id},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"ok": True}
