import os
import re
import uuid

from asgiref.sync import async_to_sync
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.common.documents import Course, Section
from apps.common.jwt_auth import IsRole, DjangoJWTAuthentication, require_role
from apps.courses.serializers import (
    CourseDetailSerializer,
    CourseListSerializer,
    CourseSerializer,
    SectionSerializer,
)
from shared.internal_client import InternalCallError, call_core
from django.conf import settings

IsTeacher = require_role("teacher", "admin")


def _is_owner_or_admin(user: dict, course: Course) -> bool:
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


class CourseViewSet(viewsets.ViewSet):
    lookup_value_regex = "[^/]+"

    def get_permissions(self):
        if self.action in ("list", "retrieve", "sections"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsTeacher()]

    def list(self, request):
        user = request.user
        role = user.get("role")
        if role == "admin":
            courses = Course.objects.all().order_by("-created_at")
        elif role == "teacher":
            courses = Course.objects(teacher_id=user.get("sub")).order_by("-created_at")
        else:
            courses = Course.objects(is_published=True).order_by("-created_at")
        serializer = CourseListSerializer(courses, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        user = request.user
        if user.get("role") == "student" and not course.is_published:
            return Response({"detail": "Not found."}, status=404)
        serializer = CourseDetailSerializer(course)
        return Response(serializer.data)

    def create(self, request):
        user = request.user
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if user.get("role") == "admin" and 'teacher_id' in data:
            serializer = CourseSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            course = serializer.save()
        else:
            if 'teacher_id' in data:
                data.pop('teacher_id')
            serializer = CourseSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            course = serializer.save(teacher_id=user.get("sub"))
        return Response(CourseSerializer(course).data, status=201)

    def update(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if not _is_owner_or_admin(request.user, course):
            return Response({"detail": "Forbidden."}, status=403)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        is_admin = request.user.get("role") == "admin"
        if not is_admin and 'teacher_id' in data:
            data.pop('teacher_id')
        serializer = CourseSerializer(course, data=data, partial=False)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course).data)

    def partial_update(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if not _is_owner_or_admin(request.user, course):
            return Response({"detail": "Forbidden."}, status=403)
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        is_admin = request.user.get("role") == "admin"
        if not is_admin and 'teacher_id' in data:
            data.pop('teacher_id')
        serializer = CourseSerializer(course, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course).data)

    def destroy(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if not _is_owner_or_admin(request.user, course):
            return Response({"detail": "Forbidden."}, status=403)
        course.delete()
        return Response(status=204)

    @action(detail=True, methods=["get", "post"], url_path="sections")
    def sections(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if request.method == "GET":
            user = request.user
            role = user.get("role")
            if role not in ("admin", "teacher") and not _enrolled_student(user, str(course.id)):
                return Response({"detail": "Forbidden."}, status=403)
            sections = Section.objects(course_id=str(course.id)).order_by("order")
            serializer = SectionSerializer(sections, many=True)
            return Response(serializer.data)
        if not _is_owner_or_admin(request.user, course):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = SectionSerializer(data={**request.data, "course_id": str(course.id)})
        serializer.is_valid(raise_exception=True)
        section = serializer.save()
        return Response(SectionSerializer(section).data, status=201)

class SectionViewSet(viewsets.ViewSet):
    lookup_value_regex = "[^/]+"

    def get_permissions(self):
        return [IsAuthenticated(), IsTeacher()]

    def _get_section_or_error(self, pk, user):
        try:
            section = Section.objects.get(id=pk)
        except Section.DoesNotExist:
            return None, Response({"detail": "Not found."}, status=404)
        try:
            course = Course.objects.get(id=section.course_id)
        except Course.DoesNotExist:
            return None, Response({"detail": "Course not found."}, status=404)
        if not _is_owner_or_admin(user, course):
            return None, Response({"detail": "Forbidden."}, status=403)
        return section, None

    def update(self, request, pk=None):
        section, err = self._get_section_or_error(pk, request.user)
        if err:
            return err
        serializer = SectionSerializer(section, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        section = serializer.save()
        return Response(SectionSerializer(section).data)

    def partial_update(self, request, pk=None):
        section, err = self._get_section_or_error(pk, request.user)
        if err:
            return err
        serializer = SectionSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        section = serializer.save()
        return Response(SectionSerializer(section).data)

    def destroy(self, request, pk=None):
        section, err = self._get_section_or_error(pk, request.user)
        if err:
            return err
        section.delete()
        return Response(status=204)


class InternalCourseView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def retrieve(self, request, pk=None):
        if not re.match(r"^[0-9a-f]{24}$", pk, re.I):
            return Response({"exists": False})
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"exists": False})
        return Response({
            "id": str(course.id),
            "teacher_id": course.teacher_id,
            "title": course.title,
            "description": course.description,
            "credit_hours": getattr(course, 'credit_hours', 3),
            "is_published": course.is_published,
            "cover_image": course.cover_image or "",
            "what_you_will_learn": getattr(course, 'what_you_will_learn', []),
            "requirements": getattr(course, 'requirements', []),
            "total_duration": getattr(course, 'total_duration', "0"),
            "difficulty_level": getattr(course, 'difficulty_level', "beginner"),
            "price": getattr(course, 'price', 0.0),
            "students_enrolled": getattr(course, 'students_enrolled', 0),
            "exists": True,
        })

    def partial_update(self, request, pk=None):
        if not re.match(r"^[0-9a-f]{24}$", pk, re.I):
            return Response({"exists": False}, status=404)
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"exists": False}, status=404)
        for key, value in request.data.items():
            if hasattr(course, key):
                setattr(course, key, value)
        course.save()
        return Response({
            "id": str(course.id),
            "price": getattr(course, 'price', 0.0),
            "students_enrolled": getattr(course, 'students_enrolled', 0),
            "exists": True,
        })


class InternalSectionView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def retrieve(self, request, pk=None):
        if not re.match(r"^[0-9a-f]{24}$", pk, re.I):
            return Response({"exists": False})
        try:
            section = Section.objects.get(id=pk)
        except Section.DoesNotExist:
            return Response({"exists": False})
        return Response({
            "id": str(section.id),
            "course_id": section.course_id,
            "title": section.title,
            "exists": True,
        })


class CourseCoverView(APIView):
    authentication_classes = [DjangoJWTAuthentication]
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request, pk=None):
        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if not _is_owner_or_admin(request.user, course):
            return Response({"detail": "Forbidden."}, status=403)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=400)
        ext = os.path.splitext(file.name)[1] or ".jpg"
        filename = f"course_covers/{course.id}_{uuid.uuid4().hex}{ext}"
        upload_dir = os.path.join(settings.BASE_DIR, "uploads", "course_covers")
        os.makedirs(upload_dir, exist_ok=True)
        dest = os.path.join(upload_dir, os.path.basename(filename))
        with open(dest, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)
        url = f"/uploads/{filename.replace(os.sep, '/')}"
        course.cover_image = url
        course.save()
        return Response({"cover_image": url})
