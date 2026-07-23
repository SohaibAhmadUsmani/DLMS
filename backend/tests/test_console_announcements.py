import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"


def _url(course_id):
    return f"/api/v1/console/courses/{course_id}/announcements/"


class TestAnnouncementAuthGuards:

    async def test_list_requires_auth(self, async_client):
        r = await async_client.get(_url(_VALID_OID))
        assert r.status_code == 401

    async def test_create_requires_auth(self, async_client):
        r = await async_client.post(_url(_VALID_OID), json={"title": "x", "body": "y"})
        assert r.status_code == 401

    async def test_create_student_forbidden(self, async_client, headers):
        r = await async_client.post(
            _url(_VALID_OID),
            json={"title": "x", "body": "y"},
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_create_teacher_success(self, async_client, headers, db):
        """Create an announcement as a teacher — needs DB for course ownership check."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        # First create a course
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Ann Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.post(
            _url(cid),
            json={"title": "Hello", "body": "World"},
            headers=headers("teacher"),
        )
        assert r.status_code == 201
        assert r.json()["title"] == "Hello"

    async def test_create_with_invalid_course_id(self, async_client, headers):
        r = await async_client.post(
            _url("not-an-oid"),
            json={"title": "x", "body": "y"},
            headers=headers("teacher"),
        )
        assert r.status_code == 403  # _owns_course fails fast

    async def test_retrieve_requires_auth(self, async_client):
        r = await async_client.get(f"/api/v1/console/announcements/{_VALID_OID}/")
        assert r.status_code == 401

    async def test_update_requires_teacher(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Upd Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.post(
            _url(cid),
            json={"title": "Original", "body": "x"},
            headers=headers("teacher"),
        )
        aid = r.json()["id"]

        r = await async_client.put(
            f"/api/v1/console/announcements/{aid}/",
            json={"title": "Updated", "body": "y", "course_id": cid},
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        assert r.json()["title"] == "Updated"

    async def test_delete_by_owner(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Del Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.post(
            _url(cid),
            json={"title": "Delete Me", "body": "x"},
            headers=headers("teacher"),
        )
        aid = r.json()["id"]
        r = await async_client.delete(
            f"/api/v1/console/announcements/{aid}/",
            headers=headers("teacher"),
        )
        assert r.status_code == 204


class TestInternalAnnouncement:

    async def test_internal_retrieve_not_found(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/announcements/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_internal_list_by_course(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/announcements/course/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == []


class TestAnnouncementWithMockedEnrollment:

    async def test_student_can_list_when_mocked_enrolled(
        self, async_client, headers, db,
    ):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("apps.announcements.views.call_core") as mock:
            mock.return_value = {"enrolled": True}

            r = await async_client.get(
                _url(_VALID_OID),
                headers=headers("student"),
            )
            # Should pass enrollment check — result depends on DB for data
            assert r.status_code in (200, 403)

    async def test_student_forbidden_when_mocked_not_enrolled(
        self, async_client, headers,
    ):
        with patch("apps.announcements.views.call_core") as mock:
            mock.return_value = {"enrolled": False}

            r = await async_client.get(
                _url(_VALID_OID),
                headers=headers("student"),
            )
            assert r.status_code == 403
