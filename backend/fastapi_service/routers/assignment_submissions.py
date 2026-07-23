import os
import re as _re
import shutil
from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import InternalCallError, call_console

router = APIRouter(tags=["assignment-submissions"])

COLLECTION = "assignment_submissions"
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "assignment_submissions",
)


def _as_oid(v: str) -> ObjectId | None:
    return ObjectId(v) if _re.match(r"^[0-9a-f]{24}$", v, _re.I) else None


@router.post("/assignments/{assignment_id}/submit", status_code=201)
async def submit_assignment(
    assignment_id: str,
    file: UploadFile = File(...),
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    try:
        assignment = await call_console(
            "GET", f"/api/v1/console/internal/assignments/{assignment_id}/"
        )
    except InternalCallError:
        raise
    if not assignment.get("exists"):
        raise NotFoundError("Assignment not found")
    if assignment.get("due_date"):
        due = datetime.fromisoformat(assignment["due_date"])
        if datetime.utcnow() > due:
            raise BadRequestError("Submission period has ended (past due date)")
    course_id = assignment["course_id"]
    enrollment = await db["enrollments"].find_one(
        {"student_id": payload["sub"], "course_id": course_id, "status": "active"}
    )
    if not enrollment:
        raise ForbiddenError("You are not enrolled in this course")

    existing = await db[COLLECTION].find_one(
        {"assignment_id": assignment_id, "student_id": payload["sub"]}
    )
    if existing:
        raise ConflictError("You have already submitted this assignment")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "file")[1]
    saved_name = f"asg_{assignment_id}_{payload['sub']}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    try:
        with open(saved_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except OSError:
        raise BadRequestError("File save failed")

    doc = {
        "assignment_id": assignment_id,
        "student_id": payload["sub"],
        "file_url": f"/uploads/assignment_submissions/{saved_name}",
        "submitted_at": datetime.utcnow(),
        "score": None,
        "feedback": None,
    }
    result = await db[COLLECTION].insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "assignment_id": assignment_id,
        "file_url": doc["file_url"],
        "submitted_at": doc["submitted_at"].isoformat(),
        "score": None,
        "feedback": None,
    }


@router.get("/assignments/{assignment_id}/my-submission")
async def my_submission(
    assignment_id: str,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    doc = await db[COLLECTION].find_one(
        {"assignment_id": assignment_id, "student_id": payload["sub"]}
    )
    if not doc:
        raise NotFoundError("Submission not found")
    return {
        "id": str(doc["_id"]),
        "assignment_id": doc["assignment_id"],
        "file_url": doc["file_url"],
        "submitted_at": doc["submitted_at"].isoformat() if hasattr(doc["submitted_at"], "isoformat") else str(doc["submitted_at"]),
        "score": doc.get("score"),
        "feedback": doc.get("feedback"),
    }


@router.get("/internal/assignment-submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    oid = _as_oid(submission_id)
    if not oid:
        raise NotFoundError("Submission not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Submission not found")
    student_name = doc.get("student_id", "Unknown")
    try:
        user = await db["users"].find_one({"_id": ObjectId(doc["student_id"])})
        if user:
            student_name = user.get("name", "Unknown")
    except Exception:
        pass
    return {
        "id": str(doc["_id"]),
        "assignment_id": doc["assignment_id"],
        "student_id": doc["student_id"],
        "student_name": student_name,
        "file_url": doc["file_url"],
        "submitted_at": doc["submitted_at"].isoformat() if hasattr(doc["submitted_at"], "isoformat") else str(doc["submitted_at"]),
        "score": doc.get("score"),
        "feedback": doc.get("feedback"),
    }


@router.get("/internal/assignment-submissions/by-assignment/{assignment_id}")
async def list_submissions(
    assignment_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict]:
    cursor = db[COLLECTION].find({"assignment_id": assignment_id})
    results = []
    async for doc in cursor:
        student_name = doc.get("student_id", "Unknown")
        try:
            user = await db["users"].find_one({"_id": ObjectId(doc["student_id"])})
            if user:
                student_name = user.get("name", "Unknown")
        except Exception:
            pass
        results.append({
            "id": str(doc["_id"]),
            "assignment_id": doc["assignment_id"],
            "student_id": doc["student_id"],
            "student_name": student_name,
            "file_url": doc["file_url"],
            "submitted_at": doc["submitted_at"].isoformat() if hasattr(doc["submitted_at"], "isoformat") else str(doc["submitted_at"]),
            "score": doc.get("score"),
            "feedback": doc.get("feedback"),
        })
    return results


@router.patch("/internal/assignment-submissions/{submission_id}/grade")
async def grade_submission(
    submission_id: str,
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    """
    This endpoint trusts the caller — console has already verified
    the requesting user owns the course before proxying the request.
    No additional auth is performed here.
    """
    oid = _as_oid(submission_id)
    if not oid:
        raise NotFoundError("Submission not found")
    score = body.get("score")
    feedback = body.get("feedback", "")
    if score is None:
        raise BadRequestError("score is required")
    result = await db[COLLECTION].update_one(
        {"_id": oid},
        {"$set": {"score": score, "feedback": feedback}},
    )
    if result.matched_count == 0:
        raise NotFoundError("Submission not found")
    return {"updated": True, "score": score, "feedback": feedback}
