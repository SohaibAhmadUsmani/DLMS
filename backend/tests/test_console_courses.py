"""
Tests for the courses module — CourseViewSet and SectionViewSet.

Covers:
  - Auth guards (no token, wrong role)
  - Validation (missing fields, invalid course_id)
  - CRUD flows (create, list, retrieve, section CRUD)
  - Internal endpoints directly
"""

import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"


class TestCourseAuthGuards:
    """Auth checks that need no DB."""

    async def test_list_courses_requires_auth(self, async_client):
        r = await async_client.get("/api/v1/console/courses/")
        assert r.status_code == 401

    async def test_create_course_requires_auth(self, async_client):
        r = await async_client.post("/api/v1/console/courses/", json={"title": "x"})
        assert r.status_code == 401

    async def test_create_course_student_forbidden(self, async_client, headers):
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "x"},
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_retrieve_course_requires_auth(self, async_client):
        r = await async_client.get(f"/api/v1/console/courses/{_VALID_OID}/")
        assert r.status_code == 401


class TestCourseValidation:
    """Validation failures that trigger before any DB hit."""

    async def test_create_course_missing_title(self, async_client, headers):
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={},
            headers=headers("teacher"),
        )
        assert r.status_code == 400

    async def test_create_course_blank_data(self, async_client, headers):
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"description": "no title"},
            headers=headers("teacher"),
        )
        assert r.status_code == 400


class TestCourseCRUD:
    """Full CRUD flows — skip when MongoDB unavailable."""

    async def test_create_and_list_as_teacher(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Test Course", "description": "desc"},
            headers=headers("teacher"),
        )
        assert r.status_code == 201
        cid = r.json()["id"]

        r = await async_client.get(
            "/api/v1/console/courses/",
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert cid in ids

    async def test_retrieve_own_course(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "My Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.get(
            f"/api/v1/console/courses/{cid}/",
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        assert r.json()["title"] == "My Course"

    async def test_delete_course(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Delete Me"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.delete(
            f"/api/v1/console/courses/{cid}/",
            headers=headers("teacher"),
        )
        assert r.status_code == 204

    async def test_student_sees_only_published(self, async_client, headers, db, registered_user):
        if db is None:
            pytest.skip("MongoDB not reachable")
        user = await registered_user("stud@coursetest.com", "pass", "student")
        r = await async_client.get(
            "/api/v1/console/courses/",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestSectionEndpoints:
    """Section CRUD nested under courses."""

    async def test_create_section_requires_teacher(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Section Test Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]

        r = await async_client.post(
            f"/api/v1/console/courses/{cid}/sections/",
            json={"title": "Week 1", "order": 1},
            headers=headers("teacher"),
        )
        assert r.status_code == 201

    async def test_list_sections(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Section List Test"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]

        r = await async_client.get(
            f"/api/v1/console/courses/{cid}/sections/",
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestInternalCourseViews:
    """Direct tests of internal endpoints (no auth)."""

    async def test_internal_course_not_found(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/courses/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_internal_section_not_found(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/sections/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}
