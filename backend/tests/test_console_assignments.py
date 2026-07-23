import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"

def _url(course_id):
    return f"/api/v1/console/courses/{course_id}/assignments/"

class TestAssignmentAuthGuards:

    async def test_list_requires_auth(self, async_client):
        r = await async_client.get(_url(_VALID_OID))
        assert r.status_code == 401

    async def test_create_requires_auth(self, async_client):
        r = await async_client.post(
            _url(_VALID_OID),
            json={"title": "x", "due_date": "2026-12-31T23:59:00Z"},
        )
        assert r.status_code == 401

    async def test_create_student_forbidden(self, async_client, headers):
        r = await async_client.post(
            _url(_VALID_OID),
            json={"title": "x", "due_date": "2026-12-31T23:59:00Z"},
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_retrieve_requires_auth(self, async_client):
        r = await async_client.get(f"/api/v1/console/assignments/{_VALID_OID}/")
        assert r.status_code == 401

    async def test_submissions_requires_auth(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/assignments/{_VALID_OID}/submissions/"
        )
        assert r.status_code == 401

    async def test_grade_requires_auth(self, async_client):
        r = await async_client.patch(
            "/api/v1/console/assignments/submissions/bogus/grade/",
            json={"score": 90},
        )
        assert r.status_code == 401


class TestAssignmentValidation:

    async def test_create_missing_title(self, async_client, headers):
        with patch("apps.assignments.views._owns_course", return_value=True):
            r = await async_client.post(
                _url(_VALID_OID),
                json={"due_date": "2026-12-31T23:59:00Z"},
                headers=headers("teacher"),
            )
            assert r.status_code == 400

    async def test_create_missing_due_date(self, async_client, headers):
        with patch("apps.assignments.views._owns_course", return_value=True):
            r = await async_client.post(
                _url(_VALID_OID),
                json={"title": "x"},
                headers=headers("teacher"),
            )
            assert r.status_code == 400

    async def test_create_invalid_date_format(self, async_client, headers):
        with patch("apps.assignments.views._owns_course", return_value=True):
            r = await async_client.post(
                _url(_VALID_OID),
                json={"title": "x", "due_date": "not-a-date"},
                headers=headers("teacher"),
            )
            assert r.status_code == 400


class TestAssignmentCRUD:
    """Full CRUD flows — skip when MongoDB unavailable."""

    async def test_create_and_list(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Asg Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]

        r = await async_client.post(
            _url(cid),
            json={"title": "HW 1", "due_date": "2026-12-31T23:59:00Z", "max_score": 100},
            headers=headers("teacher"),
        )
        assert r.status_code == 201
        asg_id = r.json()["id"]

        r = await async_client.get(
            _url(cid),
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        assert any(a["id"] == asg_id for a in r.json())

    async def test_retrieve_and_update(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Asg Upd Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.post(
            _url(cid),
            json={"title": "Original", "due_date": "2026-12-31T23:59:00Z"},
            headers=headers("teacher"),
        )
        asg_id = r.json()["id"]

        r = await async_client.put(
            f"/api/v1/console/assignments/{asg_id}/",
            json={
                "title": "Updated", "due_date": "2026-12-31T23:59:00Z",
                "course_id": cid, "max_score": 50,
            },
            headers=headers("teacher"),
        )
        assert r.status_code == 200
        assert r.json()["max_score"] == 50

    async def test_delete(self, async_client, headers, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post(
            "/api/v1/console/courses/",
            json={"title": "Asg Del Course"},
            headers=headers("teacher"),
        )
        cid = r.json()["id"]
        r = await async_client.post(
            _url(cid),
            json={"title": "Delete Me", "due_date": "2026-12-31T23:59:00Z"},
            headers=headers("teacher"),
        )
        asg_id = r.json()["id"]

        r = await async_client.delete(
            f"/api/v1/console/assignments/{asg_id}/",
            headers=headers("teacher"),
        )
        assert r.status_code == 204


class TestAssignmentGradingProxy:
    """Tests for the submissions proxy and grading proxying endpoints."""

    async def test_submissions_proxy_returns_502_when_core_down(
        self, async_client, headers, db,
    ):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("apps.assignments.views.call_core") as mock:
            from shared.internal_client import InternalCallError
            mock.side_effect = InternalCallError("core not available")

            r = await async_client.post(
                "/api/v1/console/courses/",
                json={"title": "Proxy Course"},
                headers=headers("teacher"),
            )
            cid = r.json()["id"]
            r = await async_client.post(
                _url(cid),
                json={"title": "Proxy Test", "due_date": "2026-12-31T23:59:00Z"},
                headers=headers("teacher"),
            )
            asg_id = r.json()["id"]

            r = await async_client.get(
                f"/api/v1/console/assignments/{asg_id}/submissions/",
                headers=headers("teacher"),
            )
            assert r.status_code == 502

    async def test_grade_forbidden_for_student(self, async_client, headers):
        r = await async_client.patch(
            "/api/v1/console/assignments/submissions/bogus/grade/",
            json={"score": 90},
            headers=headers("student"),
        )
        assert r.status_code == 403


class TestInternalAssignment:

    async def test_internal_retrieve_not_found(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/assignments/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

    async def test_internal_list_by_course(self, async_client):
        r = await async_client.get(
            f"/api/v1/console/internal/assignments/course/{_VALID_OID}/",
        )
        assert r.status_code == 200
        assert r.json() == []
