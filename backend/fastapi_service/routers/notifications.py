import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import NotFoundError, BadRequestError
from fastapi_service.core.security import get_current_user, require_role
from bson import ObjectId

router = APIRouter(tags=["notifications"])
COLLECTION = "notifications"


@router.get("/notifications")
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query = {"user_id": payload["sub"]}
    total = await db[COLLECTION].count_documents(query)
    cursor = (
        db[COLLECTION]
        .find(query)
        .sort("created_at", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "title": doc["title"],
            "message": doc.get("message", ""),
            "type": doc.get("type", "info"),
            "link": doc.get("link"),
            "read": doc.get("read", False),
            "created_at": doc["created_at"].isoformat() if hasattr(doc["created_at"], "isoformat") else str(doc["created_at"]),
        })
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/notifications/unread-count")
async def unread_count(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    count = await db[COLLECTION].count_documents({"user_id": payload["sub"], "read": False})
    return {"count": count}


@router.patch("/notifications/{notification_id}/read")
async def mark_read(
    notification_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", notification_id, re.I):
        raise NotFoundError("Notification not found")
    result = await db[COLLECTION].update_one(
        {"_id": ObjectId(notification_id), "user_id": payload["sub"]},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise NotFoundError("Notification not found")
    return {"success": True}


@router.patch("/notifications/read-all")
async def mark_all_read(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    await db[COLLECTION].update_many(
        {"user_id": payload["sub"], "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}


@router.post("/notifications", status_code=201)
async def create_notification(
    body: dict,
    payload: dict = Depends(require_role("admin", "teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = body.get("user_id")
    title = body.get("title")
    if not user_id or not title:
        raise BadRequestError("user_id and title are required")
    doc = {
        "user_id": user_id,
        "title": title,
        "message": body.get("message", ""),
        "type": body.get("type", "info"),
        "link": body.get("link"),
        "read": False,
        "created_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(doc)
    return {"id": str(result.inserted_id)}
