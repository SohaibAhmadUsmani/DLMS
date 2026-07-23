import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role
from bson import ObjectId

router = APIRouter(tags=["announcements"])
COLLECTION = "announcements"
DISMISS_COLLECTION = "announcement_dismissals"


def _audience_for_role(role: str) -> str:
    return "students" if role == "teacher" else "both"


def _format(doc):
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "created_by": doc.get("created_by"),
        "created_by_role": doc.get("created_by_role", "admin"),
        "created_at": doc["created_at"].isoformat() if hasattr(doc["created_at"], "isoformat") else str(doc["created_at"]),
        "updated_at": doc["updated_at"].isoformat() if doc.get("updated_at") and hasattr(doc["updated_at"], "isoformat") else None,
    }


@router.post("/announcements", status_code=201)
async def create_announcement(
    body: dict,
    payload: dict = Depends(require_role("admin", "teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    title = body.get("title", "").strip()
    description = body.get("description", "").strip()
    if not title:
        raise BadRequestError("title is required")
    role = payload.get("role", "admin")
    doc = {
        "title": title,
        "description": description,
        "target_audience": _audience_for_role(role),
        "created_by": payload["sub"],
        "created_by_role": role,
        "is_archived": False,
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }
    result = await db[COLLECTION].insert_one(doc)
    return {"id": str(result.inserted_id), **_format(doc)}


@router.get("/announcements")
async def list_announcements(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    role = payload.get("role")
    query = {}
    if not include_archived:
        query["is_archived"] = {"$ne": True}
    if role == "admin":
        pass
    elif role == "teacher":
        query["$or"] = [
            {"created_by": payload["sub"]},
            {"created_by_role": "admin"},
        ]
    elif role == "student":
        query["$or"] = [
            {"target_audience": "students"},
            {"target_audience": "both"},
        ]

    total = await db[COLLECTION].count_documents(query)
    cursor = db[COLLECTION].find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = [_format(doc) async for doc in cursor]
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/announcements/{announcement_id}")
async def get_announcement(
    announcement_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", announcement_id, re.I):
        raise NotFoundError("Announcement not found")
    doc = await db[COLLECTION].find_one({"_id": ObjectId(announcement_id)})
    if not doc:
        raise NotFoundError("Announcement not found")
    return _format(doc)


@router.put("/announcements/{announcement_id}")
async def update_announcement(
    announcement_id: str,
    body: dict,
    payload: dict = Depends(require_role("admin", "teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", announcement_id, re.I):
        raise NotFoundError("Announcement not found")
    existing = await db[COLLECTION].find_one({"_id": ObjectId(announcement_id)})
    if not existing:
        raise NotFoundError("Announcement not found")
    role = payload.get("role")
    if role != "admin" and existing.get("created_by") != payload["sub"]:
        raise NotFoundError("Announcement not found")
    update = {}
    if "title" in body:
        t = body["title"].strip()
        if not t:
            raise BadRequestError("title cannot be empty")
        update["title"] = t
    if "description" in body:
        d = body["description"].strip()
        if not d:
            raise BadRequestError("description cannot be empty")
        update["description"] = d
    update["updated_at"] = datetime.utcnow()
    await db[COLLECTION].update_one({"_id": ObjectId(announcement_id)}, {"$set": update})
    doc = await db[COLLECTION].find_one({"_id": ObjectId(announcement_id)})
    return _format(doc)


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    payload: dict = Depends(require_role("admin", "teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", announcement_id, re.I):
        raise NotFoundError("Announcement not found")
    existing = await db[COLLECTION].find_one({"_id": ObjectId(announcement_id)})
    if not existing:
        raise NotFoundError("Announcement not found")
    role = payload.get("role")
    if role != "admin" and existing.get("created_by") != payload["sub"]:
        raise NotFoundError("Announcement not found")
    result = await db[COLLECTION].delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise NotFoundError("Announcement not found")
    await db[DISMISS_COLLECTION].delete_many({"announcement_id": announcement_id})
    return {"success": True}


@router.post("/announcements/{announcement_id}/dismiss")
async def dismiss_announcement(
    announcement_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", announcement_id, re.I):
        raise NotFoundError("Announcement not found")
    doc = await db[COLLECTION].find_one({"_id": ObjectId(announcement_id)})
    if not doc:
        raise NotFoundError("Announcement not found")
    await db[DISMISS_COLLECTION].update_one(
        {"user_id": payload["sub"], "announcement_id": announcement_id},
        {"$set": {"dismissed_at": datetime.utcnow()}},
        upsert=True,
    )
    return {"success": True}
