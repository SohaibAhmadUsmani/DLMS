import logging
from datetime import datetime, timezone
from collections import defaultdict
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import NotFoundError, BadRequestError
from fastapi_service.core.security import require_role, get_current_user
from shared.internal_client import call_console

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

COLLECTION_USERS = "users"
COLLECTION_COURSES = "courses"
COLLECTION_ENROLLMENTS = "enrollments"
COLLECTION_TRANSACTIONS = "transactions"


def _safe_str_id(doc) -> str:
    oid = doc.get("_id")
    return str(oid) if oid else ""


# ── Teacher Dashboard ──


@router.get("/dashboard/teacher/overview")
async def teacher_overview(
    year: int = Query(default=None),
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = payload["sub"]
    now = datetime.now(timezone.utc)
    target_year = year or now.year

    courses_cursor = db[COLLECTION_COURSES].find({"teacher_id": teacher_id})
    teacher_courses = await courses_cursor.to_list(None)
    course_ids = [_safe_str_id(c) for c in teacher_courses]

    total_courses = len(teacher_courses)
    active_courses = len([c for c in teacher_courses if c.get("is_published")])

    enrolled_student_ids = set()
    course_id_to_enroll_count = defaultdict(int)
    if course_ids:
        enroll_cursor = db[COLLECTION_ENROLLMENTS].find(
            {"course_id": {"$in": course_ids}, "status": "active"}
        )
        async for doc in enroll_cursor:
            enrolled_student_ids.add(doc.get("student_id"))
            course_id_to_enroll_count[doc["course_id"]] += 1

    total_students = len(enrolled_student_ids)
    total_enrollments = sum(course_id_to_enroll_count.values())

    active_ids = [str(c["_id"]) for c in teacher_courses if c.get("is_published")]
    completed_courses_count = 0
    seen_for_completion = set()
    for cid in course_ids:
        if course_id_to_enroll_count.get(cid, 0) > 0:
            # Course has enrollments — check if any student completed it
            completed_count = await db[COLLECTION_ENROLLMENTS].count_documents(
                {"course_id": cid, "progress": 100}
            )
            if completed_count > 0:
                completed_courses_count += 1

    pipeline = [
        {"$match": {"teacher_id": teacher_id, "status": "Completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$teacher_earning"}}},
    ]
    earnings_result = await db[COLLECTION_TRANSACTIONS].aggregate(pipeline).to_list(1)
    total_earnings = round(earnings_result[0]["total"], 2) if earnings_result else 0.0

    start_of_year = datetime(target_year, 1, 1, tzinfo=timezone.utc)
    start_of_next = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
    month_pipeline = [
        {
            "$match": {
                "teacher_id": teacher_id,
                "status": "Completed",
                "created_at": {"$gte": start_of_year, "$lt": start_of_next},
            }
        },
        {
            "$group": {
                "_id": {"$month": "$created_at"},
                "amount": {"$sum": "$teacher_earning"},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    month_results = await db[COLLECTION_TRANSACTIONS].aggregate(month_pipeline).to_list(12)
    month_map = {r["_id"]: round(r["amount"], 2) for r in month_results}
    earnings_by_month = [month_map.get(m, 0.0) for m in range(1, 13)]

    recent_courses_raw = sorted(
        teacher_courses,
        key=lambda c: c.get("created_at") or datetime.min,
        reverse=True,
    )[:5]

    recent_courses = []
    for c in recent_courses_raw:
        cid = _safe_str_id(c)
        enrolled_count = course_id_to_enroll_count.get(cid, 0)
        status = "Published" if c.get("is_published") else "Draft"
        recent_courses.append({
            "id": cid,
            "title": c.get("title", "Untitled"),
            "cover_image": c.get("cover_image") or "",
            "enrolled": enrolled_count,
            "status": status,
        })

    return {
        "total_courses": total_courses,
        "active_courses": active_courses,
        "total_enrollments": total_enrollments,
        "completed_courses": completed_courses_count,
        "total_students": total_students,
        "total_earnings": total_earnings,
        "earnings_by_month": earnings_by_month,
        "year": target_year,
        "recent_courses": recent_courses,
    }


# ── Admin Dashboard ──


@router.get("/dashboard/admin/overview")
async def admin_overview(
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    now = datetime.now(timezone.utc)

    # User counts
    total_users = await db[COLLECTION_USERS].count_documents({})
    total_admins = await db[COLLECTION_USERS].count_documents({"role": "admin"})
    total_teachers = await db[COLLECTION_USERS].count_documents({"role": "teacher"})
    total_students = await db[COLLECTION_USERS].count_documents({"role": "student"})

    # Course counts
    all_courses = await db[COLLECTION_COURSES].find({}).sort("created_at", -1).to_list(None)
    total_courses = len(all_courses)
    pending_courses = [
        {
            "id": _safe_str_id(c),
            "title": c.get("title", "Untitled"),
            "cover_image": c.get("cover_image") or "",
            "teacher_id": c.get("teacher_id", ""),
            "created_at": c["created_at"].isoformat() if hasattr(c.get("created_at"), "isoformat") else str(c.get("created_at", "")),
            "is_published": c.get("is_published", False),
        }
        for c in all_courses if not c.get("is_published")
    ]

    # Revenue stats
    revenue_pipeline = [
        {"$match": {"status": "Completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "commission": {"$sum": "$platform_fee"}, "count": {"$sum": 1}}},
    ]
    rev_result = await db[COLLECTION_TRANSACTIONS].aggregate(revenue_pipeline).to_list(1)
    total_revenue = round(rev_result[0]["total"], 2) if rev_result else 0.0
    total_commission = round(rev_result[0]["commission"], 2) if rev_result else 0.0
    total_transactions = rev_result[0]["count"] if rev_result else 0

    # Active enrollments
    active_enrollments = await db[COLLECTION_ENROLLMENTS].count_documents({"status": "active"})

    # Role distribution
    role_data = [
        {"name": "Admin", "value": total_admins, "color": "#4F46E5"},
        {"name": "Teacher", "value": total_teachers, "color": "#F59E0B"},
        {"name": "Student", "value": total_students, "color": "#14B8A6"},
    ]

    # Revenue by quarter
    current_year = now.year
    quarters_data = []
    for y in range(current_year - 2, current_year + 1):
        for q in range(1, 5):
            q_start_month = (q - 1) * 3 + 1
            q_start = datetime(y, q_start_month, 1, tzinfo=timezone.utc)
            if q == 4:
                q_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
            else:
                q_end = datetime(y, q_start_month + 3, 1, tzinfo=timezone.utc)
            if q_start > now:
                continue
            q_pipeline = [
                {"$match": {"status": "Completed", "created_at": {"$gte": q_start, "$lt": q_end}}},
                {"$group": {"_id": None, "revenue": {"$sum": "$amount"}, "commission": {"$sum": "$platform_fee"}}},
            ]
            q_result = await db[COLLECTION_TRANSACTIONS].aggregate(q_pipeline).to_list(1)
            rev = round(q_result[0]["revenue"], 2) if q_result else 0.0
            comm = round(q_result[0]["commission"], 2) if q_result else 0.0
            quarters_data.append({
                "quarter": f"Q{q} {y}",
                "Revenue": rev,
                "Commission": comm,
            })

    # Get teacher names for pending courses
    teacher_ids = {c["teacher_id"] for c in pending_courses if c.get("teacher_id")}
    teacher_map = {}
    for tid in teacher_ids:
        t = await db[COLLECTION_USERS].find_one({"_id": ObjectId(tid) if ObjectId.is_valid(tid) else tid})
        if t:
            teacher_map[tid] = t.get("name", "Unknown")

    for c in pending_courses:
        c["teacher_name"] = teacher_map.get(c.get("teacher_id", ""), "Unknown")
    # Sort pending by created_at descending
    pending_courses.sort(key=lambda c: c.get("created_at", ""), reverse=True)

    # Recent activity — combine enrollments, transactions, and new courses
    recent_activity = []

    # Recent enrollments
    enroll_cursor = db[COLLECTION_ENROLLMENTS].find({}).sort("enrolled_at", -1).limit(5)
    async for doc in enroll_cursor:
        student = await db[COLLECTION_USERS].find_one({"_id": ObjectId(doc["student_id"])})
        sname = student.get("name", "A student") if student else "A student"
        course = await db[COLLECTION_COURSES].find_one({"_id": ObjectId(doc["course_id"]) if ObjectId.is_valid(doc["course_id"]) else doc["course_id"]})
        ctitle = course.get("title", "a course") if course else "a course"
        recent_activity.append({
            "type": "enrollment",
            "text": f"{sname} enrolled in \"{ctitle}\"",
            "date": doc["enrolled_at"].isoformat() if hasattr(doc.get("enrolled_at"), "isoformat") else str(doc.get("enrolled_at", "")),
        })

    # Recent transactions
    txn_cursor = db[COLLECTION_TRANSACTIONS].find({"status": "Completed"}).sort("created_at", -1).limit(5)
    async for doc in txn_cursor:
        student = await db[COLLECTION_USERS].find_one({"_id": ObjectId(doc["student_id"])})
        sname = student.get("name", "A student") if student else "A student"
        course = await db[COLLECTION_COURSES].find_one({"_id": ObjectId(doc["course_id"]) if ObjectId.is_valid(doc["course_id"]) else doc["course_id"]})
        ctitle = course.get("title", "a course") if course else "a course"
        recent_activity.append({
            "type": "transaction",
            "text": f"${doc.get('amount', 0):.2f} payment from {sname} for \"{ctitle}\"",
            "date": doc["created_at"].isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at", "")),
        })

    # Recent courses created
    for c in all_courses[:5]:
        teacher = await db[COLLECTION_USERS].find_one({"_id": ObjectId(c["teacher_id"]) if ObjectId.is_valid(c.get("teacher_id", "")) else c.get("teacher_id", "")})
        tname = teacher.get("name", "A teacher") if teacher else "A teacher"
        recent_activity.append({
            "type": "course_created",
            "text": f"\"{c.get('title', 'New course')}\" created by {tname}",
            "date": c["created_at"].isoformat() if hasattr(c.get("created_at"), "isoformat") else str(c.get("created_at", "")),
        })

    recent_activity.sort(key=lambda a: a.get("date", ""), reverse=True)
    recent_activity = recent_activity[:10]

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_teachers": total_teachers,
        "total_students": total_students,
        "total_courses": total_courses,
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_transactions": total_transactions,
        "active_enrollments": active_enrollments,
        "role_data": role_data,
        "revenue_by_quarter": quarters_data,
        "pending_courses": pending_courses,
        "recent_activity": recent_activity,
    }


@router.post("/dashboard/admin/approve-course")
async def approve_course(
    body: dict,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    course_id = body.get("course_id")
    action = body.get("action", "approve")
    if not course_id:
        raise BadRequestError("course_id is required")
    if action not in ("approve", "reject"):
        raise BadRequestError("action must be 'approve' or 'reject'")

    course = await db[COLLECTION_COURSES].find_one({"_id": ObjectId(course_id)})
    if not course:
        raise NotFoundError("Course not found")

    is_published = action == "approve"
    await db[COLLECTION_COURSES].update_one(
        {"_id": ObjectId(course_id)},
        {"$set": {"is_published": is_published}}
    )

    return {
        "id": course_id,
        "is_published": is_published,
        "status": "Published" if is_published else "Draft",
    }
