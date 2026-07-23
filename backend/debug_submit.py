import asyncio, os
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["MONGO_DB_NAME"] = "lms_test"
import django; django.setup()
from django.conf import settings
os.environ.setdefault("TEST_MONGO_URI", settings.MONGO_URI)

from httpx import AsyncClient, ASGITransport
from config.asgi import application
from shared.security import create_access_token
from unittest.mock import patch
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    import fastapi_service.core.database as d
    d.client = None
    
    mclient = AsyncIOMotorClient(os.environ["TEST_MONGO_URI"], serverSelectionTimeoutMS=4000)
    mdb = mclient[settings.MONGO_DB_NAME]
    await mdb["enrollments"].insert_one({"student_id": "stu123", "course_id": "507f1f77bcf86cd799439011", "status": "active"})
    
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=30) as client:
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "tchr1"}
            token = create_access_token("tchr1", "teacher")
            r = await client.post(
                "/api/v1/core/courses/507f1f77bcf86cd799439011/quizzes",
                json={"title": "Test", "time_limit_minutes": 30},
                headers={"Authorization": f"Bearer {token}"},
            )
            quiz_id = r.json()["id"]
            for q_data in [
                {"question_text": "Q1", "options": [{"option_text": "a", "is_correct": True}, {"option_text": "b"}], "marks": 5},
                {"question_text": "Q2", "options": [{"option_text": "a", "is_correct": False}, {"option_text": "b", "is_correct": True}, {"option_text": "c"}], "marks": 3},
            ]:
                r = await client.post(
                    f"/api/v1/core/quizzes/{quiz_id}/questions",
                    json=q_data,
                    headers={"Authorization": f"Bearer {token}"},
                )
                print(f"  Q created: {r.status_code} id={r.json().get('id')}")
        
        h = {"Authorization": f"Bearer {create_access_token('stu123', 'student')}"}
        r = await client.post(f"/api/v1/core/quizzes/{quiz_id}/start", headers=h)
        attempt_id = r.json()["id"]
        print(f"Attempt: {attempt_id}")
        
        r = await client.post(
            f"/api/v1/core/attempts/{attempt_id}/submit",
            json={"answers": [{"question_id": "FAKE_ID", "selected_option": 0}]},
            headers=h,
        )
        print(f"Submit status: {r.status_code}")
        print(f"Submit body: {r.text[:1000]}")
    
    mclient.close()

asyncio.run(main())
