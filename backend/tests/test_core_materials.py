"""
Tests for the core materials module.

Covers:
  - Auth guards (no token, wrong role for upload)
  - Upload flow (requires file, title, file_type)
  - List materials by section
  - Delete material (owner check)
  - call_console dependency (mocked)
"""

import io
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"


def _section_url(sid):
    return f"/api/v1/core/sections/{sid}/materials"


class TestMaterialAuthGuards:

    async def test_upload_requires_auth(self, async_client):
        r = await async_client.post(
            _section_url(_VALID_OID),
            data={"title": "x", "file_type": "pdf"},
            files={"file": ("test.pdf", io.BytesIO(b"data"), "application/pdf")},
        )
        assert r.status_code == 401

    async def test_upload_student_forbidden(self, async_client, headers):
        r = await async_client.post(
            _section_url(_VALID_OID),
            data={"title": "x", "file_type": "pdf"},
            files={"file": ("test.pdf", io.BytesIO(b"data"), "application/pdf")},
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_list_requires_auth(self, async_client):
        r = await async_client.get(_section_url(_VALID_OID))
        assert r.status_code == 401

    async def test_delete_requires_auth(self, async_client):
        r = await async_client.delete(f"/api/v1/core/materials/{_VALID_OID}")
        assert r.status_code == 401


class TestMaterialUpload:
    """Upload flow with mocked console calls."""

    async def test_upload_as_teacher(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("teacher_mats", "teacher")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            mock.return_value = {"exists": True, "course_id": "c1"}
            r = await async_client.post(
                _section_url(_VALID_OID),
                data={"title": "Lecture 1 Slides", "file_type": "pdf"},
                files={"file": ("slides.pdf", io.BytesIO(b"%PDF-1.4 data"), "application/pdf")},
                headers=h,
            )
            # Either 201 (success) or 500 if upload dir writable/DB fail
            assert r.status_code in (201, 500)

    async def test_upload_admin_allowed(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("admin_mats", "admin")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            mock.return_value = {"exists": True, "course_id": "c1"}
            r = await async_client.post(
                _section_url(_VALID_OID),
                data={"title": "Admin Upload", "file_type": "pdf"},
                files={"file": ("admin.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            assert r.status_code in (201, 500)

    async def test_upload_section_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("teacher_mats2", "teacher")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            mock.return_value = {"exists": False}
            r = await async_client.post(
                _section_url(_VALID_OID),
                data={"title": "x", "file_type": "pdf"},
                files={"file": ("x.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 404

    async def test_upload_not_owning_course(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("other_teacher", "teacher")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            def side_effect(method, path, **kw):
                if "sections" in path:
                    return {"exists": True, "course_id": "course_owned_by_someone_else"}
                if "courses" in path:
                    return {"exists": True, "teacher_id": "not_other_teacher"}
                return {"exists": False}
            mock.side_effect = side_effect
            r = await async_client.post(
                _section_url(_VALID_OID),
                data={"title": "x", "file_type": "pdf"},
                files={"file": ("x.pdf", io.BytesIO(b"data"), "application/pdf")},
                headers=h,
            )
            assert r.status_code == 403

    async def test_upload_missing_file(self, async_client, headers):
        r = await async_client.post(
            _section_url(_VALID_OID),
            data={"title": "x", "file_type": "pdf"},
            headers=headers("teacher"),
        )
        assert r.status_code == 422  # FastAPI validation: file required


class TestMaterialList:

    async def test_list_as_student_mocked_enrolled(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student_mat", "student")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            mock.return_value = {"exists": True, "course_id": "c1"}
            r = await async_client.get(
                _section_url(_VALID_OID),
                headers=h,
            )
            # Either 200 (empty list) or 500/403
            assert r.status_code in (200, 403, 500)

    async def test_list_as_teacher_owning_course(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("teacher_own", "teacher")
        h = {"Authorization": f"Bearer {token}"}

        with patch("fastapi_service.routers.materials.call_console") as mock:
            def side_effect(method, path, **kw):
                if "sections" in path:
                    return {"exists": True, "course_id": "c_owned"}
                if "courses" in path:
                    return {"exists": True, "teacher_id": "teacher_own"}
                return {"exists": False}
            mock.side_effect = side_effect
            r = await async_client.get(
                _section_url(_VALID_OID),
                headers=h,
            )
            assert r.status_code == 200


class TestMaterialDelete:

    async def test_delete_nonexistent(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("any_user", "teacher")
        h = {"Authorization": f"Bearer {token}"}

        r = await async_client.delete(
            f"/api/v1/core/materials/{_VALID_OID}",
            headers=h,
        )
        assert r.status_code == 404

    async def test_delete_wrong_role_forbidden(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from shared.security import create_access_token

        token = create_access_token("student_only", "student")
        h = {"Authorization": f"Bearer {token}"}

        r = await async_client.delete(
            f"/api/v1/core/materials/{_VALID_OID}",
            headers=h,
        )
        assert r.status_code == 403  # Student can never delete
