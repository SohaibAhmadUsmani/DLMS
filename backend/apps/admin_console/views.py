"""
Admin console — wraps core-owned user data via internal HTTP calls (never queries
users collection directly). Courses and settings are console-owned, queried directly.
"""

from asgiref.sync import async_to_sync

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.documents import Course, LmsSetting
from apps.common.jwt_auth import IsRole, require_role
from shared.internal_client import call_core, InternalCallError

IsAdmin = require_role("admin")


class UserListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        role = request.query_params.get("role", "")
        is_active = request.query_params.get("is_active", "")
        try:
            params = {}
            if role:
                params["role"] = role
            if is_active:
                params["is_active"] = is_active
            result = async_to_sync(call_core)("GET", "/internal/users", params=params)
            return Response(result)
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)


class UserStatusView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            result = async_to_sync(call_core)(
                "PATCH", f"/internal/users/{pk}/status", json=request.data
            )
            return Response(result)
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)


class UserDeleteView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            result = async_to_sync(call_core)("DELETE", f"/internal/users/{pk}")
            return Response(result)
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)


class AdminCourseListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        courses = Course.objects.all().order_by("-created_at")
        data = [
            {
                "id": str(c.id),
                "title": c.title,
                "description": c.description,
                "teacher_id": c.teacher_id,
                "credit_hours": getattr(c, 'credit_hours', 3),
                "is_published": c.is_published,
                "cover_image": c.cover_image or "",
                "created_at": c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
            }
            for c in courses
        ]
        return Response(data)


class SettingsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        settings = LmsSetting.objects.all()
        data = {s.key: s.value for s in settings}
        return Response(data)

    def put(self, request):
        for key, value in request.data.items():
            LmsSetting.objects(key=key).update_one(set__value=str(value), upsert=True)
        return Response(request.data)
