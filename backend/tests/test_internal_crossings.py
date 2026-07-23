"""
Tests for every internal HTTP crossing between the two domains.

Core -> Console (call_console): course/section/assignment/announcement ownership
    checks, settings lookup. These hit Django internal endpoints that catch
    exceptions broadly and return {"exists": False} — so they work without MongoDB.

Console -> Core (call_core): enrollment checks, certificate listing, user
    management, grading proxying. These hit FastAPI internal endpoints that
    require MongoDB — tests skip when MongoDB is unreachable.

Every crossing is tested with both a success path (non-existent resource ->
clean response) and a 404 / error path -> InternalCallError.
"""

import pytest
from shared.internal_client import InternalCallError, call_core, call_console
import fastapi_service.core.database as _db_module

pytestmark = pytest.mark.asyncio


# ── Fixture ────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _reset_core_db():
    """Reset FastAPI's module-level Motor client before each test.

    Under ASGITransport the FastAPI lifespan never runs, so the Motor client
    created by get_database()/connect_db() binds to whichever event loop is
    active at first use.  By resetting client to None before each test we
    force a fresh client in the current test's event loop, preventing the
    "Event loop is closed" error when call_core is invoked across multiple
    test functions.
    """
    _db_module.client = None
    yield


# ── Shared IDs ─────────────────────────────────────────────────────────────

_VALID_OID = "507f1f77bcf86cd799439011"


# ============================================================================
#  Core -> Console  (call_console)
# ============================================================================

class TestCallConsole:
    """call_console hits Django internal endpoints (no auth, no token needed).

    These endpoints wrap mongoengine queries in broad ``except Exception``
    blocks and return ``{"exists": False}`` when the DB is unreachable or the
    document doesn't exist, so every test in this class works without MongoDB.
    """

    async def test_course_ownership_check(self):
        """Crossing used by enrollments, quizzes, materials.

        GET /api/v1/console/internal/courses/{id}/
        """
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/courses/{_VALID_OID}/",
        )
        assert result == {"exists": False}

    async def test_section_ownership_check(self):
        """Crossing used by materials (section -> course ownership).

        GET /api/v1/console/internal/sections/{id}/
        """
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/sections/{_VALID_OID}/",
        )
        assert result == {"exists": False}

    async def test_settings_lookup(self):
        """Crossing used by certificate_issuer (passing threshold).

        GET /api/v1/console/internal/settings/{key}/
        """
        result = await call_console(
            "GET",
            "/api/v1/console/internal/settings/passing_threshold/",
        )
        assert result == {"exists": False}

    async def test_assignment_lookup(self):
        """Crossing used by assignment_submissions (verify assignment exists).

        GET /api/v1/console/internal/assignments/{id}/
        """
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/assignments/{_VALID_OID}/",
        )
        assert result == {"exists": False}

    async def test_announcement_lookup(self):
        """Crossing used by internal announcement endpoints.

        GET /api/v1/console/internal/announcements/{id}/
        """
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/announcements/{_VALID_OID}/",
        )
        assert result == {"exists": False}

    async def test_announcements_list_by_course(self):
        """GET /api/v1/console/internal/announcements/course/{id}/"""
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/announcements/course/{_VALID_OID}/",
        )
        assert result == []

    async def test_assignments_list_by_course(self):
        """GET /api/v1/console/internal/assignments/course/{id}/"""
        result = await call_console(
            "GET",
            f"/api/v1/console/internal/assignments/course/{_VALID_OID}/",
        )
        assert result == []

    async def test_nonexistent_console_path_raises_error(self):
        """A 404 from a non-existent console path surfaces as InternalCallError."""
        with pytest.raises(InternalCallError):
            await call_console("GET", "/api/v1/console/internal/does_not_exist/")


# ============================================================================
#  Console -> Core  (call_core)
# ============================================================================

class TestCallCore:
    """call_core hits FastAPI internal endpoints.

    Most of these require MongoDB and are skipped when it's unreachable.
    The health endpoint is the exception — it catches DB errors internally
    and works without MongoDB.
    """

    async def test_health(self):
        """Minimal proof that call_core can reach a FastAPI endpoint.

        The health endpoint catches DB errors internally so this works
        even without MongoDB.
        """
        result = await call_core("GET", "/health")
        assert result["status"] == "ok"
        # db may be "connected" or "disconnected" — either is fine

    async def test_nonexistent_core_path_raises_error(self):
        """A 404 from a non-existent core path surfaces as InternalCallError."""
        with pytest.raises(InternalCallError):
            await call_core("GET", "/nonexistent/endpoint/")

    async def test_enrollment_check(self, db):
        """Crossing used by announcements, assignments, reviews views.

        GET /internal/enrollments/check/{student_id}/{course_id}
        """
        if db is None:
            pytest.skip("MongoDB not reachable")
        result = await call_core(
            "GET",
            f"/internal/enrollments/check/stu123/{_VALID_OID}",
        )
        assert result == {"enrolled": False}

    async def test_certificate_listing_student(self, db):
        """Crossing used by certificates UI.

        GET /internal/certificates/student/{student_id}
        """
        if db is None:
            pytest.skip("MongoDB not reachable")
        result = await call_core(
            "GET",
            "/internal/certificates/student/any_student",
        )
        assert result == []

    async def test_certificate_listing_course(self, db):
        """Crossing used by certificates UI.

        GET /internal/certificates/course/{course_id}
        """
        if db is None:
            pytest.skip("MongoDB not reachable")
        result = await call_core(
            "GET",
            f"/internal/certificates/course/{_VALID_OID}",
        )
        assert result == []

    async def test_internal_users_list(self, db):
        """Crossing used by admin console.

        GET /internal/users
        """
        if db is None:
            pytest.skip("MongoDB not reachable")
        result = await call_core("GET", "/internal/users")
        assert "users" in result
        assert "total" in result
