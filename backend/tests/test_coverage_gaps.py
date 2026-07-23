"""
Coverage gap tests — targets modules below 70%, prioritizing error paths.

Methodology:
  - Pure unit tests for models and utilities (no DB, no HTTP)
  - Integration tests with mocked call_console for FastAPI routers
  - Error paths (400/401/403/404/409/422/502) over happy-path re-testing
"""

import os
import uuid
import pytest
from unittest.mock import patch, AsyncMock

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["MONGO_DB_NAME"] = "lms_test"
import django; django.setup()

from datetime import datetime
from bson import ObjectId
from httpx import AsyncClient, ASGITransport
from config.asgi import application
from django.conf import settings

# ── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  Helpers
# ── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

_CORE = "/api/v1/core"
_CONSOLE = "/api/v1/console"

# Pre-generated valid OID for courses/sections
_VALID_OID = "507f1f77bcf86cd799439011"

from shared.security import create_access_token

def _h(role_or_user, role_arg=None):
    if role_arg is not None:
        return {"Authorization": f"Bearer {create_access_token(role_or_user, role_arg)}"}
    return {"Authorization": f"Bearer {create_access_token(f'{role_or_user}_fixture', role_or_user)}"}

@pytest.fixture
async def ac():
    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=10) as c:
        yield c

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  1. fastapi_service/core/database.py  (68% → 100%)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestDatabaseModule:
    """Pure unit tests — no DB, no HTTP."""

    def test_is_db_connected_returns_bool(self):
        from fastapi_service.core.database import is_db_connected
        result = is_db_connected()
        assert isinstance(result, bool)

    @pytest.mark.asyncio
    async def test_connect_db_failure_sets_false(self):
        from fastapi_service.core.database import connect_db, is_db_connected
        original_uri = settings.MONGO_URI
        try:
            settings.MONGO_URI = "mongodb://invalid:27017"
            await connect_db()
            assert is_db_connected() is False
        finally:
            settings.MONGO_URI = original_uri

    @pytest.mark.asyncio
    async def test_close_db_sets_client_none(self):
        from fastapi_service.core.database import close_db, client
        await close_db()
        assert client is None

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  2. fastapi_service/models/auth_schemas.py  (69% → 100%)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestAuthSchemasValidators:
    """Pure Pydantic validation tests — no DB, no HTTP."""

    def test_register_invalid_role(self):
        from fastapi_service.models.auth_schemas import RegisterRequest
        with pytest.raises(Exception):
            RegisterRequest(name="X", email="x@x.com", password="123456", role="admin")

    def test_register_short_password(self):
        from fastapi_service.models.auth_schemas import RegisterRequest
        with pytest.raises(Exception):
            RegisterRequest(name="X", email="x@x.com", password="ab", role="student")

    def test_update_status_invalid_role(self):
        from fastapi_service.models.auth_schemas import UpdateUserStatusRequest
        with pytest.raises(Exception):
            UpdateUserStatusRequest(role="invalid_role")

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  3. fastapi_service/routers/auth.py  (34% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestAuthErrorPaths:
    """Error paths for register / login / me / internal user ops."""

    @pytest.mark.asyncio
    async def test_register_invalid_role_422(self, ac):
        r = await ac.post(f"{_CORE}/auth/register", json={
            "name": "X", "email": "badrole@test.com",
            "password": "secret123", "role": "admin",
        })
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_register_short_password_422(self, ac):
        r = await ac.post(f"{_CORE}/auth/register", json={
            "name": "X", "email": "shortpw@test.com",
            "password": "ab", "role": "student",
        })
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_login_nonexistent_email_401(self, ac):
        r = await ac.post(f"{_CORE}/auth/login", json={
            "email": "nobody@test.com", "password": "secret123",
        })
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_me_no_token_401(self, ac):
        r = await ac.get(f"{_CORE}/auth/me")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_me_user_not_found_404(self, ac):
        oid = str(ObjectId())
        token = create_access_token(oid, "student")
        r = await ac.get(f"{_CORE}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_internal_list_users(self, ac):
        r = await ac.get(f"{_CORE}/internal/users?role=student&is_active=true")
        assert r.status_code == 200
        data = r.json()
        assert "users" in data and "total" in data

    @pytest.mark.asyncio
    async def test_internal_update_status_not_found_404(self, ac):
        r = await ac.patch(
            f"{_CORE}/internal/users/{_VALID_OID}/status",
            json={"is_active": False},
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_internal_update_status_no_fields_400(self, ac):
        r = await ac.patch(
            f"{_CORE}/internal/users/{_VALID_OID}/status",
            json={},
        )
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_internal_delete_not_found_404(self, ac):
        r = await ac.delete(f"{_CORE}/internal/users/{_VALID_OID}")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_me_with_valid_token(self, ac, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        email = f"me_coverage_{uuid.uuid4().hex[:8]}@test.com"
        r = await ac.post(f"{_CORE}/auth/register", json={
            "name": "MeTest", "email": email,
            "password": "secret123", "role": "student",
        })
        uid = r.json()["id"]
        token = create_access_token(uid, "student")
        r = await ac.get(f"{_CORE}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == email

    @pytest.mark.asyncio
    async def test_login_and_me_roundtrip(self, ac, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        email = f"login_coverage_{uuid.uuid4().hex[:8]}@test.com"
        r = await ac.post(f"{_CORE}/auth/register", json={
            "name": "LoginTest", "email": email,
            "password": "secret123", "role": "teacher",
        })
        r = await ac.post(f"{_CORE}/auth/login", json={
            "email": email, "password": "secret123",
        })
        assert r.status_code == 200
        token = r.json()["access_token"]
        r = await ac.get(f"{_CORE}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  4. fastapi_service/routers/enrollments.py  (36% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestEnrollmentErrorPaths:
    """Error paths: nonexistent/unpublished course, duplicate, unenroll edge cases."""

    @pytest.mark.asyncio
    async def test_enroll_course_not_found_404(self, ac):
        with patch("fastapi_service.routers.enrollments.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {"exists": False}
            r = await ac.post(f"{_CORE}/enrollments?course_id={_VALID_OID}",
                              headers=_h("student"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_enroll_unpublished_course_400(self, ac):
        with patch("fastapi_service.routers.enrollments.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {"exists": True, "is_published": False}
            r = await ac.post(f"{_CORE}/enrollments?course_id={_VALID_OID}",
                              headers=_h("student"))
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_enroll_duplicate_409(self, ac, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = f"dup_enroll_{uuid.uuid4().hex[:8]}"
        course_id = str(ObjectId())
        token = create_access_token(student_id, "student")
        headers = {"Authorization": f"Bearer {token}"}
        with patch("fastapi_service.routers.enrollments.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {"exists": True, "is_published": True}
            r = await ac.post(f"{_CORE}/enrollments?course_id={course_id}",
                              headers=headers)
            assert r.status_code == 201, f"first enroll {r.status_code}: {r.text}"
            r = await ac.post(f"{_CORE}/enrollments?course_id={course_id}",
                              headers=headers)
            assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_unenroll_not_found_404(self, ac):
        r = await ac.delete(f"{_CORE}/enrollments/{_VALID_OID}",
                            headers=_h("student"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_unenroll_forbidden_not_owner_403(self, ac, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        from motor.motor_asyncio import AsyncIOMotorClient
        mclient = AsyncIOMotorClient(os.environ.get("TEST_MONGO_URI", settings.MONGO_URI),
                                     serverSelectionTimeoutMS=4000)
        try:
            mdb = mclient[settings.MONGO_DB_NAME]
            course_id = str(ObjectId())
            r = await mdb["enrollments"].insert_one({
                "student_id": f"owner_{uuid.uuid4().hex[:8]}",
                "course_id": course_id,
                "status": "active",
                "enrolled_at": datetime.utcnow(),
            })
            eid = str(r.inserted_id)
            r = await ac.delete(f"{_CORE}/enrollments/{eid}",
                                headers=_h("other_stu", "student"))
            assert r.status_code == 403
        finally:
            mclient.close()

    @pytest.mark.asyncio
    async def test_enroll_success(self, ac, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = f"succ_enroll_{uuid.uuid4().hex[:8]}"
        course_id = str(ObjectId())
        token = create_access_token(student_id, "student")
        with patch("fastapi_service.routers.enrollments.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {"exists": True, "is_published": True}
            r = await ac.post(
                f"{_CORE}/enrollments?course_id={course_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 201, f"enroll {r.status_code}: {r.text}"

    @pytest.mark.asyncio
    async def test_my_enrollments_empty(self, ac):
        r = await ac.get(f"{_CORE}/enrollments/my",
                         headers=_h("no_enrollments", "student"))
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_internal_check_not_enrolled(self, ac):
        r = await ac.get(
            f"{_CORE}/internal/enrollments/check/stu_not/{_VALID_OID}"
        )
        assert r.status_code == 200
        assert r.json() == {"enrolled": False}

    @pytest.mark.asyncio
    async def test_internal_list_course_empty(self, ac):
        from bson import ObjectId as BsonOid
        unique_course = str(BsonOid())
        r = await ac.get(f"{_CORE}/internal/enrollments/course/{unique_course}")
        assert r.status_code == 200
        assert r.json() == []

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  5. fastapi_service/routers/materials.py  (24% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestMaterialErrorPaths:
    """Error paths: invalid section, not owner, delete edge cases."""

    @pytest.mark.asyncio
    async def test_upload_section_not_found_404(self, ac, tmp_path):
        from fastapi_service.routers.materials import UPLOAD_DIR
        import fastapi_service.routers.materials as mat_mod
        orig_dir = UPLOAD_DIR
        mat_mod.UPLOAD_DIR = str(tmp_path)
        try:
            with patch.object(mat_mod, "call_console", new_callable=AsyncMock) as mock:
                mock.return_value = {"exists": False}
                r = await ac.post(
                    f"{_CORE}/sections/{_VALID_OID}/materials",
                    data={"title": "T", "file_type": "pdf"},
                    files={"file": ("test.pdf", b"data", "application/pdf")},
                    headers=_h("teacher"),
                )
            assert r.status_code == 404
        finally:
            mat_mod.UPLOAD_DIR = orig_dir

    @pytest.mark.asyncio
    async def test_upload_not_owning_course_403(self, ac, tmp_path):
        import fastapi_service.routers.materials as mat_mod
        orig_dir = mat_mod.UPLOAD_DIR
        mat_mod.UPLOAD_DIR = str(tmp_path)
        try:
            with patch.object(mat_mod, "call_console", new_callable=AsyncMock) as mock:
                mock.side_effect = [
                    {"exists": True, "course_id": _VALID_OID},
                    {"exists": True, "teacher_id": "other_teacher"},
                ]
                r = await ac.post(
                    f"{_CORE}/sections/{_VALID_OID}/materials",
                    data={"title": "T", "file_type": "pdf"},
                    files={"file": ("test.pdf", b"data", "application/pdf")},
                    headers=_h("teacher"),
                )
            assert r.status_code == 403
        finally:
            mat_mod.UPLOAD_DIR = orig_dir

    @pytest.mark.asyncio
    async def test_list_materials_forbidden_403(self, ac):
        import fastapi_service.routers.materials as mat_mod
        with patch.object(mat_mod, "call_console", new_callable=AsyncMock) as mock:
            mock.side_effect = [
                {"exists": True, "course_id": _VALID_OID},
                {"exists": True, "teacher_id": "someone_else"},
            ]
            r = await ac.get(
                f"{_CORE}/sections/{_VALID_OID}/materials",
                headers=_h("student"),
            )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_invalid_oid_404(self, ac):
        r = await ac.delete(f"{_CORE}/materials/notanoid",
                            headers=_h("admin"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_not_found_404(self, ac):
        r = await ac.delete(f"{_CORE}/materials/{_VALID_OID}",
                            headers=_h("admin"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_forbidden_student_403(self, ac):
        import fastapi_service.routers.materials as mat_mod
        import fastapi_service.core.database as coredb
        orig_client = coredb.client
        from unittest.mock import MagicMock
        material_doc = {
            "_id": ObjectId(),
            "section_id": _VALID_OID,
            "file_url": "/uploads/materials/test.pdf",
        }
        mat_col = MagicMock()
        mat_col.find_one = AsyncMock(return_value=material_doc)
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda key: mat_col if key == "materials" else MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db
        coredb.client = mock_client
        try:
            with patch.object(mat_mod, "call_console", new_callable=AsyncMock) as mock:
                mock.side_effect = [
                    {"exists": True, "course_id": _VALID_OID},
                    {"exists": True, "teacher_id": "other"},
                ]
                r = await ac.delete(f"{_CORE}/materials/{_VALID_OID}",
                                    headers=_h("student"))
            assert r.status_code == 403
        finally:
            coredb.client = orig_client

    @pytest.mark.asyncio
    async def test_delete_teacher_not_owner_403(self, ac):
        import fastapi_service.routers.materials as mat_mod
        import fastapi_service.core.database as coredb
        orig_client = coredb.client
        from unittest.mock import MagicMock
        material_doc = {
            "_id": ObjectId(),
            "section_id": _VALID_OID,
            "file_url": "/uploads/materials/test.pdf",
        }
        mat_col = MagicMock()
        mat_col.find_one = AsyncMock(return_value=material_doc)
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda key: mat_col if key == "materials" else MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db
        coredb.client = mock_client
        try:
            with patch.object(mat_mod, "call_console", new_callable=AsyncMock) as mock:
                mock.side_effect = [
                    {"exists": True, "course_id": _VALID_OID},
                    {"exists": True, "teacher_id": "other_teacher"},
                ]
                r = await ac.delete(f"{_CORE}/materials/{_VALID_OID}",
                                    headers=_h("teacher"))
            assert r.status_code == 403
        finally:
            coredb.client = orig_client

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  6. fastapi_service/routers/assignment_submissions.py  (32% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestAssignmentSubmissionErrorPaths:
    """Error paths: not found, past due, not enrolled, duplicate, grade edge cases."""

    @pytest.mark.asyncio
    async def test_submit_assignment_not_found_404(self, ac):
        import fastapi_service.routers.assignment_submissions as as_mod
        with patch.object(as_mod, "call_console", new_callable=AsyncMock) as mock:
            mock.return_value = {"exists": False}
            r = await ac.post(
                f"{_CORE}/assignments/{_VALID_OID}/submit",
                files={"file": ("a.pdf", b"data", "application/pdf")},
                headers=_h("student"),
            )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_past_due_400(self, ac):
        from datetime import timedelta
        import fastapi_service.routers.assignment_submissions as as_mod
        past_due = (datetime.utcnow() - timedelta(days=1)).isoformat()
        with patch.object(as_mod, "call_console", new_callable=AsyncMock) as mock:
            mock.return_value = {
                "exists": True, "due_date": past_due, "course_id": _VALID_OID,
            }
            r = await ac.post(
                f"{_CORE}/assignments/{_VALID_OID}/submit",
                files={"file": ("a.pdf", b"data", "application/pdf")},
                headers=_h("student"),
            )
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_submit_not_enrolled_403(self, ac):
        import fastapi_service.routers.assignment_submissions as as_mod
        future = (datetime.utcnow().replace(year=2099)).isoformat()
        with patch.object(as_mod, "call_console", new_callable=AsyncMock) as mock:
            mock.return_value = {
                "exists": True, "due_date": future, "course_id": _VALID_OID,
            }
            r = await ac.post(
                f"{_CORE}/assignments/{_VALID_OID}/submit",
                files={"file": ("a.pdf", b"data", "application/pdf")},
                headers=_h("unenrolled_stu", "student"),
            )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_my_submission_not_found_404(self, ac):
        r = await ac.get(
            f"{_CORE}/assignments/{_VALID_OID}/my-submission",
            headers=_h("nosub_stu", "student"),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_grade_submission_invalid_oid_404(self, ac):
        r = await ac.patch(
            f"{_CORE}/internal/assignment-submissions/badoid/grade",
            json={"score": 80, "feedback": "ok"},
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_grade_submission_not_found_404(self, ac):
        r = await ac.patch(
            f"{_CORE}/internal/assignment-submissions/{_VALID_OID}/grade",
            json={"score": 80, "feedback": "ok"},
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_grade_submission_missing_score_400(self, ac):
        r = await ac.patch(
            f"{_CORE}/internal/assignment-submissions/{_VALID_OID}/grade",
            json={"feedback": "ok"},
        )
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_internal_list_empty(self, ac):
        r = await ac.get(
            f"{_CORE}/internal/assignment-submissions/{_VALID_OID}"
        )
        assert r.status_code == 200
        assert r.json() == []

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  7. fastapi_service/routers/internal.py  (55% → 100%)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestInternalRouter:
    """Health endpoint with DB reachable/unreachable paths."""

    @pytest.mark.asyncio
    async def test_health_ok(self, ac):
        r = await ac.get(f"{_CORE}/internal/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_health_db_connected(self, ac):
        r = await ac.get(f"{_CORE}/internal/health")
        data = r.json()
        assert data["db"] in ("connected", "disconnected")

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  8. fastapi_service/routers/certificates.py  (45% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestCertificateErrorPaths:
    """Error paths: not found, duplicate, forbidden for non-admin."""

    @pytest.mark.asyncio
    async def test_get_certificate_invalid_oid_404(self, ac):
        r = await ac.get(f"{_CORE}/certificates/badoid",
                         headers=_h("student"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_get_certificate_not_found_404(self, ac):
        r = await ac.get(f"{_CORE}/certificates/{_VALID_OID}",
                         headers=_h("student"))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_issue_cert_forbidden_student_403(self, ac):
        r = await ac.post(f"{_CORE}/certificates", json={
            "student_id": "s", "course_id": "c", "certificate_url": "/c",
        }, headers=_h("student"))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_my_certificates_empty(self, ac):
        r = await ac.get(f"{_CORE}/certificates/my",
                         headers=_h("no_certs", "student"))
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_internal_student_certificates_empty(self, ac):
        r = await ac.get(f"{_CORE}/internal/certificates/student/nobody")
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_internal_course_certificates_empty(self, ac):
        from bson import ObjectId as BsonOid
        unique_course = str(BsonOid())
        r = await ac.get(f"{_CORE}/internal/certificates/course/{unique_course}")
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_internal_check_certificate_not_exists(self, ac):
        r = await ac.get(
            f"{_CORE}/internal/certificates/check/nobody/{_VALID_OID}"
        )
        assert r.status_code == 200
        assert r.json() == {"exists": False}

# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───
#  9. fastapi_service/services/certificate_issuer.py  (18% → 70%+)
# ──  ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ─── ───

class TestCertificateIssuerUnit:
    """Pure unit tests with mocked DB cursor — no integration."""

    @pytest.mark.asyncio
    async def test_average_quiz_score_no_quizzes(self):
        from fastapi_service.services.certificate_issuer import _average_quiz_score
        from unittest.mock import MagicMock
        cursor = AsyncMock()
        cursor.__aiter__.return_value = []
        qcol = MagicMock()
        qcol.find.return_value = cursor
        db = {"quizzes": qcol}
        result = await _average_quiz_score(db, "stu", "course1")
        assert result is None

    @pytest.mark.asyncio
    async def test_average_quiz_score_no_attempts(self):
        from fastapi_service.services.certificate_issuer import _average_quiz_score
        qid = ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = []
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        db = {"quizzes": qcol, "quiz_attempts": acol}
        result = await _average_quiz_score(db, "stu", "course1")
        assert result is None

    @pytest.mark.asyncio
    async def test_average_quiz_score_single(self):
        from fastapi_service.services.certificate_issuer import _average_quiz_score
        qid = ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = [{"score": 80.0}]
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        db = {"quizzes": qcol, "quiz_attempts": acol}
        result = await _average_quiz_score(db, "stu", "course1")
        assert result == 80.0

    @pytest.mark.asyncio
    async def test_average_quiz_score_multi(self):
        from fastapi_service.services.certificate_issuer import _average_quiz_score
        qid1, qid2 = ObjectId(), ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid1}, {"_id": qid2}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = [{"score": 90.0}, {"score": 70.0}]
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        db = {"quizzes": qcol, "quiz_attempts": acol}
        result = await _average_quiz_score(db, "stu", "course1")
        assert result == 80.0

    @pytest.mark.asyncio
    async def test_fetch_passing_threshold_default_on_failure(self):
        from fastapi_service.services.certificate_issuer import _fetch_passing_threshold
        from shared.internal_client import InternalCallError
        with patch("fastapi_service.services.certificate_issuer.call_console",
                   new_callable=AsyncMock) as mock:
            mock.side_effect = InternalCallError("fail")
            result = await _fetch_passing_threshold()
        assert result == 50.0

    @pytest.mark.asyncio
    async def test_fetch_passing_threshold_value(self):
        from fastapi_service.services.certificate_issuer import _fetch_passing_threshold
        with patch("fastapi_service.services.certificate_issuer.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {"value": 65}
            result = await _fetch_passing_threshold()
        assert result == 65.0

    @pytest.mark.asyncio
    async def test_fetch_passing_threshold_missing_value(self):
        from fastapi_service.services.certificate_issuer import _fetch_passing_threshold
        with patch("fastapi_service.services.certificate_issuer.call_console",
                   new_callable=AsyncMock) as mock:
            mock.return_value = {}
            result = await _fetch_passing_threshold()
        assert result == 50.0

    @pytest.mark.asyncio
    async def test_issue_if_eligible_already_exists(self):
        from fastapi_service.services.certificate_issuer import issue_certificate_if_eligible
        qid = ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = [{"score": 90.0}]
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        ccol = MagicMock()
        ccol.find_one = AsyncMock(return_value={"_id": qid})
        db = {"quizzes": qcol, "quiz_attempts": acol, "certificates": ccol}
        with patch("fastapi_service.services.certificate_issuer._fetch_passing_threshold",
                   new_callable=AsyncMock) as mock:
            mock.return_value = 50.0
            result = await issue_certificate_if_eligible(db, "stu", "course1")
        assert result is None

    @pytest.mark.asyncio
    async def test_issue_if_eligible_below_threshold(self):
        from fastapi_service.services.certificate_issuer import issue_certificate_if_eligible
        qid = ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = [{"score": 30.0}]
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        db = {"quizzes": qcol, "quiz_attempts": acol}
        with patch("fastapi_service.services.certificate_issuer._fetch_passing_threshold",
                   new_callable=AsyncMock) as mock:
            mock.return_value = 50.0
            result = await issue_certificate_if_eligible(db, "stu", "course1")
        assert result is None

    @pytest.mark.asyncio
    async def test_issue_if_eligible_success(self):
        from fastapi_service.services.certificate_issuer import issue_certificate_if_eligible
        qid = ObjectId()
        qcursor = AsyncMock()
        qcursor.__aiter__.return_value = [{"_id": qid}]
        acursor = AsyncMock()
        acursor.__aiter__.return_value = [{"score": 80.0}]
        from unittest.mock import MagicMock
        qcol = MagicMock()
        qcol.find.return_value = qcursor
        acol = MagicMock()
        acol.find.return_value = acursor
        ccol = MagicMock()
        ccol.find_one = AsyncMock(return_value=None)
        ins_result = MagicMock()
        ins_result.inserted_id = qid
        ccol.insert_one = AsyncMock(return_value=ins_result)
        db = {"quizzes": qcol, "quiz_attempts": acol, "certificates": ccol}
        with patch("fastapi_service.services.certificate_issuer._fetch_passing_threshold",
                   new_callable=AsyncMock) as mock:
            mock.return_value = 50.0
            result = await issue_certificate_if_eligible(db, "stu", "course1")
        assert result is not None
        assert result["student_id"] == "stu"
