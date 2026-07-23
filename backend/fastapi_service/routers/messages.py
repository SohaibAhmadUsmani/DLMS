import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import NotFoundError, BadRequestError
from fastapi_service.core.security import get_current_user, require_role
from bson import ObjectId

router = APIRouter(tags=["messages"])
COLLECTION = "messages"
NOTIF_COLLECTION = "notifications"


async def _create_notif(db, user_id, title, message, type_, link=None):
    doc = {
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type_,
        "link": link,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    await db[NOTIF_COLLECTION].insert_one(doc)


def _format_msg(doc):
    return {
        "id": str(doc["_id"]),
        "sender_id": doc.get("sender_id"),
        "sender_name": doc.get("sender_name", "Unknown"),
        "sender_role": doc.get("sender_role"),
        "recipient_role": doc.get("recipient_role"),
        "recipient_id": doc.get("recipient_id"),
        "parent_id": doc.get("parent_id"),
        "course_id": doc.get("course_id"),
        "subject": doc.get("subject"),
        "body": doc.get("body"),
        "read": doc.get("read", False),
        "created_at": doc["created_at"].isoformat() if hasattr(doc["created_at"], "isoformat") else str(doc["created_at"]),
    }


@router.post("/messages", status_code=201)
async def send_message(
    body: dict,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    recipient_role = body.get("recipient_role")
    recipient_id = body.get("recipient_id")
    subject = body.get("subject", "").strip()
    message_body = body.get("body", "").strip()
    course_id = body.get("course_id")

    if recipient_role not in ("teacher", "admin"):
        raise BadRequestError("recipient_role must be 'teacher' or 'admin'")
    if not subject:
        raise BadRequestError("subject is required")
    if not message_body:
        raise BadRequestError("body is required")

    if recipient_role == "admin" and not recipient_id:
        admin_user = await db["users"].find_one({"role": "admin"}, sort=[("created_at", 1)])
        if not admin_user:
            raise BadRequestError("No admin user found in the system")
        recipient_id = str(admin_user["_id"])
    elif not recipient_id:
        raise BadRequestError("recipient_id is required")

    user = await db["users"].find_one({"_id": ObjectId(payload["sub"])})
    sender_name = user["name"] if user else "Unknown"

    doc = {
        "sender_id": payload["sub"],
        "sender_name": sender_name,
        "sender_role": payload.get("role"),
        "recipient_role": recipient_role,
        "recipient_id": recipient_id,
        "course_id": course_id,
        "subject": subject,
        "body": message_body,
        "parent_id": None,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(doc)
    inserted_id = str(result.inserted_id)

    notif_type = "message_received"
    notif_title = f"New message from {sender_name}"
    notif_message = subject
    notif_link = f"/messages/{inserted_id}"
    await _create_notif(db, recipient_id, notif_title, notif_message, notif_type, notif_link)

    return {"id": inserted_id, **_format_msg(doc)}


@router.post("/messages/{message_id}/reply", status_code=201)
async def reply_to_message(
    message_id: str,
    body: dict,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", message_id, re.I):
        raise NotFoundError("Message not found")
    parent = await db[COLLECTION].find_one({"_id": ObjectId(message_id)})
    if not parent:
        raise NotFoundError("Message not found")

    role = payload.get("role")
    user_id = payload["sub"]
    if role not in ("teacher", "admin") and parent.get("recipient_id") != user_id:
        raise NotFoundError("Message not found")

    message_body = body.get("body", "").strip()
    if not message_body:
        raise BadRequestError("body is required")

    user = await db["users"].find_one({"_id": ObjectId(payload["sub"])})
    sender_name = user["name"] if user else "Unknown"

    thread_root = parent.get("parent_id") or message_id

    reply_doc = {
        "sender_id": user_id,
        "sender_name": sender_name,
        "sender_role": role,
        "recipient_role": parent.get("sender_role"),
        "recipient_id": parent.get("sender_id"),
        "parent_id": thread_root,
        "subject": parent.get("subject"),
        "body": message_body,
        "read": False,
        "created_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(reply_doc)

    await db[COLLECTION].update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"read": True}}
    )

    recipient_id = parent.get("sender_id")
    notif_title = f"Reply from {sender_name}"
    notif_message = f"Re: {parent.get('subject', '')}"
    notif_link = f"/messages/{thread_root}"
    await _create_notif(db, recipient_id, notif_title, notif_message, "message_reply", notif_link)

    return {"id": str(result.inserted_id), **_format_msg(reply_doc)}


@router.get("/messages")
async def list_messages(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    role = payload.get("role")
    user_id = payload["sub"]
    query = {}
    if role == "student":
        query["$or"] = [
            {"sender_id": user_id, "parent_id": None},
            {"recipient_id": user_id},
        ]
    elif role == "teacher":
        query["$or"] = [
            {"recipient_role": "teacher", "recipient_id": user_id},
            {"sender_id": user_id, "sender_role": "teacher", "parent_id": {"$ne": None}},
        ]
    else:
        query = {}

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
        items.append(_format_msg(doc))
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/messages/my-teachers")
async def get_my_teachers(
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    from shared.internal_client import call_console, InternalCallError

    enrollments = db["enrollments"].find({"student_id": payload["sub"], "status": "active"})
    course_ids = set()
    async for e in enrollments:
        course_ids.add(e["course_id"])

    teacher_ids = set()
    for cid in course_ids:
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{cid}/")
        except InternalCallError:
            continue
        if course.get("exists") and course.get("teacher_id"):
            teacher_ids.add(course["teacher_id"])

    teachers = []
    for tid in teacher_ids:
        try:
            tuser = await db["users"].find_one({"_id": ObjectId(tid)})
        except Exception:
            continue
        if tuser:
            teachers.append({
                "id": str(tuser["_id"]),
                "name": tuser.get("name", "Unknown"),
                "email": tuser.get("email", ""),
            })

    return {"teachers": teachers}


@router.get("/messages/{message_id}")
async def get_message(
    message_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", message_id, re.I):
        raise NotFoundError("Message not found")
    doc = await db[COLLECTION].find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise NotFoundError("Message not found")

    role = payload.get("role")
    user_id = payload["sub"]
    thread_root = doc.get("parent_id") or message_id

    cursor = db[COLLECTION].find({
        "$or": [
            {"_id": ObjectId(thread_root)},
            {"parent_id": thread_root},
        ]
    }).sort("created_at", 1)
    thread = [_format_msg(m) async for m in cursor]

    return {"thread": thread, "id": message_id}


@router.patch("/messages/{message_id}/read")
async def mark_message_read(
    message_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", message_id, re.I):
        raise NotFoundError("Message not found")
    doc = await db[COLLECTION].find_one({"_id": ObjectId(message_id)})
    if not doc:
        raise NotFoundError("Message not found")
    thread_root = doc.get("parent_id") or message_id
    role = payload.get("role")
    user_id = payload["sub"]
    match_filter = {"$or": [{"_id": ObjectId(thread_root)}, {"parent_id": thread_root}]}
    if role != "admin":
        match_filter["recipient_id"] = user_id
    result = await db[COLLECTION].update_many(match_filter, {"$set": {"read": True}})
    return {"success": True}
