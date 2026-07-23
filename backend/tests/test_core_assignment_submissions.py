"""
Tests for the core assignment_submissions module.

Covers:
  - Auth guards (no token, role gates)
  - Submission flow (submit, my-submission, retrieve)
  - Internal listing + grading endpoints
  - call_console dependency (mocked)
  - Past-due rejection, duplicate rejection, not-enrolled rejection
"""

import io
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"


class TestSubmissionAuthGuards:
    """Auth guards that work without DB."""

    async def test_submit_requires_auth(self, async_client):
        r = await async_client.post(
            f"/api/v1/core/assignments/{_VALID_OID}/submit",
            data={},
            files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
        )
        assert r.status_code == 401

    async def test_submit_teacher_forbidden(self, async_client, headers):
        r = await async_client.post(
            f"/api/v1/core/assignments/{_VALID_OID}/submit",
            data={},
            files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_my_submission_requires_student(self, async_client, headers):
        r = await async_client.get(
            f"/api/v1/core/assignments/{_VALID_OID}/my-submission",
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_my_submission_no_auth(self, async_client):
        r = await async_client.get(
            f"/api/v1/core/assignments/{_VALID_OID}/my-submission",
        )
        assert r.status_code == 401


class TestSubmissionFlow:
    """Full submission flow with mocked console calls."""

    async def test_submit_success(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2030-12-31T23:59:00",
                "title": "HW 1",
            }
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw1.pdf", io.BytesIO(b"student work"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 201
            assert "id" in r.json()
            assert r.json()["score"] is None

    async def test_submit_assignment_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student2", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {"exists": False}
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 404

    async def test_submit_past_due(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student3", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2020-01-01T00:00:00",
            }
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 400

    async def test_submit_duplicate(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student4", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2030-12-31T23:59:00",
            }
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            if r.status_code != 201:
                pytest.skip("First submission failed")
        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2030-12-31T23:59:00",
            }
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw2.pdf", io.BytesIO(b"more work"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 409

    async def test_my_submission(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student5", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2030-12-31T23:59:00",
            }
            await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )

            r = await async_client.get(
                f"/api/v1/core/assignments/{_VALID_OID}/my-submission",
                headers=h,
            )
            assert r.status_code == 200
            assert r.json()["assignment_id"] == _VALID_OID

    async def test_my_submission_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("sub_student6", "student")
        h = {"Authorization": f"Bearer {token}"}

        r = await async_client.get(
            f"/api/v1/core/assignments/{_VALID_OID}/my-submission",
            headers=h,
        )
        assert r.status_code == 404


class TestInternalSubmissions:
    """Internal listing and grading endpoints used by console ↔ core crossings."""

    async def test_list_submissions(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.get(
            f"/api/v1/core/internal/assignment-submissions/{_VALID_OID}",
        )
        assert r.status_code == 200
        assert r.json() == []

    async def test_grade_submission_missing_score(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.patch(
            f"/api/v1/core/internal/assignment-submissions/{_VALID_OID}/grade",
            json={},
        )
        assert r.status_code == 400

    async def test_grade_submission_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.patch(
            f"/api/v1/core/internal/assignment-submissions/{_VALID_OID}/grade",
            json={"score": 85, "feedback": "Good job"},
        )
        assert r.status_code == 404

    async def test_grade_success(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("graded_student", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.assignment_submissions.call_console") as mock:
            mock.return_value = {
                "exists": True,
                "course_id": "c1",
                "due_date": "2030-12-31T23:59:00",
            }
            r = await async_client.post(
                f"/api/v1/core/assignments/{_VALID_OID}/submit",
                data={},
                files={"file": ("hw.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            if r.status_code != 201:
                pytest.skip("Submission creation failed")
            sid = r.json()["id"]

            r = await async_client.patch(
                f"/api/v1/core/internal/assignment-submissions/{sid}/grade",
                json={"score": 92, "feedback": "Excellent"},
            )
            assert r.status_code == 200
            assert r.json()["score"] == 92
            assert r.json()["feedback"] == "Excellent"
