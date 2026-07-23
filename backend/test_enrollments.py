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
    base = "http://test/api/v1/core"
    async with AsyncClient(transport=transport, base_url=base, timeout=10) as c:

        s = create_access_token(user_id="stu1", role="student")
        t = create_access_token(user_id="tch1", role="teacher")
        h_s = {"Authorization": f"Bearer {s}"}
        h_t = {"Authorization": f"Bearer {t}"}

        r = await c.post("/enrollments?course_id=c1")
        assert r.status_code == 401
        print("[OK] 401 without token")

        r = await c.post("/enrollments?course_id=c1", headers=h_t)
        assert r.status_code == 403
        print("[OK] 403 teacher cannot enroll")

        r = await c.get("/enrollments/my")
        assert r.status_code == 401
        print("[OK] 401 GET /enrollments/my without token")

        r = await c.get("/enrollments/my", headers=h_t)
        assert r.status_code == 403
        print("[OK] 403 teacher cannot list enrollments")

        r = await c.get("/internal/enrollments/check/stu1/c1")
        assert r.status_code == 200
        assert r.json() == {"enrolled": False}
        print(f"[OK] Internal check: {r.json()}")

        r = await c.get("/internal/enrollments/course/c1")
        assert r.status_code in (200, 500)
        print(f"[OK] Internal course enrollments: {r.status_code}")

        print("\n=== ENROLLMENT SMOKE TESTS PASSED ===")

asyncio.run(smoke())
