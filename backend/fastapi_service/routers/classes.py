import re
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError, ConflictError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import InternalCallError, call_console

router = APIRouter(tags=["classes"])
COLLECTION = "scheduled_classes"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def _oid(v):
    return ObjectId(v) if isinstance(v, str) and re.match(r"^[0-9a-f]{24}$", v, re.I) else v


def _time_to_min(t: str) -> int:
    parts = t.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _times_overlap(a_start, a_end, b_start, b_end) -> bool:
    return _time_to_min(a_start) < _time_to_min(b_end) and _time_to_min(b_start) < _time_to_min(a_end)


def _normalize_slots(doc: dict) -> list:
    if doc.get("slots"):
        return doc["slots"]
    old_room = doc.get("room", "")
    old_schedule = doc.get("schedule", [])
    if not old_schedule:
        return []
    result = []
    for entry in old_schedule:
        day = entry.get("day", "")
        for s in entry.get("slots", []):
            result.append({
                "day": day,
                "room": old_room,
                "start_time": s.get("start", "08:00"),
                "end_time": s.get("end", "08:50"),
            })
    return result


async def _enrich_class(doc, db):
    teacher_name = "Unknown"
    if doc.get("teacher_id"):
        try:
            t = await db["users"].find_one({"_id": _oid(doc["teacher_id"])})
            if t:
                teacher_name = t.get("name", "Unknown")
        except Exception:
            pass
    course_name = ""
    if doc.get("course_id"):
        try:
            cr = await call_console("GET", f"/api/v1/console/internal/courses/{doc['course_id']}/")
            if cr.get("exists"):
                course_name = cr.get("title", "")
        except Exception:
            pass
    slots = _normalize_slots(doc)
    return {
        "id": str(doc["_id"]),
        "teacher_id": doc.get("teacher_id"),
        "teacher_name": teacher_name,
        "course_id": doc.get("course_id"),
        "course_name": course_name,
        "title": doc.get("title", ""),
        "class_code": doc.get("class_code", ""),
        "slots": slots,
        "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") and hasattr(doc["updated_at"], "isoformat") else None,
    }


def _validate_slots(slots):
    if not slots or not isinstance(slots, list):
        raise BadRequestError("slots must be a non-empty list")
    seen = set()
    for idx, s in enumerate(slots):
        day = s.get("day", "").strip()
        if day not in DAYS:
            raise BadRequestError(f"Slot {idx}: invalid day '{day}'")
        room = s.get("room", "").strip()
        if not room:
            raise BadRequestError(f"Slot {idx}: room is required")
        start = s.get("start_time", "").strip()
        end = s.get("end_time", "").strip()
        if not start or not end:
            raise BadRequestError(f"Slot {idx}: start_time and end_time are required")
        key = (day, room.lower(), start, end)
        if key in seen:
            raise BadRequestError(f"Slot {idx}: duplicate day/room/time entry")
        seen.add(key)
        if _time_to_min(start) >= _time_to_min(end):
            raise BadRequestError(f"Slot {idx}: start_time must be before end_time")


async def _check_conflicts(db, teacher_id, slots, exclude_id=None):
    for s in slots:
        day = s["day"]
        room = s["room"]
        start = s["start_time"]
        end = s["end_time"]
        match_filter = {"_id": {"$ne": _oid(exclude_id)}} if exclude_id else {}

        teacher_busy = await db[COLLECTION].find_one({
            **match_filter,
            "teacher_id": teacher_id,
            "$or": [
                {"slots": {"$elemMatch": {
                    "day": day,
                    "start_time": {"$lt": end},
                    "end_time": {"$gt": start},
                }}},
                {"schedule": {"$elemMatch": {
                    "day": day,
                    "slots": {"$elemMatch": {
                        "start": {"$lt": end},
                        "end": {"$gt": start},
                    }},
                }}},
            ],
        })
        if teacher_busy:
            raise ConflictError(f"Teacher already has a class on {day} at {start}-{end}")

        room_busy = await db[COLLECTION].find_one({
            **match_filter,
            "$or": [
                {"slots": {"$elemMatch": {
                    "day": day,
                    "room": room,
                    "start_time": {"$lt": end},
                    "end_time": {"$gt": start},
                }}},
                {"room": room, "schedule": {"$elemMatch": {
                    "day": day,
                    "slots": {"$elemMatch": {
                        "start": {"$lt": end},
                        "end": {"$gt": start},
                    }},
                }}},
            ],
        })
        if room_busy:
            raise ConflictError(f"Room '{room}' is already booked on {day} at {start}-{end}")


@router.post("/admin/classes", status_code=201)
async def create_class(
    body: dict,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = body.get("teacher_id")
    course_id = body.get("course_id")
    raw_slots = body.get("slots")
    if raw_slots is None:
        raw_slots = body.get("schedule")
    if not teacher_id:
        raise BadRequestError("teacher_id is required")
    if not raw_slots:
        raise BadRequestError("slots is required")

    slots = _normalize_slots({**body, "slots": raw_slots})
    _validate_slots(slots)
    await _check_conflicts(db, teacher_id, slots)

    doc = {
        "teacher_id": teacher_id,
        "course_id": course_id,
        "title": body.get("title", ""),
        "class_code": body.get("class_code", ""),
        "slots": slots,
        "created_by": payload["sub"],
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }
    result = await db[COLLECTION].insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.put("/admin/classes/{class_id}")
async def update_class(
    class_id: str,
    body: dict,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", class_id, re.I):
        raise NotFoundError("Class not found")
    existing = await db[COLLECTION].find_one({"_id": ObjectId(class_id)})
    if not existing:
        raise NotFoundError("Class not found")

    teacher_id = body.get("teacher_id") or existing.get("teacher_id")
    course_id = body.get("course_id") or existing.get("course_id")
    raw_slots = body.get("slots")
    if raw_slots is None:
        raw_slots = body.get("schedule")
    if raw_slots is not None:
        slots = _normalize_slots({**body, "slots": raw_slots})
        _validate_slots(slots)
        await _check_conflicts(db, teacher_id, slots, exclude_id=class_id)
    else:
        slots = _normalize_slots(existing)

    update = {
        "$set": {
            "teacher_id": teacher_id,
            "course_id": course_id,
            "title": body.get("title", existing.get("title", "")),
            "class_code": body.get("class_code", existing.get("class_code", "")),
            "slots": slots,
            "updated_at": datetime.utcnow(),
        }
    }
    await db[COLLECTION].update_one({"_id": ObjectId(class_id)}, update)
    updated = await db[COLLECTION].find_one({"_id": ObjectId(class_id)})
    return await _enrich_class(updated, db)


@router.get("/admin/classes")
async def get_all_classes(
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db[COLLECTION].find().sort("created_at", -1).limit(100)
    items = []
    async for doc in cursor:
        items.append(await _enrich_class(doc, db))
    return {"items": items}


@router.get("/admin/classes/{class_id}")
async def get_class(
    class_id: str,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", class_id, re.I):
        raise NotFoundError("Class not found")
    doc = await db[COLLECTION].find_one({"_id": ObjectId(class_id)})
    if not doc:
        raise NotFoundError("Class not found")
    return await _enrich_class(doc, db)


@router.get("/classes/upcoming")
async def get_upcoming_classes(
    limit: int = 10,
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db[COLLECTION].find({"teacher_id": payload["sub"]}).sort("created_at", -1).limit(limit)
    items = []
    async for doc in cursor:
        items.append(await _enrich_class(doc, db))
    return {"items": items}


@router.get("/my-classes")
async def get_my_classes(
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db[COLLECTION].find({"teacher_id": payload["sub"]}).sort("created_at", -1).limit(50)
    items = []
    async for doc in cursor:
        items.append(await _enrich_class(doc, db))
    return {"items": items}


@router.delete("/admin/classes/{class_id}")
async def delete_class(
    class_id: str,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if not re.match(r"^[0-9a-f]{24}$", class_id, re.I):
        raise NotFoundError("Class not found")
    result = await db[COLLECTION].delete_one({"_id": ObjectId(class_id)})
    if result.deleted_count == 0:
        raise NotFoundError("Class not found")
    return {"success": True}
