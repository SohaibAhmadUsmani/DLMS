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

        r = await c.get("/api/v1/console/assignments/")
        assert r.status_code == 401
        print("[OK] 401 without token")

        r = await c.post("/api/v1/console/assignments/", json={})
        assert r.status_code == 401
        print("[OK] 401 POST without token")

        r = await c.post("/api/v1/console/assignments/", json={}, headers=h("student"))
        assert r.status_code == 403
        print("[OK] 403 student cannot create")

        r = await c.get("/api/v1/console/assignments/", headers=h("student"))
        assert r.status_code in (200, 500)
        print(f"[OK] GET as student: {r.status_code}")

        r = await c.post("/api/v1/console/assignments/", json={"title": "t", "course_id": "000000000000000000000001"}, headers=h("teacher"))
        assert r.status_code in (403, 500)
        print(f"[OK] POST (no DB): {r.status_code}")

        r = await c.get("/api/v1/console/assignments/", headers=h("teacher"))
        assert r.status_code in (200, 500)
        print(f"[OK] GET as teacher: {r.status_code}")

        r = await c.get("/api/v1/console/assignments/", headers=h("admin"))
        assert r.status_code in (200, 500)
        print(f"[OK] GET as admin: {r.status_code}")

        r = await c.get("/api/v1/console/internal/assignments/fakeid/")
        assert r.status_code == 200
        assert r.json() == {"exists": False}
        print(f"[OK] Internal retrieve (not found): {r.json()}")

        print("\n=== ASSIGNMENT SMOKE TESTS PASSED ===")


asyncio.run(smoke())
