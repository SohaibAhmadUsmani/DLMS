import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import NotFoundError, BadRequestError, ForbiddenError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import call_console

logger = logging.getLogger(__name__)

router = APIRouter(tags=["certificates"])

COLLECTION = "certificates"

CERTIFICATE_BADGE_KEY = "certificate_badge_text"
CERTIFICATE_SIGNER_KEY = "certificate_signer_name"
CERTIFICATE_SIGNER_TITLE_KEY = "certificate_signer_title"


async def _get_badge_text() -> str:
    try:
        resp = await call_console("GET", f"/api/v1/console/internal/settings/{CERTIFICATE_BADGE_KEY}")
        return resp.get("value", "Company Award")
    except Exception:
        return "Company Award"


async def _get_course_title(course_id: str) -> str:
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
        return course.get("title", "Course")
    except Exception:
        return "Course"


async def _generate_certificate_id(course_id: str, student_id: str) -> str:
    short_course = course_id[-6:] if len(course_id) >= 6 else course_id
    short_student = student_id[-6:] if len(student_id) >= 6 else student_id
    ts = int(datetime.now(timezone.utc).timestamp() * 1000)
    return f"CERT-{short_course}-{short_student}-{ts}"


async def _get_course_teacher(course_id: str, db: AsyncIOMotorDatabase) -> tuple:
    teacher_id = None
    teacher_name = "Instructor"
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
        teacher_id = course.get("teacher_id")
        course_title = course.get("title", "Course")
        if teacher_id:
            teacher_user = await db["users"].find_one({"_id": ObjectId(teacher_id) if ObjectId.is_valid(teacher_id) else teacher_id})
            if teacher_user:
                teacher_name = teacher_user.get("name", "Instructor")
    except Exception as e:
        logger.warning("Could not fetch course teacher: %s", e)
        course_title = "Course"
    return teacher_id, teacher_name, course_title


async def auto_issue_certificate(
    db: AsyncIOMotorDatabase,
    student_id: str,
    course_id: str,
) -> dict | None:
    existing = await db[COLLECTION].find_one(
        {"student_id": student_id, "course_id": course_id}
    )
    if existing:
        return None

    teacher_id, teacher_name, course_title = await _get_course_teacher(course_id, db)

    student = await db["users"].find_one({"_id": ObjectId(student_id)})
    student_name = student.get("name", "Student") if student else "Student"

    cert_id = await _generate_certificate_id(course_id, student_id)
    now = datetime.now(timezone.utc)

    doc = {
        "student_id": student_id,
        "course_id": course_id,
        "teacher_id": teacher_id,
        "student_name": student_name,
        "course_title": course_title,
        "teacher_name": teacher_name,
        "certificate_id": cert_id,
        "issued_at": now,
    }

    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


# ── Auto-issue hook (called from enrollments when progress reaches 100) ──


async def check_and_issue_on_completion(
    db: AsyncIOMotorDatabase,
    student_id: str,
    course_id: str,
    progress: int,
) -> dict | None:
    if progress < 100:
        return None
    return await auto_issue_certificate(db, student_id, course_id)


# ── Student: My Certificates ──


@router.get("/certificates/my")
async def my_certificates(
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db[COLLECTION].find({"student_id": payload["sub"]}).sort("issued_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "certificate_id": doc.get("certificate_id"),
            "course_id": doc.get("course_id"),
            "course_title": doc.get("course_title", "Course"),
            "student_name": doc.get("student_name", "Student"),
            "issued_at": doc["issued_at"].isoformat() if hasattr(doc["issued_at"], "isoformat") else str(doc["issued_at"]),
        })
    return results


@router.get("/certificates/{cert_id}")
async def get_certificate(
    cert_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    doc = await db[COLLECTION].find_one({"_id": ObjectId(cert_id)})
    if not doc:
        raise NotFoundError("Certificate not found")

    is_owner = str(doc["student_id"]) == payload["sub"]
    is_admin = payload.get("role") == "admin"
    if not is_owner and not is_admin:
        raise ForbiddenError("Forbidden")

    badge_text = await _get_badge_text()
    completion_year = str(doc["issued_at"].year) if hasattr(doc["issued_at"], "year") else str(datetime.now(timezone.utc).year)

    return {
        "id": str(doc["_id"]),
        "certificate_id": doc.get("certificate_id"),
        "student_id": doc.get("student_id"),
        "course_id": doc.get("course_id"),
        "course_title": doc.get("course_title", "Course"),
        "student_name": doc.get("student_name", "Student"),
        "teacher_name": doc.get("teacher_name", "Instructor"),
        "issued_at": doc["issued_at"].isoformat() if hasattr(doc["issued_at"], "isoformat") else str(doc["issued_at"]),
        "badge_text": badge_text,
        "completion_year": completion_year,
    }


# ── Admin: Audit ──


@router.get("/admin/certificates")
async def admin_certificates(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    match: dict = {}
    if search:
        match["$or"] = [
            {"student_name": {"$regex": search, "$options": "i"}},
            {"course_title": {"$regex": search, "$options": "i"}},
            {"certificate_id": {"$regex": search, "$options": "i"}},
            {"teacher_name": {"$regex": search, "$options": "i"}},
        ]

    total = await db[COLLECTION].count_documents(match)
    cursor = db[COLLECTION].find(match).sort("issued_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "certificate_id": doc.get("certificate_id"),
            "student_name": doc.get("student_name", "Student"),
            "course_title": doc.get("course_title", "Course"),
            "teacher_name": doc.get("teacher_name", "Instructor"),
            "issued_at": doc["issued_at"].isoformat() if hasattr(doc["issued_at"], "isoformat") else str(doc["issued_at"]),
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


# ── Admin: Certificate Settings ──


@router.get("/admin/certificates/settings")
async def get_certificate_settings(
    payload: dict = Depends(require_role("admin")),
):
    badge_text = await _get_badge_text()
    return {
        "badge_text": badge_text,
    }


@router.put("/admin/certificates/settings")
async def update_certificate_settings(
    body: dict,
    payload: dict = Depends(require_role("admin")),
):
    badge_text = body.get("badge_text", "Company Award")
    if not badge_text or not badge_text.strip():
        raise BadRequestError("badge_text is required")

    from shared.internal_client import call_console as cc
    try:
        existing = await cc("GET", f"/api/v1/console/internal/settings/{CERTIFICATE_BADGE_KEY}")
    except Exception:
        existing = {"value": None}

    if existing.get("value") is not None:
        await cc("PUT", f"/api/v1/console/internal/settings/{CERTIFICATE_BADGE_KEY}/", json_body={"value": badge_text.strip()})
    else:
        await cc("POST", f"/api/v1/console/internal/settings/{CERTIFICATE_BADGE_KEY}/", json_body={"value": badge_text.strip()})

    return {"badge_text": badge_text.strip()}
