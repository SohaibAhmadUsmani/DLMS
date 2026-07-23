from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, NotFoundError, ForbiddenError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import call_console, InternalCallError
from bson import ObjectId
import re

router = APIRouter(tags=["attendance"])
COLLECTION = "semester_attendance"
WEEK_RANGE = list(range(1, 15))


@router.post("/attendance/semester/{course_id}")
async def save_semester_attendance(
    course_id: str,
    body: dict,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    records = body.get("records", [])
    if not records:
        raise BadRequestError("No attendance records provided")

    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise NotFoundError("Course not found")
    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if payload.get("role") == "teacher" and course.get("teacher_id") != payload["sub"]:
        raise ForbiddenError("Forbidden")

    saved = 0
    for rec in records:
        student_id = rec.get("student_id")
        week = rec.get("week")
        status = rec.get("status")

        if not re.match(r"^[0-9a-f]{24}$", str(student_id), re.I):
            continue
        if week not in WEEK_RANGE:
            continue
        if status not in ("present", "absent"):
            raise BadRequestError(f"Invalid status '{status}' for student {student_id}, week {week}")

        student = await db["users"].find_one({"_id": ObjectId(student_id)})
        if not student:
            continue

        await db[COLLECTION].update_one(
            {"course_id": course_id, "student_id": student_id, "week": week},
            {"$set": {"status": status, "marked_by": payload["sub"]}},
            upsert=True,
        )
        saved += 1

    return {"saved": saved, "course_id": course_id}


@router.get("/attendance/semester/{course_id}")
async def get_semester_attendance(
    course_id: str,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise NotFoundError("Course not found")
    if not course.get("exists"):
        raise NotFoundError("Course not found")

    role = payload.get("role")
    if role == "teacher" and course.get("teacher_id") != payload["sub"]:
        raise ForbiddenError("Forbidden")

    cursor = db[COLLECTION].find({"course_id": course_id})
    rows = {}
    async for doc in cursor:
        sid = doc["student_id"]
        if sid not in rows:
            rows[sid] = {}
        rows[sid][doc["week"]] = doc["status"]

    result = []
    for student_id, weeks in rows.items():
        row = {"student_id": student_id}
        for w in WEEK_RANGE:
            row[str(w)] = weeks.get(w, None)
        result.append(row)

    return {"attendance": result, "course_id": course_id}


@router.get("/attendance/my")
async def get_my_attendance(
    course_id: str = None,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query = {"student_id": payload["sub"]}
    if course_id:
        query["course_id"] = course_id
    cursor = db[COLLECTION].find(query).sort("week", 1)
    results = []
    async for doc in cursor:
        results.append({
            "course_id": doc.get("course_id"),
            "week": doc["week"],
            "status": doc["status"],
        })
    return results
