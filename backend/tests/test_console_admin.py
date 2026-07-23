import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

_VALID_OID = "507f1f77bcf86cd799439011"

class TestAdminAuthGuards:
    """All admin endpoints require admin role — verify non-admin gets 403."""

    async def test_user_list_requires_admin(self, async_client, headers):
        for role in ("student", "teacher"):
            r = await async_client.get(
                "/api/v1/console/admin/users/",
                headers=headers(role),
            )
            assert r.status_code == 403, f"{role} should not access user list"

    async def test_user_list_no_auth(self, async_client):
        r = await async_client.get("/api/v1/console/admin/users/")
        assert r.status_code == 401

    async def test_user_status_requires_admin(self, async_client, headers):
        r = await async_client.patch(
            f"/api/v1/console/admin/users/{_VALID_OID}/status/",
            json={"is_active": False},
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_user_delete_requires_admin(self, async_client, headers):
        r = await async_client.delete(
            f"/api/v1/console/admin/users/{_VALID_OID}/",
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_courses_list_requires_admin(self, async_client, headers):
        r = await async_client.get(
            "/api/v1/console/admin/courses/",
            headers=headers("teacher"),
        )
        assert r.status_code == 403

    async def test_settings_get_requires_admin(self, async_client, headers):
        r = await async_client.get(
            "/api/v1/console/admin/settings/",
            headers=headers("student"),
        )
        assert r.status_code == 403

    async def test_settings_put_requires_admin(self, async_client, headers):
        r = await async_client.put(
            "/api/v1/console/admin/settings/",
            json={"key": "value"},
            headers=headers("teacher"),
        )
        assert r.status_code == 403


class TestAdminUserEndpoints:
    async def test_user_list_proxies_to_core(self, async_client, headers):
        with patch("apps.admin_console.views.call_core") as mock:
            mock.return_value = {"users": [], "total": 0, "page": 1, "page_size": 20}
            r = await async_client.get(
                "/api/v1/console/admin/users/",
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json()["users"] == []

    async def test_user_list_with_filters(self, async_client, headers):
        with patch("apps.admin_console.views.call_core") as mock:
            mock.return_value = {"users": [], "total": 0, "page": 1, "page_size": 20}
            r = await async_client.get(
                "/api/v1/console/admin/users/?role=student&is_active=true",
                headers=headers("admin"),
            )
            assert r.status_code == 200
            # Verify filters were passed to call_core
            call_args = mock.call_args
            assert call_args is not None
            _, kwargs = call_args
            params = kwargs.get("params", {})
            assert params.get("role") == "student"

    async def test_user_list_502_when_core_down(self, async_client, headers):
        from shared.internal_client import InternalCallError

        with patch("apps.admin_console.views.call_core") as mock:
            mock.side_effect = InternalCallError("core unavailable")
            r = await async_client.get(
                "/api/v1/console/admin/users/",
                headers=headers("admin"),
            )
            assert r.status_code == 502

    async def test_user_status_patch_proxies(self, async_client, headers):
        with patch("apps.admin_console.views.call_core") as mock:
            mock.return_value = {"modified": True}
            r = await async_client.patch(
                f"/api/v1/console/admin/users/{_VALID_OID}/status/",
                json={"is_active": False},
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json()["modified"] is True

    async def test_user_delete_proxies(self, async_client, headers):
        with patch("apps.admin_console.views.call_core") as mock:
            mock.return_value = {"deleted": True}
            r = await async_client.delete(
                f"/api/v1/console/admin/users/{_VALID_OID}/",
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json()["deleted"] is True


class TestAdminCourseAndSettings:
    """Admin course list + settings — direct mongoengine reads."""

    async def test_courses_list(self, async_client, headers):
        with patch("apps.admin_console.views.Course.objects") as mock_qs:
            mock_qs.all.return_value.order_by.return_value = []
            r = await async_client.get(
                "/api/v1/console/admin/courses/",
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json() == []

    async def test_settings_get(self, async_client, headers):
        with patch("apps.admin_console.views.LmsSetting.objects") as mock_qs:
            mock_qs.all.return_value = []
            r = await async_client.get(
                "/api/v1/console/admin/settings/",
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json() == {}

    async def test_settings_put(self, async_client, headers):
        with patch("apps.admin_console.views.LmsSetting.objects") as mock_qs:
            mock_qs.filter.return_value.update_one.return_value = None
            r = await async_client.put(
                "/api/v1/console/admin/settings/",
                json={"passing_threshold": "75"},
                headers=headers("admin"),
            )
            assert r.status_code == 200
            assert r.json()["passing_threshold"] == "75"
