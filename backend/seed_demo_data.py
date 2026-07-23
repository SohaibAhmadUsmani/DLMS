"""
Seed demo data for Fees, Events, and Leave Requests modules.
Run with: python seed_demo_data.py
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from motor.motor_asyncio import AsyncIOMotorClient
from django.conf import settings
from shared.security import hash_password
from bson import ObjectId


async def seed():
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client.get_default_database()

    print("Connected to MongoDB:", settings.MONGO_URI)

    now = datetime.utcnow()

    # ─────────── Users ───────────
    students_data = [
        {
            "email": "seeded_student1@test.com",
            "password_hash": hash_password("test123"),
            "name": "Ahmed Khan",
            "role": "student",
            "profile_picture_url": None,
            "is_active": True,
            "created_at": now.isoformat(),
        },
        {
            "email": "seeded_student2@test.com",
            "password_hash": hash_password("test123"),
            "name": "Fatima Ali",
            "role": "student",
            "profile_picture_url": None,
            "is_active": True,
            "created_at": now.isoformat(),
        },
    ]
    teachers_data = [
        {
            "email": "seeded_teacher1@test.com",
            "password_hash": hash_password("test123"),
            "name": "Dr. Usman Malik",
            "role": "teacher",
            "profile_picture_url": None,
            "is_active": True,
            "created_at": now.isoformat(),
        },
        {
            "email": "seeded_teacher2@test.com",
            "password_hash": hash_password("test123"),
            "name": "Mrs. Sana Tariq",
            "role": "teacher",
            "profile_picture_url": None,
            "is_active": True,
            "created_at": now.isoformat(),
        },
    ]

    student_ids = {}
    for s in students_data:
        existing = await db["users"].find_one({"email": s["email"]})
        if existing:
            student_ids[s["name"]] = str(existing["_id"])
            print(f"Student exists: {s['name']} ({s['email']})")
        else:
            result = await db["users"].insert_one(s)
            student_ids[s["name"]] = str(result.inserted_id)
            print(f"Created student: {s['name']} ({s['email']})")

    teacher_ids = {}
    for t in teachers_data:
        existing = await db["users"].find_one({"email": t["email"]})
        if existing:
            teacher_ids[t["name"]] = str(existing["_id"])
            print(f"Teacher exists: {t['name']} ({t['email']})")
        else:
            result = await db["users"].insert_one(t)
            teacher_ids[t["name"]] = str(result.inserted_id)
            print(f"Created teacher: {t['name']} ({t['email']})")

    # ─────────── Events ───────────
    # "Parents Teacher Meet" — next Saturday, 10:00-12:00
    days_ahead = (5 - now.weekday()) % 7  # days until Saturday
    if days_ahead == 0:
        days_ahead = 7  # next Saturday if today is Saturday
    next_sat = now + timedelta(days=days_ahead)
    meet_start = next_sat.replace(hour=10, minute=0, second=0, microsecond=0)
    meet_end = next_sat.replace(hour=12, minute=0, second=0, microsecond=0)

    # Collect attendee IDs (admins + teachers)
    admin = await db["users"].find_one({"email": "admin@gmail.com"})
    attendee_ids = []
    if admin:
        attendee_ids.append(str(admin["_id"]))
    attendee_ids.extend(teacher_ids.values())
    attendee_ids = attendee_ids[:3]  # max 3 for avatar display

    event1 = {
        "title": "Parents Teacher Meet",
        "type": "meeting",
        "start_datetime": meet_start.isoformat(),
        "end_datetime": meet_end.isoformat(),
        "description": "Annual parents-teacher meeting to discuss student progress and course updates.",
        "attendee_ids": attendee_ids,
        "created_by": str(admin["_id"]) if admin else "",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    existing = await db["events"].find_one({"title": "Parents Teacher Meet"})
    if not existing:
        await db["events"].insert_one(event1)
        print(f"Created event: Parents Teacher Meet ({meet_start.strftime('%Y-%m-%d %H:%M')})")
    else:
        print("Event exists: Parents Teacher Meet")

    # "Final Result" — next month, 14:00-15:00
    next_month = now.replace(month=now.month + 1 if now.month < 12 else 1, day=15)
    if now.month == 12:
        next_month = next_month.replace(year=now.year + 1)
    result_start = next_month.replace(hour=14, minute=0, second=0, microsecond=0)
    result_end = next_month.replace(hour=15, minute=0, second=0, microsecond=0)

    event2 = {
        "title": "Final Result",
        "type": "exam",
        "start_datetime": result_start.isoformat(),
        "end_datetime": result_end.isoformat(),
        "description": "Announcement of final examination results for all courses.",
        "attendee_ids": [],
        "created_by": str(admin["_id"]) if admin else "",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    existing = await db["events"].find_one({"title": "Final Result"})
    if not existing:
        await db["events"].insert_one(event2)
        print(f"Created event: Final Result ({result_start.strftime('%Y-%m-%d %H:%M')})")
    else:
        print("Event exists: Final Result")

    # ─────────── Fee Records ───────────
    # Student 1 (Ahmed Khan): Rs 5,000 paid fully (500000 paisa)
    # Student 2 (Fatima Ali): Rs 5,000 total, Rs 3,000 paid, status partial
    # Total Collected: Rs 8,000 (800000 paisa)
    # Total Outstanding: Rs 2,000 (200000 paisa)
    # Student Not Paid: 0

    quarter_label = f"{now.year}-Q{(now.month - 1) // 3 + 1}"

    fee1 = {
        "student_id": student_ids["Ahmed Khan"],
        "student_name": "Ahmed Khan",
        "term": quarter_label,
        "amount_due": 500000,  # Rs 5,000
        "amount_paid": 500000,  # Rs 5,000
        "due_date": now.isoformat(),
        "status": "paid",
        "payment_date": now.isoformat(),
        "created_at": (now - timedelta(days=30)).isoformat(),
        "updated_at": now.isoformat(),
    }

    existing = await db["fees"].find_one({"student_id": student_ids["Ahmed Khan"], "term": quarter_label})
    if not existing:
        await db["fees"].insert_one(fee1)
        print(f"Created fee: Ahmed Khan — Rs 5,000 paid (term: {quarter_label})")
    else:
        print(f"Fee exists: Ahmed Khan ({quarter_label})")

    fee2 = {
        "student_id": student_ids["Fatima Ali"],
        "student_name": "Fatima Ali",
        "term": quarter_label,
        "amount_due": 500000,  # Rs 5,000
        "amount_paid": 300000,  # Rs 3,000
        "due_date": now.isoformat(),
        "status": "partial",
        "payment_date": now.isoformat(),
        "created_at": (now - timedelta(days=25)).isoformat(),
        "updated_at": now.isoformat(),
    }

    existing = await db["fees"].find_one({"student_id": student_ids["Fatima Ali"], "term": quarter_label})
    if not existing:
        await db["fees"].insert_one(fee2)
        print(f"Created fee: Fatima Ali — Rs 3,000 paid / Rs 5,000 due (term: {quarter_label})")
    else:
        print(f"Fee exists: Fatima Ali ({quarter_label})")

    # ─────────── Fine Record ───────────
    fee1_doc = await db["fees"].find_one({"student_id": student_ids["Ahmed Khan"], "term": quarter_label})
    if fee1_doc:
        existing_fine = await db["fee_fines"].find_one({"fee_id": str(fee1_doc["_id"])})
        if not existing_fine:
            fine = {
                "fee_id": str(fee1_doc["_id"]),
                "student_id": student_ids["Ahmed Khan"],
                "amount": 30000,  # Rs 300
                "reason": "Late payment fee",
                "created_at": now.isoformat(),
            }
            await db["fee_fines"].insert_one(fine)
            print("Created fine: Ahmed Khan — Rs 300 (late payment)")
        else:
            print("Fine exists: Ahmed Khan")

    # ─────────── Summary ───────────
    print("\n=== SEED DATA SUMMARY ===")
    print(f"Students: Ahmed Khan, Fatima Ali")
    print(f"Teachers: Dr. Usman Malik, Mrs. Sana Tariq")
    print(f"Events: Parents Teacher Meet, Final Result")

    # Verify fee stats
    pipeline = await db["fees"].aggregate([
        {"$group": {"_id": None, "total_collected": {"$sum": "$amount_paid"}, "total_due": {"$sum": "$amount_due"}}}
    ]).to_list(1)
    totals = pipeline[0] if pipeline else {}
    print(f"Total Collected: Rs {totals.get('total_collected', 0) / 100:,.0f}")
    print(f"Total Due: Rs {totals.get('total_due', 0) / 100:,.0f}")

    unpaid = await db["fees"].count_documents({"status": "unpaid"})
    print(f"Students Not Paid (unpaid): {unpaid}")

    fine_pipeline = await db["fee_fines"].aggregate([{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]).to_list(1)
    fine_total = fine_pipeline[0]["total"] if fine_pipeline else 0
    print(f"Fine Collected: Rs {fine_total / 100:,.0f}")

    outstanding_pipeline = await db["fees"].aggregate([
        {"$match": {"status": {"$ne": "paid"}}},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount_due", "$amount_paid"]}}}}
    ]).to_list(1)
    outstanding = outstanding_pipeline[0]["total"] if outstanding_pipeline else 0
    print(f"Total Outstanding: Rs {outstanding / 100:,.0f}")

    client.close()
    print("\nSeed complete!")


if __name__ == "__main__":
    asyncio.run(seed())
