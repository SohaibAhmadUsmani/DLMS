
import pytest


class TestInfrastructure:
    """Verify the test environment itself."""

    async def test_health(self, async_client):
        r = await async_client.get("/api/v1/core/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"

    async def test_console_internal_health(self, async_client):
        r = await async_client.get("/internal/health")
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "dlms-console"

    async def test_core_openapi(self, async_client):
        r = await async_client.get("/api/v1/core/openapi.json")
        assert r.status_code == 200
        paths = r.json().get("paths", {})
        assert len(paths) > 0
        # Spot-check that key endpoints are registered
        assert "/auth/register" in paths
        assert "/auth/login" in paths
        assert "/health" in paths
        assert "/enrollments" in paths

    async def test_registered_user_factory(self, async_client, registered_user):
        user = await registered_user("factory@test.com", "secret", "student")
        assert user["role"] == "student"
        assert "id" in user
        assert user["token"] is not None
        # Can authenticate with the generated token
        r = await async_client.get(
            "/api/v1/core/auth/me",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert r.status_code == 200
        assert r.json()["email"] == "factory@test.com"


class TestAuthGuards:
    """Auth guards across both domains."""

    async def test_no_token_returns_401(self, async_client):
        r = await async_client.get("/api/v1/core/auth/me")
        assert r.status_code == 401

        r = await async_client.get("/api/v1/console/certificates/my/")
        assert r.status_code == 401

        r = await async_client.post(
            "/api/v1/core/enrollments?course_id=507f1f77bcf86cd799439011"
        )
        assert r.status_code == 401

    async def test_student_cannot_create_quiz(self, async_client, headers):
        r = await async_client.post(
            "/api/v1/core/courses/507f1f77bcf86cd799439011/quizzes",
            json={"title": "test", "time_limit_minutes": 30},
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_teacher_cannot_enroll(self, async_client, headers):
        r = await async_client.post(
            "/api/v1/core/enrollments?course_id=507f1f77bcf86cd799439011",
            headers=headers("teacher"),
        )
        assert r.status_code == 403


class TestCoreAPI:
    """End-to-end flows through the core domain."""

    async def test_register_and_login(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        email = "e2e@test.com"
        r = await async_client.post("/api/v1/core/auth/register", json={
            "name": "E2E User",
            "email": email,
            "password": "pass123",
            "role": "student",
        })
        assert r.status_code == 201
        user_id = r.json()["id"]
        assert user_id is not None

        r = await async_client.post("/api/v1/core/auth/login", json={
            "email": email,
            "password": "pass123",
        })
        assert r.status_code == 200
        token = r.json().get("access_token")
        assert token is not None

        r = await async_client.get(
            "/api/v1/core/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json()["email"] == email

    async def test_duplicate_email_returns_409(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        await async_client.post("/api/v1/core/auth/register", json={
            "name": "First",
            "email": "dup@test.com",
            "password": "pass",
            "role": "student",
        })
        r = await async_client.post("/api/v1/core/auth/register", json={
            "name": "Second",
            "email": "dup@test.com",
            "password": "pass",
            "role": "student",
        })
        assert r.status_code == 409

    async def test_enrollment_internal_check(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.get(
            "/api/v1/core/internal/enrollments/check/stu123/course123"
        )
        assert r.status_code == 200
        assert r.json() == {"enrolled": False}

    async def test_certificate_internal_by_student(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.get(
            "/api/v1/core/internal/certificates/student/any_student"
        )
        assert r.status_code == 200
        assert r.json() == []

    async def test_certificate_internal_by_course(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.get(
            "/api/v1/core/internal/certificates/course/any_course"
        )
        assert r.status_code == 200
        assert r.json() == []


class TestConsoleAPI:
    """End-to-end flows through the console domain."""

    async def test_internal_course_not_found(self, async_client):
        r = await async_client.get(
            "/api/v1/console/internal/courses/507f1f77bcf86cd799439011/"
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_internal_section_not_found(self, async_client):
        r = await async_client.get(
            "/api/v1/console/internal/sections/507f1f77bcf86cd799439011/"
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_internal_settings_not_found(self, async_client):
        r = await async_client.get(
            "/api/v1/console/internal/settings/nonexistent/"
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_console_certificates_my_no_auth(self, async_client):
        r = await async_client.get("/api/v1/console/certificates/my/")
        assert r.status_code == 401

    async def test_console_certificates_my_as_student(self, async_client, headers):
        r = await async_client.get(
            "/api/v1/console/certificates/my/",
            headers=headers("student"),
        )
        # Core will try to reach the DB → 502 or succeed with empty list
        assert r.status_code in (200, 502)

    async def test_console_course_certificates_forbidden_for_student(
        self, async_client, headers
    ):
        r = await async_client.get(
            "/api/v1/console/courses/507f1f77bcf86cd799439011/certificates/",
            headers=headers("student"),
        )
        assert r.status_code == 403
