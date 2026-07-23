import os
import re as _re
import shutil
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import InternalCallError, call_console

router = APIRouter(tags=["materials"])

COLLECTION = "materials"
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "materials")


def _as_oid(s: str) -> ObjectId | None:
    return ObjectId(s) if _re.match(r"^[0-9a-f]{24}$", s, _re.I) else None


async def _get_section_course_id(section_id: str) -> str:
    try:
        section = await call_console("GET", f"/api/v1/console/internal/sections/{section_id}/")
    except InternalCallError:
        raise
    if not section.get("exists"):
        raise NotFoundError("Section not found")
    return section["course_id"]


async def _verify_teacher_owns_course(teacher_id: str, course_id: str):
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise
    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if course.get("teacher_id") != teacher_id:
        raise ForbiddenError("Forbidden")


async def _check_access(section_id: str, payload: dict, db: AsyncIOMotorDatabase):
    role = payload.get("role")
    if role == "admin":
        return
    course_id = await _get_section_course_id(section_id)
    user_id = payload["sub"]
    if role == "teacher":
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
        except InternalCallError:
            raise
        if course.get("teacher_id") == user_id:
            return
    enrollment = await db["enrollments"].find_one(
        {"student_id": user_id, "course_id": course_id, "status": "active"}
    )
    if enrollment:
        return
    raise ForbiddenError("Forbidden")


@router.post("/sections/{section_id}/materials", status_code=201)
async def upload_material(
    section_id: str,
    title: str = Form(""),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    course_id = await _get_section_course_id(section_id)
    if payload.get("role") != "admin":
        await _verify_teacher_owns_course(payload["sub"], course_id)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "file")[1]
    saved_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{payload['sub']}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)
    try:
        with open(saved_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except OSError:
        raise BadRequestError("File save failed")

    doc = {
        "section_id": section_id,
        "title": title,
        "file_url": f"/uploads/materials/{saved_name}",
        "file_type": file_type,
        "content": "",
        "uploaded_by": payload["sub"],
        "uploaded_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {k: v for k, v in doc.items() if k != "_id"} | {"id": str(result.inserted_id)}


@router.get("/sections/{section_id}/materials")
async def list_materials(
    section_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict]:
    await _check_access(section_id, payload, db)
    cursor = db[COLLECTION].find({"section_id": section_id}).sort("uploaded_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "section_id": doc["section_id"],
            "title": doc["title"],
            "file_url": doc.get("file_url", ""),
            "file_type": doc["file_type"],
            "content": doc.get("content", ""),
            "uploaded_by": doc["uploaded_by"],
            "uploaded_at": doc["uploaded_at"].isoformat() if hasattr(doc["uploaded_at"], "isoformat") else str(doc["uploaded_at"]),
        })
    return results


@router.post("/courses/{course_id}/materials", status_code=201)
async def upload_course_material(
    course_id: str,
    title: str = Form(""),
    file_type: str = Form("other"),
    file: UploadFile = File(None),
    youtube_url: str = Form(None),
    content: str = Form(None),
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    if payload.get("role") != "admin":
        await _verify_teacher_owns_course(payload["sub"], course_id)

    existing = await db["sections"].find_one({"course_id": course_id})
    if existing:
        section_id = str(existing["_id"])
    else:
        result = await db["sections"].insert_one({
            "course_id": course_id,
            "title": "Course Content",
            "order": 1,
        })
        section_id = str(result.inserted_id)

    file_url = ""
    if file_type == "youtube" and youtube_url:
        file_url = youtube_url
    elif file:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename or "file")[1]
        saved_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}_{payload['sub']}{ext}"
        saved_path = os.path.join(UPLOAD_DIR, saved_name)
        try:
            with open(saved_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except OSError:
            raise BadRequestError("File save failed")
        file_url = f"/uploads/materials/{saved_name}"

    doc = {
        "section_id": section_id,
        "title": title or "Untitled",
        "file_url": file_url,
        "file_type": file_type,
        "content": content or "",
        "uploaded_by": payload["sub"],
        "uploaded_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {k: v for k, v in doc.items() if k != "_id"} | {"id": str(result.inserted_id)}


@router.get("/courses/{course_id}/materials")
async def list_course_materials(
    course_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[dict]:
    section_cursor = db["sections"].find({"course_id": course_id})
    section_ids = []
    async for s in section_cursor:
        section_ids.append(str(s["_id"]))
    if not section_ids:
        return []

    cursor = db[COLLECTION].find({"section_id": {"$in": section_ids}}).sort("uploaded_at", -1)
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "section_id": doc.get("section_id", ""),
            "title": doc.get("title", ""),
            "file_url": doc.get("file_url", ""),
            "file_type": doc.get("file_type", ""),
            "content": doc.get("content", ""),
            "uploaded_by": doc.get("uploaded_by", ""),
            "uploaded_at": doc["uploaded_at"].isoformat() if hasattr(doc["uploaded_at"], "isoformat") else str(doc["uploaded_at"]),
        })
    return results


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    oid = _as_oid(material_id)
    if oid is None:
        raise NotFoundError("Material not found")
    doc = await db[COLLECTION].find_one({"_id": oid})
    if not doc:
        raise NotFoundError("Material not found")
    course_id = await _get_section_course_id(doc["section_id"])
    if payload.get("role") == "admin":
        pass
    elif payload.get("role") == "teacher":
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
        except InternalCallError:
            raise
        if course.get("teacher_id") != payload["sub"]:
            raise ForbiddenError("Forbidden")
    else:
        raise ForbiddenError("Forbidden")

    file_path = os.path.join(UPLOAD_DIR, os.path.basename(doc["file_url"]))
    if os.path.exists(file_path):
        os.remove(file_path)
    await db[COLLECTION].delete_one({"_id": oid})
    return {"deleted": True}
