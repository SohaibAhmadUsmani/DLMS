import re
from datetime import datetime
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError, ForbiddenError
from fastapi_service.core.security import get_current_user, require_role

router = APIRouter(tags=["Leave Requests"])
COLLECTION = "leave_requests"

def _as_oid(v: str) -> ObjectId | None:
    if not re.match(r"^[0-9a-f]{24}$", v, re.I):
        return None
    return ObjectId(v)

class LeaveCreate(BaseModel):
    leave_type: str  # Emergency, Casual, Sick, Other
    start_date: str
    end_date: str
    reason: str

class LeaveResponse(BaseModel):
    id: str
    requester_id: str
    requester_name: str
    requester_picture: str | None
    requester_role: str | None
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    status: str
    applied_on: str
    reviewed_by: str | None
    reviewed_at: str | None
    review_notes: str | None

def _to_response(doc: dict) -> LeaveResponse:
    return LeaveResponse(
        id=str(doc["_id"]),
        requester_id=doc["requester_id"],
        requester_name=doc.get("requester_name", ""),
        requester_picture=doc.get("requester_picture"),
        requester_role=doc.get("requester_role"),
        leave_type=doc.get("leave_type", ""),
        start_date=doc.get("start_date", ""),
        end_date=doc.get("end_date", ""),
        reason=doc.get("reason", ""),
        status=doc.get("status", "pending"),
        applied_on=doc.get("applied_on", ""),
        reviewed_by=doc.get("reviewed_by"),
        reviewed_at=doc.get("reviewed_at"),
        review_notes=doc.get("review_notes"),
    )

@router.post("/leave-requests", status_code=201)
async def create_leave_request(
    body: LeaveCreate,
    payload: dict = Depends(require_role("teacher", "student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> LeaveResponse:
    user = await db["users"].find_one({"_id": ObjectId(payload["sub"])})
    name = user.get("name", "Unknown") if user else "Unknown"
    picture = user.get("profile_picture_url") if user else None
    role = payload.get("role", "student")
    now = datetime.utcnow().isoformat()
    doc = {
        "requester_id": payload["sub"],
        "requester_name": name,
        "requester_picture": picture,
        "requester_role": role,
        "leave_type": body.leave_type,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "reason": body.reason,
        "status": "pending",
        "applied_on": now,
        "reviewed_by": None,
        "reviewed_at": None,
        "review_notes": None,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_response(doc)

@router.get("/leave-requests")
async def list_leave_requests(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[LeaveResponse]:
    role = payload.get("role")
    query = {}
    if role in ("teacher", "student"):
        query["requester_id"] = payload["sub"]
    cursor = db[COLLECTION].find(query).sort("applied_on", -1)
    return [_to_response(doc) async for doc in cursor]

@router.get("/leave-requests/pending-count")
async def pending_leave_count(
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    count = await db[COLLECTION].count_documents({"status": "pending"})
    return {"count": count}

@router.get("/leave-requests/{leave_id}")
async def get_leave_request(
    leave_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> LeaveResponse:
    oid = _as_oid(leave_id)
    if not oid:
        raise NotFoundError("Leave request not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Leave request not found")
    role = payload.get("role")
    if role in ("teacher", "student") and doc["requester_id"] != payload["sub"]:
        raise NotFoundError("Leave request not found")
    return _to_response(doc)

@router.patch("/leave-requests/{leave_id}/approve")
async def approve_leave_request(
    leave_id: str,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> LeaveResponse:
    oid = _as_oid(leave_id)
    if not oid:
        raise NotFoundError("Leave request not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Leave request not found")
    if doc.get("status") != "pending":
        raise BadRequestError(f"Leave request is already {doc['status']}")
    now = datetime.utcnow().isoformat()
    doc = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": {
            "status": "approved",
            "reviewed_by": payload["sub"],
            "reviewed_at": now,
        }},
        return_document=True,
    )
    return _to_response(doc)

@router.patch("/leave-requests/{leave_id}/reject")
async def reject_leave_request(
    leave_id: str,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> LeaveResponse:
    oid = _as_oid(leave_id)
    if not oid:
        raise NotFoundError("Leave request not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Leave request not found")
    if doc.get("status") != "pending":
        raise BadRequestError(f"Leave request is already {doc['status']}")
    now = datetime.utcnow().isoformat()
    doc = await db[COLLECTION].find_one_and_update(
        {"_id": oid},
        {"$set": {
            "status": "rejected",
            "reviewed_by": payload["sub"],
            "reviewed_at": now,
        }},
        return_document=True,
    )
    return _to_response(doc)
