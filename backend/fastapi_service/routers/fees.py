import re
from datetime import datetime
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pydantic import BaseModel, Field

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role

router = APIRouter(tags=["Fees"])
COLLECTION = "fees"
FINES_COLLECTION = "fee_fines"

def _as_oid(v: str) -> ObjectId | None:
    if not re.match(r"^[0-9a-f]{24}$", v, re.I):
        return None
    return ObjectId(v)

# ─── Pydantic schemas ───────────────────────────────
class FeeCreate(BaseModel):
    student_id: str
    student_name: str
    term: str
    amount_due: int  # paisa
    due_date: str  # ISO datetime string

class FeeUpdate(BaseModel):
    amount_paid: int | None = None
    status: str | None = None  # paid/partial/unpaid
    payment_date: str | None = None

class FineCreate(BaseModel):
    amount: int  # paisa
    reason: str

class FeeResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    term: str
    amount_due: int
    amount_paid: int
    due_date: str
    status: str
    payment_date: str | None
    created_at: str
    updated_at: str
    fines: list[dict] = []

class FineResponse(BaseModel):
    id: str
    fee_id: str
    student_id: str
    amount: int
    reason: str
    created_at: str

class FeeStats(BaseModel):
    total_collected: int
    fine_collected: int
    unpaid_count: int
    total_outstanding: int
    total_due: int

class QuarterlyBreakdown(BaseModel):
    quarter: str
    collected: int
    total_due: int

def _fee_to_response(doc: dict, fines: list[dict] | None = None) -> FeeResponse:
    return FeeResponse(
        id=str(doc["_id"]),
        student_id=doc["student_id"],
        student_name=doc.get("student_name", ""),
        term=doc.get("term", ""),
        amount_due=doc["amount_due"],
        amount_paid=doc.get("amount_paid", 0),
        due_date=doc.get("due_date", ""),
        status=doc.get("status", "unpaid"),
        payment_date=doc.get("payment_date"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
        fines=fines or [],
    )

# ─── Create fee ─────────────────────────────────────
@router.post("/fees", status_code=201)
async def create_fee(
    body: FeeCreate,
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FeeResponse:
    now = datetime.utcnow().isoformat()
    doc = {
        "student_id": body.student_id,
        "student_name": body.student_name,
        "term": body.term,
        "amount_due": body.amount_due,
        "amount_paid": 0,
        "due_date": body.due_date,
        "status": "unpaid",
        "payment_date": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _fee_to_response(doc)

# ─── List fees ──────────────────────────────────────
@router.get("/fees")
async def list_fees(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[FeeResponse]:
    role = payload.get("role")
    query = {}
    if role == "student":
        query["student_id"] = payload["sub"]
    cursor = db[COLLECTION].find(query).sort("created_at", -1)
    result = []
    async for doc in cursor:
        fines_cursor = db[FINES_COLLECTION].find({"fee_id": str(doc["_id"])}).sort("created_at", -1)
        fines = [f async for f in fines_cursor]
        result.append(_fee_to_response(doc, fines))
    return result

# ─── Get single fee ─────────────────────────────────
@router.get("/fees/{fee_id}")
async def get_fee(
    fee_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FeeResponse:
    oid = _as_oid(fee_id)
    if not oid:
        raise NotFoundError("Fee not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Fee not found")
    role = payload.get("role")
    if role == "student" and doc["student_id"] != payload["sub"]:
        raise NotFoundError("Fee not found")
    fines_cursor = db[FINES_COLLECTION].find({"fee_id": fee_id}).sort("created_at", -1)
    fines = [f async for f in fines_cursor]
    return _fee_to_response(doc, fines)

# ─── Update fee ─────────────────────────────────────
@router.patch("/fees/{fee_id}")
async def update_fee(
    fee_id: str,
    body: FeeUpdate,
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FeeResponse:
    oid = _as_oid(fee_id)
    if not oid:
        raise NotFoundError("Fee not found")
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
        raise NotFoundError("Fee not found")
    fines_cursor = db[FINES_COLLECTION].find({"fee_id": fee_id}).sort("created_at", -1)
    fines = [f async for f in fines_cursor]
    return _fee_to_response(doc, fines)

# ─── Add fine to fee ────────────────────────────────
@router.post("/fees/{fee_id}/fines", status_code=201)
async def add_fine(
    fee_id: str,
    body: FineCreate,
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FineResponse:
    oid = _as_oid(fee_id)
    if not oid:
        raise NotFoundError("Fee not found")
    fee = await db[COLLECTION].find_one({"_id": oid})
    if not fee:
        raise NotFoundError("Fee not found")
    now = datetime.utcnow().isoformat()
    fine_doc = {
        "fee_id": fee_id,
        "student_id": fee["student_id"],
        "amount": body.amount,
        "reason": body.reason,
        "created_at": now,
    }
    result = await db[FINES_COLLECTION].insert_one(fine_doc)
    fine_doc["_id"] = result.inserted_id
    return FineResponse(
        id=str(fine_doc["_id"]),
        fee_id=fine_doc["fee_id"],
        student_id=fine_doc["student_id"],
        amount=fine_doc["amount"],
        reason=fine_doc["reason"],
        created_at=fine_doc["created_at"],
    )

# ─── Fee stats (admin dashboard) ────────────────────
@router.get("/fees/stats/summary")
async def fee_stats_summary(
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> FeeStats:
    pipeline_total = await db[COLLECTION].aggregate([
        {"$group": {
            "_id": None,
            "total_collected": {"$sum": "$amount_paid"},
            "total_due": {"$sum": "$amount_due"},
        }}
    ]).to_list(1)
    totals = pipeline_total[0] if pipeline_total else {"total_collected": 0, "total_due": 0}

    unpaid_count = await db[COLLECTION].count_documents({"status": "unpaid"})

    fine_pipeline = await db[FINES_COLLECTION].aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    fine_total = fine_pipeline[0]["total"] if fine_pipeline else 0

    outstanding_docs = await db[COLLECTION].aggregate([
        {"$match": {"status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount_due", "$amount_paid"]}}}}
    ]).to_list(1)
    outstanding = outstanding_docs[0]["total"] if outstanding_docs else 0

    return FeeStats(
        total_collected=totals.get("total_collected", 0),
        fine_collected=fine_total,
        unpaid_count=unpaid_count,
        total_outstanding=outstanding,
        total_due=totals.get("total_due", 0),
    )

# ─── Quarterly breakdown (for chart) ────────────────
@router.get("/fees/stats/quarterly")
async def fee_stats_quarterly(
    _=Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[QuarterlyBreakdown]:
    pipeline = [
        {"$group": {
            "_id": {"year": {"$year": {"$dateFromString": {"dateString": "$created_at"}}}, "quarter": {"$ceil": {"$divide": [{"$month": {"$dateFromString": {"dateString": "$created_at"}}}, 3]}}},
            "collected": {"$sum": "$amount_paid"},
            "total_due": {"$sum": "$amount_due"},
        }},
        {"$sort": {"_id.year": 1, "_id.quarter": 1}},
    ]
    results = await db[COLLECTION].aggregate(pipeline).to_list(50)
    return [
        QuarterlyBreakdown(
            quarter=f"{r['_id']['year']}-Q{int(r['_id']['quarter'])}",
            collected=r["collected"],
            total_due=r["total_due"],
        )
        for r in results
    ]
