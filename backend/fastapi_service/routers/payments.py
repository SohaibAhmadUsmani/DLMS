import logging
import os
import random
from datetime import datetime, timezone

import stripe
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ConflictError, NotFoundError
from fastapi_service.core.security import get_current_user, require_role
from shared.internal_client import InternalCallError, call_console

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

COLLECTION_ENROLLMENTS = "enrollments"
COLLECTION_TRANSACTIONS = "transactions"
COLLECTION_PAYOUTS = "payouts"
COLLECTION_USERS = "users"

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
COMMISSION_PERCENT = float(os.getenv("STRIPE_COMMISSION_PERCENT", "10"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _get_commission(amount: float) -> tuple[float, float]:
    platform_fee = round(amount * COMMISSION_PERCENT / 100, 2)
    teacher_earning = round(amount - platform_fee, 2)
    return platform_fee, teacher_earning


def _generate_order_id() -> str:
    rand = random.randint(1000, 9999)
    return f"ORD-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{rand}"


# ─── Create Checkout Session ──────────────────────────────


@router.post("/payments/create-checkout-session")
async def create_checkout_session(
    request: Request,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    body = await request.json()
    course_id = body.get("courseId") or body.get("course_id")
    if not course_id:
        raise BadRequestError("courseId is required")

    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise
    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if not course.get("is_published"):
        raise BadRequestError("Course is not published")

    price = course.get("price", 0)
    if not price or price <= 0:
        raise BadRequestError("This course is free. Use the regular enrollment endpoint.")

    existing = await db[COLLECTION_ENROLLMENTS].find_one(
        {"student_id": payload["sub"], "course_id": course_id, "status": "active"}
    )
    if existing:
        raise ConflictError("Already enrolled")

    teacher_id = course.get("teacher_id")
    teacher = await db[COLLECTION_USERS].find_one({"_id": ObjectId(teacher_id)})
    if not teacher:
        raise NotFoundError("Teacher not found")

    stripe_account_id = teacher.get("stripe_account_id")
    if not stripe_account_id:
        raise BadRequestError("This course isn't available for purchase right now. The instructor hasn't completed payment setup.")

    try:
        stripe_account = stripe.Account.retrieve(stripe_account_id)
        charges_enabled = getattr(stripe_account, "charges_enabled", False)
        details_submitted = getattr(stripe_account, "details_submitted", False)
        await db[COLLECTION_USERS].update_one(
            {"_id": ObjectId(teacher_id)},
            {"$set": {"stripe_charges_enabled": charges_enabled, "stripe_onboarding_complete": details_submitted}},
        )
    except stripe.error.StripeError:
        raise BadRequestError("Could not verify instructor's payment setup. Please try again later.")

    if not charges_enabled:
        raise BadRequestError("This course isn't available for purchase right now. The instructor hasn't completed payment setup.")

    amount_cents = int(price * 100)
    platform_fee_cents = int(round(amount_cents * COMMISSION_PERCENT / 100))
    if platform_fee_cents >= amount_cents:
        platform_fee_cents = amount_cents - 1

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {"name": course.get("title", "Course")},
                },
                "quantity": 1,
            }],
            client_reference_id=payload["sub"],
            payment_intent_data={
                "application_fee_amount": platform_fee_cents,
                "transfer_data": {"destination": stripe_account_id},
            },
            metadata={
                "studentId": payload["sub"],
                "courseId": course_id,
                "teacherId": teacher_id,
            },
            success_url=f"{FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/payment/cancel",
        )
    except stripe.error.StripeError as e:
        logger.error("Stripe error creating checkout session: %s", e)
        raise BadRequestError(f"Payment service error: {str(e)}")

    return {"success": True, "sessionId": session.id, "url": session.url}


# ─── Stripe Webhook ───────────────────────────────────────


@router.post("/payments/webhook")
async def stripe_webhook(request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        return JSONResponse(status_code=400, content={"error": "Missing stripe-signature header"})

    try:
        event = stripe.webhooks.construct_event(body, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError as e:
        logger.error("Webhook signature verification failed: %s", e)
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})
    except ValueError as e:
        logger.error("Webhook error: %s", e)
        return JSONResponse(status_code=400, content={"error": str(e)})

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await _handle_checkout_completed(session, db)
    elif event["type"] == "charge.refunded":
        payment_intent = getattr(event["data"]["object"], "payment_intent", None)
        if payment_intent:
            await db[COLLECTION_TRANSACTIONS].update_one(
                {"stripe_payment_intent": payment_intent},
                {"$set": {"status": "Refunded"}},
            )

    return {"received": True}


async def _handle_checkout_completed(session, db: AsyncIOMotorDatabase):
    session_id = getattr(session, "id", None)
    if not session_id:
        return

    existing = await db[COLLECTION_TRANSACTIONS].find_one({"stripe_session_id": session_id})
    if existing:
        logger.info("Duplicate webhook for session %s, skipping", session_id)
        return

    metadata = getattr(session, "metadata", None)
    student_id = getattr(metadata, "studentId", None) if metadata else None
    course_id = getattr(metadata, "courseId", None) if metadata else None
    teacher_id = getattr(metadata, "teacherId", None) if metadata else None

    if not all([student_id, course_id, teacher_id]):
        logger.error("Missing metadata in session %s", session_id)
        return

    amount_total = getattr(session, "amount_total", 0)
    amount_dollars = amount_total / 100.0
    payment_intent = getattr(session, "payment_intent", None)

    enrollment_id = None
    try:
        platform_fee, teacher_earning = _get_commission(amount_dollars)
        order_id = _generate_order_id()

        enrollment = {
            "student_id": student_id,
            "course_id": course_id,
            "enrolled_at": datetime.now(timezone.utc),
            "status": "active",
            "progress": 0,
            "payment_status": "Paid",
            "payment_method": "Stripe",
            "stripe_session_id": session_id,
            "stripe_payment_intent": payment_intent,
        }
        result = await db[COLLECTION_ENROLLMENTS].insert_one(enrollment)
        enrollment_id = str(result.inserted_id)

        transaction = {
            "order_id": order_id,
            "student_id": student_id,
            "course_id": course_id,
            "teacher_id": teacher_id,
            "amount": amount_dollars,
            "platform_fee": platform_fee,
            "teacher_earning": teacher_earning,
            "payment_method": "Stripe",
            "status": "Completed",
            "stripe_session_id": session_id,
            "stripe_payment_intent": payment_intent,
            "payout_id": None,
            "payout_status": "Pending",
            "created_at": datetime.now(timezone.utc),
        }
        await db[COLLECTION_TRANSACTIONS].insert_one(transaction)

        try:
            course_data = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
            current_count = course_data.get("students_enrolled", 0) if course_data.get("exists") else 0
            await call_console(
                "PATCH",
                f"/api/v1/console/internal/courses/{course_id}/",
                json={"students_enrolled": current_count + 1},
            )
        except InternalCallError as e:
            logger.error("Failed to update course enrollment count: %s", e)
            if enrollment_id:
                await db[COLLECTION_ENROLLMENTS].delete_one({"_id": ObjectId(enrollment_id)})
            raise

    except Exception as e:
        logger.error("Failed to process checkout completed: %s", e)
        if enrollment_id:
            try:
                await db[COLLECTION_ENROLLMENTS].delete_one({"_id": ObjectId(enrollment_id)})
            except Exception:
                pass
        raise


# ─── Verify Payment ────────────────────────────────────────


@router.get("/payments/verify/{session_id}")
async def verify_payment(
    session_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        raise BadRequestError(f"Failed to retrieve session: {str(e)}")

    payment_status = getattr(session, "payment_status", None)

    if payment_status == "paid":
        existing = await db[COLLECTION_TRANSACTIONS].find_one({"stripe_session_id": session_id})
        if not existing:
            await _handle_checkout_completed(session, db)

    cd = getattr(session, "customer_details", None)
    return {
        "sessionId": session.id,
        "paymentStatus": payment_status,
        "status": getattr(session, "status", None),
        "paymentIntent": getattr(session, "payment_intent", None),
        "amountTotal": getattr(session, "amount_total", 0),
        "currency": getattr(session, "currency", "usd"),
        "customerEmail": getattr(cd, "email", None) if cd else None,
    }


# ─── Stripe Connect Onboarding ─────────────────────────────


@router.post("/payments/connect/onboard")
async def connect_onboard(
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher = await db[COLLECTION_USERS].find_one({"_id": ObjectId(payload["sub"])})
    if not teacher:
        raise NotFoundError("Teacher not found")

    stripe_account_id = teacher.get("stripe_account_id")

    if not stripe_account_id:
        try:
            account = stripe.Account.create(type="express")
            stripe_account_id = account.id
            await db[COLLECTION_USERS].update_one(
                {"_id": ObjectId(payload["sub"])},
                {"$set": {"stripe_account_id": stripe_account_id, "stripe_charges_enabled": False, "stripe_onboarding_complete": False}},
            )
        except stripe.error.StripeError as e:
            raise BadRequestError(f"Failed to create Stripe account: {str(e)}")

    try:
        account_links = stripe.AccountLink.create(
            account=stripe_account_id,
            refresh_url=f"{FRONTEND_URL}/teacher/earnings?onboarding=refresh",
            return_url=f"{FRONTEND_URL}/teacher/earnings?onboarding=complete",
            type="account_onboarding",
        )
    except stripe.error.StripeError as e:
        raise BadRequestError(f"Failed to create onboarding link: {str(e)}")

    return {"url": account_links.url}


@router.get("/payments/connect/status")
async def connect_status(
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher = await db[COLLECTION_USERS].find_one({"_id": ObjectId(payload["sub"])})
    if not teacher:
        raise NotFoundError("Teacher not found")

    stripe_account_id = teacher.get("stripe_account_id")
    if not stripe_account_id:
        return {
            "onboarded": False,
            "charges_enabled": False,
            "details_submitted": False,
        }

    try:
        account = stripe.Account.retrieve(stripe_account_id)
        charges_enabled = getattr(account, "charges_enabled", False)
        details_submitted = getattr(account, "details_submitted", False)
        await db[COLLECTION_USERS].update_one(
            {"_id": ObjectId(payload["sub"])},
            {"$set": {"stripe_charges_enabled": charges_enabled, "stripe_onboarding_complete": details_submitted}},
        )
        return {
            "onboarded": details_submitted,
            "charges_enabled": charges_enabled,
            "details_submitted": details_submitted,
        }
    except stripe.error.StripeError as e:
        raise BadRequestError(f"Failed to retrieve account: {str(e)}")


# ─── Teacher: Earnings Overview ────────────────────────────


@router.get("/payments/teacher/earnings")
async def teacher_earnings(
    year: int = 2026,
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = payload["sub"]

    monthly_earnings = await db[COLLECTION_TRANSACTIONS].aggregate([
        {"$match": {"teacher_id": teacher_id, "status": "Completed"}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
            "total": {"$sum": "$teacher_earning"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]).to_list(50)

    monthly_breakdown = {}
    for entry in monthly_earnings:
        y = entry["_id"]["year"]
        m = entry["_id"]["month"]
        key = f"{y}-{m:02d}"
        monthly_breakdown[key] = {
            "month": m,
            "year": y,
            "earnings": round(entry["total"], 2),
            "transactions": entry["count"],
        }

    months = []
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        months.append(monthly_breakdown.get(key, {"month": m, "year": year, "earnings": 0, "transactions": 0}))

    pipeline_dates = await db[COLLECTION_TRANSACTIONS].aggregate([
        {"$match": {"teacher_id": teacher_id, "status": "Completed"}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$teacher_earning"},
            "total_transactions": {"$sum": 1},
            "earliest": {"$min": "$created_at"},
            "latest": {"$max": "$created_at"},
        }},
    ]).to_list(1)

    totals = pipeline_dates[0] if pipeline_dates else {}
    total_revenue = round(totals.get("total_revenue", 0), 2)
    total_transactions = totals.get("total_transactions", 0)

    this_month_key = f"{year}-{datetime.now().month:02d}"
    this_month_earning = monthly_breakdown.get(this_month_key, {}).get("earnings", 0)

    courses_count = await db[COLLECTION_TRANSACTIONS].distinct("course_id", {"teacher_id": teacher_id, "status": "Completed"})

    return {
        "total_revenue": total_revenue,
        "total_transactions": total_transactions,
        "total_courses": len(courses_count),
        "this_month_earning": round(this_month_earning, 2),
        "monthly_breakdown": months,
    }


@router.get("/payments/teacher/earnings/transactions")
async def teacher_earnings_transactions(
    start_date: str = None,
    end_date: str = None,
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = payload["sub"]
    query = {"teacher_id": teacher_id, "status": "Completed"}

    if start_date and end_date:
        try:
            sd = datetime.fromisoformat(start_date)
            ed = datetime.fromisoformat(end_date)
            query["created_at"] = {"$gte": sd, "$lte": ed}
        except ValueError:
            pass

    cursor = db[COLLECTION_TRANSACTIONS].find(query).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{doc['course_id']}/")
            course_title = course.get("title", "Unknown Course") if course.get("exists") else "Unknown Course"
        except InternalCallError:
            course_title = "Unknown Course"

        student = await db[COLLECTION_USERS].find_one({"_id": ObjectId(doc["student_id"])})
        student_name = student.get("name", "Unknown") if student else "Unknown"

        items.append({
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "student_name": student_name,
            "course_title": course_title,
            "amount": doc.get("amount"),
            "platform_fee": doc.get("platform_fee"),
            "teacher_earning": doc.get("teacher_earning"),
            "status": doc.get("status"),
            "date": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        })

    total = await db[COLLECTION_TRANSACTIONS].count_documents(query)
    return {"items": items, "total": total, "page": page, "limit": limit}


# ─── Teacher: Payouts ──────────────────────────────────────


@router.get("/payments/teacher/payouts")
async def teacher_payouts(
    status_filter: str = None,
    payment_method: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = payload["sub"]
    match: dict = {"teacher_id": teacher_id}

    if status_filter and status_filter != "all":
        match["payout_status"] = status_filter
    if payment_method and payment_method != "all":
        match["payment_method"] = payment_method
    if search:
        match["order_id"] = {"$regex": search, "$options": "i"}

    all_statuses = ["Paid", "Pending", "Failed"]
    paid_count = await db[COLLECTION_TRANSACTIONS].count_documents({"teacher_id": teacher_id, "payout_status": "Paid"})
    pending_count = await db[COLLECTION_TRANSACTIONS].count_documents({"teacher_id": teacher_id, "payout_status": "Pending"})
    failed_count = await db[COLLECTION_TRANSACTIONS].count_documents({"teacher_id": teacher_id, "payout_status": "Failed"})

    pipeline = await db[COLLECTION_TRANSACTIONS].aggregate([
        {"$match": {"teacher_id": teacher_id, "status": "Completed"}},
        {"$group": {
            "_id": None,
            "total_earned": {"$sum": "$teacher_earning"},
            "paid_out": {"$sum": {"$cond": [{"$eq": ["$payout_status", "Paid"]}, "$teacher_earning", 0]}},
            "pending_payout": {"$sum": {"$cond": [{"$eq": ["$payout_status", "Pending"]}, "$teacher_earning", 0]}},
        }},
    ]).to_list(1)
    summary = pipeline[0] if pipeline else {"total_earned": 0, "paid_out": 0, "pending_payout": 0}

    cursor = db[COLLECTION_TRANSACTIONS].find(match).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        items.append({
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "amount": doc.get("teacher_earning"),
            "payment_method": doc.get("payment_method"),
            "status": doc.get("payout_status"),
            "date": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        })

    total = await db[COLLECTION_TRANSACTIONS].count_documents(match)
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "summary": {
            "total_earned": round(summary.get("total_earned", 0), 2),
            "paid_out": round(summary.get("paid_out", 0), 2),
            "pending_payout": round(summary.get("pending_payout", 0), 2),
            "paid_count": paid_count,
            "pending_count": pending_count,
            "failed_count": failed_count,
        },
    }


# ─── Teacher: Statements ────────────────────────────────────


@router.get("/payments/teacher/statements")
async def teacher_statements(
    status_filter: str = None,
    payment_method: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    teacher_id = payload["sub"]
    match: dict = {"teacher_id": teacher_id}

    if status_filter and status_filter != "all":
        match["status"] = status_filter
    else:
        match["status"] = "Completed"
    if payment_method and payment_method != "all":
        match["payment_method"] = payment_method
    if search:
        match["order_id"] = {"$regex": search, "$options": "i"}

    cursor = db[COLLECTION_TRANSACTIONS].find(match).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{doc['course_id']}/")
            course_title = course.get("title", "Unknown Course") if course.get("exists") else "Unknown Course"
        except InternalCallError:
            course_title = "Unknown Course"

        items.append({
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "course_title": course_title,
            "amount": doc.get("amount"),
            "teacher_earning": doc.get("teacher_earning"),
            "payment_method": doc.get("payment_method"),
            "status": doc.get("status"),
            "date": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        })

    total = await db[COLLECTION_TRANSACTIONS].count_documents(match)
    return {"items": items, "total": total, "page": page, "limit": limit}


# ─── Student: Order History ──────────────────────────────────


@router.get("/payments/student/orders")
async def student_orders(
    status_filter: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    student_id = payload["sub"]
    match: dict = {"student_id": student_id}

    if status_filter and status_filter != "all":
        match["status"] = status_filter
    if search:
        match["order_id"] = {"$regex": search, "$options": "i"}

    cursor = db[COLLECTION_TRANSACTIONS].find(match).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{doc['course_id']}/")
            course_title = course.get("title", "Unknown Course") if course.get("exists") else "Unknown Course"
        except InternalCallError:
            course_title = "Unknown Course"

        items.append({
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "course_title": course_title,
            "amount": doc.get("amount"),
            "status": doc.get("status"),
            "payment_method": doc.get("payment_method"),
            "date": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        })

    total = await db[COLLECTION_TRANSACTIONS].count_documents(match)
    return {"items": items, "total": total, "page": page, "limit": limit}


# ─── Admin: Platform Financial Overview ──────────────────────


@router.get("/payments/admin/overview")
async def admin_overview(
    year: int = 2026,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    pipeline_totals = await db[COLLECTION_TRANSACTIONS].aggregate([
        {"$match": {"status": "Completed"}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$amount"},
            "total_commission": {"$sum": "$platform_fee"},
            "total_paid_to_teachers": {"$sum": "$teacher_earning"},
            "total_transactions": {"$sum": 1},
        }},
    ]).to_list(1)
    totals = pipeline_totals[0] if pipeline_totals else {}
    total_revenue = round(totals.get("total_revenue", 0), 2)
    total_commission = round(totals.get("total_commission", 0), 2)
    total_paid_to_teachers = round(totals.get("total_paid_to_teachers", 0), 2)
    total_transactions = totals.get("total_transactions", 0)

    total_enrollments = await db[COLLECTION_ENROLLMENTS].count_documents({})
    paid_enrollments = await db[COLLECTION_ENROLLMENTS].count_documents({"payment_status": "Paid"})

    teacher_count = await db[COLLECTION_USERS].count_documents({"role": "teacher", "is_active": True})
    teachers_with_connect = await db[COLLECTION_USERS].count_documents({"role": "teacher", "stripe_account_id": {"$exists": True, "$ne": None}})

    monthly_earnings = await db[COLLECTION_TRANSACTIONS].aggregate([
        {"$match": {"status": "Completed"}},
        {"$group": {
            "_id": {"year": {"$year": "$created_at"}, "month": {"$month": "$created_at"}},
            "revenue": {"$sum": "$amount"},
            "commission": {"$sum": "$platform_fee"},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
    ]).to_list(50)

    monthly_breakdown = {}
    for entry in monthly_earnings:
        y = entry["_id"]["year"]
        m = entry["_id"]["month"]
        key = f"{y}-{m:02d}"
        monthly_breakdown[key] = {
            "month": m,
            "year": y,
            "revenue": round(entry["revenue"], 2),
            "commission": round(entry["commission"], 2),
        }

    months = []
    for m in range(1, 13):
        key = f"{year}-{m:02d}"
        months.append(monthly_breakdown.get(key, {"month": m, "year": year, "revenue": 0, "commission": 0}))

    return {
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_paid_to_teachers": total_paid_to_teachers,
        "total_transactions": total_transactions,
        "total_enrollments": total_enrollments,
        "paid_enrollments": paid_enrollments,
        "total_teachers": teacher_count,
        "teachers_with_connect": teachers_with_connect,
        "monthly_breakdown": months,
    }


@router.get("/payments/admin/transactions")
async def admin_transactions(
    status_filter: str = None,
    payment_method: str = None,
    teacher_id: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 20,
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    match: dict = {}

    if status_filter and status_filter != "all":
        match["status"] = status_filter
    if payment_method and payment_method != "all":
        match["payment_method"] = payment_method
    if teacher_id:
        match["teacher_id"] = teacher_id
    if search:
        match["order_id"] = {"$regex": search, "$options": "i"}

    cursor = db[COLLECTION_TRANSACTIONS].find(match).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = []
    async for doc in cursor:
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{doc['course_id']}/")
            course_title = course.get("title", "Unknown Course") if course.get("exists") else "Unknown Course"
        except InternalCallError:
            course_title = "Unknown Course"

        student = await db[COLLECTION_USERS].find_one({"_id": ObjectId(doc["student_id"])})
        student_name = student.get("name", "Unknown") if student else "Unknown"

        teacher = await db[COLLECTION_USERS].find_one({"_id": ObjectId(doc["teacher_id"])})
        teacher_name = teacher.get("name", "Unknown") if teacher else "Unknown"

        items.append({
            "id": str(doc["_id"]),
            "order_id": doc.get("order_id"),
            "student_name": student_name,
            "teacher_name": teacher_name,
            "course_title": course_title,
            "amount": doc.get("amount"),
            "platform_fee": doc.get("platform_fee"),
            "teacher_earning": doc.get("teacher_earning"),
            "payment_method": doc.get("payment_method"),
            "status": doc.get("status"),
            "date": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at")),
        })

    total = await db[COLLECTION_TRANSACTIONS].count_documents(match)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/payments/admin/teachers-connect")
async def admin_teachers_connect(
    payload: dict = Depends(require_role("admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    cursor = db[COLLECTION_USERS].find(
        {"role": "teacher", "is_active": True},
        {"name": 1, "email": 1, "stripe_account_id": 1, "stripe_charges_enabled": 1, "stripe_onboarding_complete": 1},
    ).sort("name", 1)

    teachers = []
    async for doc in cursor:
        teachers.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", "Unknown"),
            "email": doc.get("email", ""),
            "stripe_account_id": doc.get("stripe_account_id"),
            "charges_enabled": doc.get("stripe_charges_enabled", False),
            "onboarding_complete": doc.get("stripe_onboarding_complete", False),
        })

    return {"teachers": teachers}


@router.get("/payments/admin/commission")
async def admin_commission(
    payload: dict = Depends(require_role("admin")),
):
    return {"commission_percent": COMMISSION_PERCENT}


@router.put("/payments/admin/commission")
async def admin_update_commission(
    request: Request,
    payload: dict = Depends(require_role("admin")),
):
    body = await request.json()
    new_percent = body.get("commission_percent")
    if new_percent is None or not isinstance(new_percent, (int, float)) or new_percent < 0 or new_percent > 100:
        raise BadRequestError("commission_percent must be between 0 and 100")
    global COMMISSION_PERCENT
    COMMISSION_PERCENT = float(new_percent)
    return {"commission_percent": COMMISSION_PERCENT}
