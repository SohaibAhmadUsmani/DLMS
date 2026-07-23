"""
Tests for the core enrollments module.

Covers:
  - Auth guards (no token, wrong role)
  - Enrollment flows (POST enroll, GET my enrollments, DELETE unenroll)
  - Internal check endpoint (used by console → core crossing)
  - call_console dependency (mocked or skipped)
"""

import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"


class TestEnrollmentAuthGuards:
    """Auth guards that work without DB."""

    async def test_enroll_requires_auth(self, async_client):
        r = await async_client.post(f"/api/v1/core/enrollments?course_id={_VALID_OID}")
        assert r.status_code == 401

    async def test_enroll_teacher_forbidden(self, async_client, headers):
        r = await async_client.post(
            f"/api/v1/core/enrollments?course_id={_VALID_OID}",
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_my_enrollments_requires_student(self, async_client, headers):
        r = await async_client.get(
            "/api/v1/core/enrollments/my",
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_my_enrollments_no_auth(self, async_client):
        r = await async_client.get("/api/v1/core/enrollments/my")
        assert r.status_code == 401

    async def test_unenroll_requires_auth(self, async_client):
        r = await async_client.delete(f"/api/v1/core/enrollments/{_VALID_OID}")
        assert r.status_code == 401


class TestEnrollFlow:
    """Full enrollment flow — needs DB."""

    async def test_enroll_success_with_mocked_console(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student1", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": True, "teacher_id": "t1"}
            r = await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            assert r.status_code == 201
            assert r.json()["status"] == "active"

    async def test_enroll_duplicate(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student2", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": True, "teacher_id": "t1"}
            await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            r = await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            assert r.status_code == 409

    async def test_enroll_course_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student3", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": False}
            r = await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            assert r.status_code == 404

    async def test_enroll_course_not_published(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student4", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": False}
            r = await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            assert r.status_code == 400

    async def test_my_enrollments(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student5", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": True, "teacher_id": "t1"}
            await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )

        r = await async_client.get(
            "/api/v1/core/enrollments/my",
            headers=h,
        )
        assert r.status_code == 200
        assert len(r.json()) >= 1

    async def test_unenroll_own_enrollment(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student6", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": True, "teacher_id": "t1"}
            r = await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )
            eid = r.json()["id"]

            r = await async_client.delete(
                f"/api/v1/core/enrollments/{eid}",
                headers=h,
            )
            assert r.status_code == 200
            assert r.json()["deleted"] is True

    async def test_unenroll_nonexistent(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student7", "student")
        h = {"Authorization": f"Bearer {token}"}
        r = await async_client.delete(
            f"/api/v1/core/enrollments/000000000000000000000000",
            headers=h,
        )
        assert r.status_code == 404


class TestInternalEnrollment:

    async def test_check_enrollment_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.get(
            f"/api/v1/core/internal/enrollments/check/stu999/{_VALID_OID}",
        )
        assert r.status_code == 200
        assert r.json() == {"enrolled": False}

    async def test_check_enrollment_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("checked_student", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.enrollments.call_console") as mock:
            mock.return_value = {"exists": True, "is_published": True, "teacher_id": "t1"}
            await async_client.post(
                f"/api/v1/core/enrollments?course_id={_VALID_OID}",
                headers=h,
            )

        r = await async_client.get(
            f"/api/v1/core/internal/enrollments/check/checked_student/{_VALID_OID}",
        )
        assert r.status_code == 200
        assert r.json() == {"enrolled": True}
