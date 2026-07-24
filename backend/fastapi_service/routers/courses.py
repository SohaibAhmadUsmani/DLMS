from bson import ObjectId
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import NotFoundError
from fastapi_service.core.security import get_current_user, require_role

router = APIRouter(tags=["courses"])


@router.get("/courses/enriched")
async def get_enriched_courses(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    role = payload.get("role")
    user_id = payload["sub"]

    query = {}
    if role == "teacher":
        query["teacher_id"] = user_id
    elif role == "student":
        query["is_published"] = True

    courses = await db["courses"].find(query).sort("created_at", -1).to_list(length=None)
    if not courses:
        return {"courses": []}

    teacher_ids = set()
    for c in courses:
        tid = c.get("teacher_id")
        if tid:
            teacher_ids.add(tid)

    teacher_map = {}
    for tid in teacher_ids:
        try:
            tuser = await db["users"].find_one({"_id": ObjectId(tid)})
        except Exception:
            continue
        if tuser:
            teacher_map[tid] = tuser.get("name", "Unknown")

    result = []
    for c in courses:
        sections_count = await db["sections"].count_documents({"course_id": str(c["_id"])})
        result.append({
            "id": str(c["_id"]),
            "title": c.get("title", ""),
            "description": c.get("description", ""),
            "teacher_id": c.get("teacher_id"),
            "teacher_name": teacher_map.get(c.get("teacher_id"), "Unknown"),
            "credit_hours": c.get("credit_hours", 3),
            "is_published": c.get("is_published", False),
            "cover_image": c.get("cover_image", ""),
            "what_you_will_learn": c.get("what_you_will_learn", []),
            "requirements": c.get("requirements", []),
            "total_duration": c.get("total_duration", "0"),
            "difficulty_level": c.get("difficulty_level", "beginner"),
            "sections_count": sections_count,
            "created_at": c.get("created_at"),
            "price": c.get("price", 0),
        })

    return {"courses": result}


@router.get("/courses/{course_id}/detail")
async def get_course_detail(
    course_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        course = await db["courses"].find_one({"_id": ObjectId(course_id)})
    except Exception:
        raise NotFoundError("Course not found")

    if not course:
        raise NotFoundError("Course not found")

    teacher = None
    try:
        tuser = await db["users"].find_one({"_id": ObjectId(course.get("teacher_id", ""))})
        if tuser:
            teacher = {
                "id": str(tuser["_id"]),
                "name": tuser.get("name", "Unknown"),
                "email": tuser.get("email", ""),
                "profile_picture_url": tuser.get("profile_picture_url", ""),
                "bio": tuser.get("bio", ""),
            }
    except Exception:
        pass

    sections = await db["sections"].find({"course_id": course_id}).sort("order", 1).to_list(length=None)

    section_ids = [str(s["_id"]) for s in sections]
    materials_map = {}
    if section_ids:
        mat_cursor = db["materials"].find({"section_id": {"$in": section_ids}})
        async for m in mat_cursor:
            sid = m.get("section_id")
            if sid not in materials_map:
                materials_map[sid] = []
            materials_map[sid].append({
                "id": str(m["_id"]),
                "title": m.get("title", m.get("filename", "Material")),
                "file_url": m.get("file_url", ""),
                "file_type": m.get("file_type", ""),
                "content": m.get("content", ""),
            })

    sections_with_materials = []
    for s in sections:
        sid = str(s["_id"])
        sections_with_materials.append({
            "id": sid,
            "title": s.get("title", ""),
            "order": s.get("order", 0),
            "materials": materials_map.get(sid, []),
        })

    enroll_count = await db["enrollments"].count_documents({"course_id": course_id, "status": "active"})

    reviews_cursor = db["reviews"].find({"course_id": course_id})
    review_count = 0
    total_rating = 0
    async for r in reviews_cursor:
        review_count += 1
        total_rating += r.get("rating", 0)
    avg_rating = round(total_rating / review_count, 1) if review_count > 0 else 0

    is_enrolled = False
    enrollment_id = None
    progress = 0
    enrollment = await db["enrollments"].find_one(
        {"student_id": payload["sub"], "course_id": course_id, "status": "active"}
    )
    if enrollment:
        is_enrolled = True
        enrollment_id = str(enrollment["_id"])
        progress = enrollment.get("progress", 0)

    return {
        "id": str(course["_id"]),
        "title": course.get("title", ""),
        "description": course.get("description", ""),
        "teacher_id": course.get("teacher_id"),
        "credit_hours": course.get("credit_hours", 3),
        "is_published": course.get("is_published", False),
        "cover_image": course.get("cover_image", ""),
        "what_you_will_learn": course.get("what_you_will_learn", []),
        "requirements": course.get("requirements", []),
        "total_duration": course.get("total_duration", "0"),
        "difficulty_level": course.get("difficulty_level", "beginner"),
        "created_at": course.get("created_at"),
        "teacher": teacher,
        "sections": sections_with_materials,
        "students_count": enroll_count,
        "reviews_count": review_count,
        "average_rating": avg_rating,
        "is_enrolled": is_enrolled,
        "enrollment_id": enrollment_id,
        "progress": progress,
        "price": course.get("price", 0),
    }


@router.get("/enrollments/students/{course_id}")
async def get_course_students(
    course_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    role = payload.get("role")
    if role == "teacher":
        course = await db["courses"].find_one({"_id": ObjectId(course_id)})
        if not course:
            raise NotFoundError("Course not found")
        if course.get("teacher_id") != payload["sub"] and role != "admin":
            from fastapi_service.core.exceptions import ForbiddenError
            raise ForbiddenError("Forbidden")

    cursor = db["enrollments"].find({"course_id": course_id, "status": "active"})
    student_ids = []
    async for e in cursor:
        student_ids.append(e["student_id"])

    students = []
    for sid in student_ids:
        try:
            suser = await db["users"].find_one({"_id": ObjectId(sid)})
        except Exception:
            continue
        if suser:
            students.append({
                "id": str(suser["_id"]),
                "name": suser.get("name", "Unknown"),
                "email": suser.get("email", ""),
            })

    return {"students": students}
