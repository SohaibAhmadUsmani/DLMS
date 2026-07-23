import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role

router = APIRouter(tags=["Events"])
COLLECTION = "events"

def _as_oid(v: str) -> ObjectId | None:
    if not re.match(r"^[0-9a-f]{24}$", v, re.I):
        return None
    return ObjectId(v)

class EventCreate(BaseModel):
    title: str
    type: str  # meeting, vacation, exam, other
    start_datetime: str
    end_datetime: str
    description: str = ""
    attendee_ids: list[str] = []

class EventUpdate(BaseModel):
    title: str | None = None
    type: str | None = None
    start_datetime: str | None = None
    end_datetime: str | None = None
    description: str | None = None
    attendee_ids: list[str] | None = None

class EventResponse(BaseModel):
    id: str
    title: str
    type: str
    start_datetime: str
    end_datetime: str
    description: str
    attendee_ids: list[str]
    created_by: str
    created_at: str
    updated_at: str

def _to_response(doc: dict) -> EventResponse:
    return EventResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        type=doc.get("type", "other"),
        start_datetime=doc["start_datetime"],
        end_datetime=doc["end_datetime"],
        description=doc.get("description", ""),
        attendee_ids=doc.get("attendee_ids", []),
        created_by=doc.get("created_by", ""),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )

@router.post("/events", status_code=201)
async def create_event(
    body: EventCreate,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventResponse:
    now = datetime.utcnow().isoformat()
    doc = {
        "title": body.title,
        "type": body.type,
        "start_datetime": body.start_datetime,
        "end_datetime": body.end_datetime,
        "description": body.description,
        "attendee_ids": body.attendee_ids,
        "created_by": payload["sub"],
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_response(doc)

@router.get("/events")
async def list_events(
    upcoming: bool = Query(False),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[EventResponse]:
    query = {}
    if upcoming:
        now = datetime.utcnow().isoformat()
        query["start_datetime"] = {"$gte": now}
    if payload.get("role") in ("teacher", "student"):
        query["$or"] = [
            {"attendee_ids": payload["sub"]},
            {"type": {"$in": ["vacation", "exam"]}},
        ]
    cursor = db[COLLECTION].find(query).sort("start_datetime", 1)
    return [_to_response(doc) async for doc in cursor]

@router.get("/events/{event_id}")
async def get_event(
    event_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventResponse:
    oid = _as_oid(event_id)
    if not oid:
        raise NotFoundError("Event not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Event not found")
    return _to_response(doc)

@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    body: EventUpdate,
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> EventResponse:
    oid = _as_oid(event_id)
    if not oid:
        raise NotFoundError("Event not found")
    update = {k: v for k, v in body.model_dump(exclude_none=True).items() if v is not None}
    if not update:
        raise BadRequestError("No fields to update")
    update["updated_at"] = datetime.utcnow().isoformat()
    doc = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": update},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Event not found")
    return _to_response(doc)

@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _as_oid(event_id)
    if not oid:
        raise NotFoundError("Event not found")
    result = await db[COLLECTION].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise NotFoundError("Event not found")
