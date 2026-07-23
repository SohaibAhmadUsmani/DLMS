from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role
from fastapi_service.routers.certificates import check_and_issue_on_completion
from shared.internal_client import InternalCallError, call_console

router = APIRouter(tags=["enrollments"])


class TeacherEnrollRequest(BaseModel):
    course_id: str
    student_email: str

COLLECTION = "enrollments"


@router.post("/enrollments/teacher", status_code=201)
async def teacher_enroll(
    body: TeacherEnrollRequest,
    payload: dict = Depends(require_role("admin", "teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    student = await db["users"].find_one({"email": body.student_email})
    if not student:
        raise NotFoundError(f"User with email '{body.student_email}' not found")
    if student["role"] != "student":
        raise BadRequestError("User is not a student")

    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{body.course_id}/")
    except InternalCallError:
        raise
    if not course.get("exists"):
        raise NotFoundError("Course not found")

    existing = await db[COLLECTION].find_one(
        {"student_id": str(student["_id"]), "course_id": body.course_id, "status": "active"}
    )
    if existing:
        raise ConflictError("Student is already enrolled")

    enrollment = {
        "student_id": str(student["_id"]),
        "course_id": body.course_id,
        "enrolled_at": datetime.utcnow(),
        "status": "active",
        "progress": 0,
    }
    result = await db[COLLECTION].insert_one(enrollment)
    return {
        "id": str(result.inserted_id),
        "course_id": body.course_id,
        "student_id": str(student["_id"]),
        "student_email": body.student_email,
        "status": "active",
        "progress": 0,
    }


@router.post("/enrollments", status_code=201)
async def enroll(
    course_id: str,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise

    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if not course.get("is_published"):
        raise BadRequestError("Course is not published")

    existing = await db[COLLECTION].find_one(
        {"student_id": payload["sub"], "course_id": course_id, "status": "active"}
    )
    if existing:
        raise ConflictError("Already enrolled")

    enrollment = {
        "student_id": payload["sub"],
        "course_id": course_id,
        "enrolled_at": datetime.utcnow(),
        "status": "active",
        "progress": 0,
    }
    result = await db[COLLECTION].insert_one(enrollment)
    return {
        "id": str(result.inserted_id),
        "course_id": course_id,
        "status": "active",
        "progress": 0,
    }


@router.get("/enrollments/my")
async def my_enrollments(
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict]:
    cursor = db[COLLECTION].find({"student_id": payload["sub"]}).sort("enrolled_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "course_id": doc["course_id"],
            "enrolled_at": doc["enrolled_at"].isoformat() if hasattr(doc["enrolled_at"], "isoformat") else str(doc["enrolled_at"]),
            "status": doc.get("status", "active"),
            "progress": doc.get("progress", 0),
        })
    return results


@router.delete("/enrollments/{enrollment_id}")
async def unenroll(
    enrollment_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    enrollment = await db[COLLECTION].find_one({"_id": ObjectId(enrollment_id)})
    if not enrollment:
        raise NotFoundError("Enrollment not found")

    is_owner = str(enrollment["student_id"]) == payload["sub"]
    is_admin = payload.get("role") == "admin"
    if not is_owner and not is_admin:
        raise ForbiddenError("Forbidden")

    await db[COLLECTION].delete_one({"_id": ObjectId(enrollment_id)})
    return {"deleted": True}


@router.get("/internal/enrollments/course/{course_id}")
async def get_course_enrollments(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict]:
    cursor = db[COLLECTION].find({"course_id": course_id, "status": "active"})
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "student_id": doc["student_id"],
            "enrolled_at": doc["enrolled_at"].isoformat() if hasattr(doc["enrolled_at"], "isoformat") else str(doc["enrolled_at"]),
            "status": doc.get("status", "active"),
        })
    return results


@router.patch("/enrollments/{enrollment_id}/progress")
async def update_progress(
    enrollment_id: str,
    progress: int,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    enrollment = await db[COLLECTION].find_one({"_id": ObjectId(enrollment_id)})
    if not enrollment:
        raise NotFoundError("Enrollment not found")
    is_owner = str(enrollment["student_id"]) == payload["sub"]
    is_admin = payload.get("role") == "admin"
    if not is_owner and not is_admin:
        raise ForbiddenError("Forbidden")
    progress = max(0, min(100, progress))
    await db[COLLECTION].update_one(
        {"_id": ObjectId(enrollment_id)},
        {"$set": {"progress": progress}}
    )

    certificate = None
    if progress == 100:
        certificate = await check_and_issue_on_completion(
            db, str(enrollment["student_id"]), enrollment["course_id"], progress
        )

    result = {"progress": progress}
    if certificate:
        result["certificate"] = {
            "id": str(certificate["_id"]),
            "certificate_id": certificate.get("certificate_id"),
        }
    return result


@router.get("/internal/enrollments/check/{student_id}/{course_id}")
async def check_enrollment(
    student_id: str,
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    enrollment = await db[COLLECTION].find_one(
        {"student_id": student_id, "course_id": course_id, "status": "active"}
    )
    return {"enrolled": enrollment is not None}
