import os, sys, asyncio
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from httpx import AsyncClient, ASGITransport
from config.asgi import application
from shared.security import create_access_token


async def smoke():
    transport = ASGITransport(app=application)
    tokens = {
        r: create_access_token(user_id=f"{r}1", role=r)
        for r in ("student", "teacher", "admin")
    }

    async with AsyncClient(transport=transport, base_url="http://test", timeout=10) as c:
        h = lambda r: {"Authorization": f"Bearer {tokens[r]}"}

        r = await c.post("/api/v1/core/quizzes", json={"course_id": "c1", "title": "t", "time_limit_minutes": 30})
        assert r.status_code == 401
        print("[OK] 401 POST /quizzes without token")

        r = await c.post("/api/v1/core/quizzes", json={"course_id": "c1", "title": "t", "time_limit_minutes": 30}, headers=h("student"))
        assert r.status_code == 403
        print("[OK] 403 student cannot create quiz")

        r = await c.get("/api/v1/core/quizzes/course/c1")
        assert r.status_code == 401
        print("[OK] 401 GET /quizzes/course/c1 without token")

        r = await c.delete("/api/v1/core/quizzes/fakeid", headers=h("student"))
        assert r.status_code == 403
        print("[OK] 403 student cannot delete quiz")

        r = await c.put("/api/v1/core/questions/fakeid", json={}, headers=h("student"))
        assert r.status_code == 403
        print("[OK] 403 student cannot update question")

        print("\n=== QUIZ SMOKE TESTS PASSED ===")


asyncio.run(smoke())
