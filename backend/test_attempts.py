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

        r = await c.post("/api/v1/core/quizzes/fakeid/attempts/start")
        assert r.status_code == 401
        print("[OK] 401 without token")

        r = await c.post("/api/v1/core/quizzes/fakeid/attempts/start", headers=h("teacher"))
        assert r.status_code == 403
        print("[OK] 403 teacher cannot start attempt")

        r = await c.post("/api/v1/core/quizzes/fakeid/attempts/start", headers=h("student"))
        assert r.status_code == 404
        print("[OK] 404 invalid quiz_id returns not found")

        r = await c.post("/api/v1/core/quizzes/fakeid/attempts/submit", json={"answers": []})
        assert r.status_code == 401
        print("[OK] 401 submit without token")

        r = await c.post("/api/v1/core/quizzes/fakeid/attempts/submit", json={"answers": []}, headers=h("teacher"))
        assert r.status_code == 403
        print("[OK] 403 teacher cannot submit")

        print("\n=== ATTEMPT SMOKE TESTS PASSED ===")


asyncio.run(smoke())
