import os
import random
from datetime import datetime, timedelta, timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio


async def seed():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "lms")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]

    COLLECTION_ENROLLMENTS = "enrollments"
    COLLECTION_TRANSACTIONS = "transactions"
    COLLECTION_USERS = "users"
    COLLECTION_COURSES = "courses"

    # Get teachers and students
    teachers = await db[COLLECTION_USERS].find({"role": "teacher"}).to_list(100)
    students = await db[COLLECTION_USERS].find({"role": "student"}).to_list(100)

    if not teachers:
        print("No teachers found. Create some users first.")
        return
    if not students:
        print("No students found. Create some users first.")
        return

    print(f"Found {len(teachers)} teachers, {len(students)} students")

    # Get courses
    courses = await db[COLLECTION_COURSES].find({}).to_list(100)
    print(f"Found {len(courses)} courses")

    # Seed transactions for each teacher's courses
    transaction_count = 0
    enrollment_count = 0

    base_date = datetime(2026, 7, 21, tzinfo=timezone.utc)

    for teacher in teachers:
        teacher_courses = [c for c in courses if str(c.get("teacher_id", "")) == str(teacher["_id"])]
        if not teacher_courses:
            continue

        has_stripe = bool(teacher.get("stripe_account_id"))
        # Assign stripe account to some teachers randomly for demo
        if not has_stripe and random.random() < 0.6:
            await db[COLLECTION_USERS].update_one(
                {"_id": teacher["_id"]},
                {"$set": {
                    "stripe_account_id": f"acct_demo_{str(teacher['_id'])[:12]}",
                    "stripe_charges_enabled": True,
                    "stripe_onboarding_complete": True,
                }}
            )
            has_stripe = True

        if not has_stripe:
            continue

        # Create 5-15 transactions per teacher
        num_transactions = random.randint(5, 15)
        for _ in range(num_transactions):
            course = random.choice(teacher_courses)
            student = random.choice(students)

            # Random date in 2026, on or before July 21
            days_ago = random.randint(1, 120)
            tx_date = base_date - timedelta(days=days_ago)
            tx_date = tx_date.replace(hour=random.randint(8, 20), minute=random.randint(0, 59))

            price = float(course.get("price", 0)) if course.get("price", 0) > 0 else random.choice([19.99, 29.99, 49.99, 79.99, 99.99, 149.99])
            platform_fee = round(price * 0.1, 2)
            teacher_earning = round(price - platform_fee, 2)
            order_id = f"ORD-{int(tx_date.timestamp() * 1000)}-{random.randint(1000, 9999)}"
            session_id = f"cs_demo_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"
            intent_id = f"pi_demo_{random.randint(100000, 999999)}_{random.randint(1000, 9999)}"

            # Create transaction
            existing_tx = await db[COLLECTION_TRANSACTIONS].find_one({"order_id": order_id})
            if existing_tx:
                continue

            await db[COLLECTION_TRANSACTIONS].insert_one({
                "order_id": order_id,
                "student_id": str(student["_id"]),
                "course_id": str(course["_id"]),
                "teacher_id": str(teacher["_id"]),
                "amount": price,
                "platform_fee": platform_fee,
                "teacher_earning": teacher_earning,
                "payment_method": "Stripe",
                "status": "Completed",
                "stripe_session_id": session_id,
                "stripe_payment_intent": intent_id,
                "payout_id": None,
                "payout_status": random.choice(["Paid", "Pending"]),
                "created_at": tx_date,
            })

            # Create enrollment for this transaction
            existing_enr = await db[COLLECTION_ENROLLMENTS].find_one({
                "student_id": str(student["_id"]),
                "course_id": str(course["_id"]),
                "status": "active",
            })
            if not existing_enr:
                await db[COLLECTION_ENROLLMENTS].insert_one({
                    "student_id": str(student["_id"]),
                    "course_id": str(course["_id"]),
                    "enrolled_at": tx_date,
                    "status": "active",
                    "progress": random.randint(0, 100),
                    "payment_status": "Paid",
                    "payment_method": "Stripe",
                    "stripe_session_id": session_id,
                    "stripe_payment_intent": intent_id,
                })
                enrollment_count += 1

            transaction_count += 1

    print(f"Seeded {transaction_count} transactions and {enrollment_count} enrollments")
    client.close()


asyncio.run(seed())
