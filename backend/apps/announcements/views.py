import re

from asgiref.sync import async_to_sync
from bson.objectid import ObjectId
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.common.documents import Announcement, Course
from apps.common.jwt_auth import require_role
from apps.announcements.serializers import AnnouncementSerializer
from shared.internal_client import InternalCallError, call_core


def _owns_course(user, course_id):
    if not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
        return False
    try:
        course = Course.objects.get(id=course_id)
    except Exception:
        return False
    return user.get("role") == "admin" or str(course.teacher_id) == user.get("sub")


def _enrolled_student(user, course_id) -> bool:
    if user.get("role") != "student":
        return False
    try:
        result = async_to_sync(call_core)(
            "GET", f"/internal/enrollments/check/{user.get('sub')}/{course_id}"
        )
        return result.get("enrolled", False)
    except InternalCallError:
        return False


class AnnouncementViewSet(viewsets.ViewSet):
    lookup_value_regex = "[^/]+"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), require_role("teacher", "admin")()]

    def _get_or_error(self, pk):
        try:
            return Announcement.objects.get(id=pk)
        except Exception:
            return None

    def list(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id or "", re.I):
            return Response({"detail": "Not found."}, status=404)
        user = request.user
        role = user.get("role")
        if role not in ("admin", "teacher") and not _enrolled_student(user, course_id):
            return Response({"detail": "Forbidden."}, status=403)
        announcements = Announcement.objects(course_id=course_id).order_by("-created_at")
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    def create(self, request, course_id=None):
        if not _owns_course(request.user, course_id):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = AnnouncementSerializer(
            data={**request.data, "course_id": course_id, "created_by": request.user.get("sub")}
        )
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()
        return Response(AnnouncementSerializer(announcement).data, status=201)

    def retrieve(self, request, pk=None):
        announcement = self._get_or_error(pk)
        if announcement is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(AnnouncementSerializer(announcement).data)

    def update(self, request, pk=None):
        announcement = self._get_or_error(pk)
        if announcement is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, announcement.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()
        return Response(AnnouncementSerializer(announcement).data)

    def partial_update(self, request, pk=None):
        announcement = self._get_or_error(pk)
        if announcement is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, announcement.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        announcement = serializer.save()
        return Response(AnnouncementSerializer(announcement).data)

    def destroy(self, request, pk=None):
        announcement = self._get_or_error(pk)
        if announcement is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, announcement.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        announcement.delete()
        return Response(status=204)

    @action(detail=False, methods=["get"], url_path="my-count")
    def my_count(self, request):
        user = request.user
        role = user.get("role")
        if role == "teacher":
            courses = Course.objects(teacher_id=user.get("sub"))
        elif role == "admin":
            courses = Course.objects.all()
        else:
            return Response({"detail": "Forbidden."}, status=403)
        course_ids = [str(c.id) for c in courses]
        if not course_ids:
            return Response({"count": 0})
        count = Announcement.objects(course_id__in=course_ids).count()
        return Response({"count": count})


class InternalAnnouncementView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def list_by_course(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
            return Response([])
        announcements = Announcement.objects(course_id=course_id).order_by("-created_at")
        serializer = AnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        if not re.match(r"^[0-9a-f]{24}$", pk, re.I):
            return Response({"exists": False})
        try:
            announcement = Announcement.objects.get(id=pk)
        except Exception:
            return Response({"exists": False})
        return Response({
            "id": str(announcement.id),
            "course_id": announcement.course_id,
            "title": announcement.title,
            "body": announcement.body,
            "created_by": announcement.created_by,
            "created_at": announcement.created_at.isoformat(),
            "exists": True,
        })
