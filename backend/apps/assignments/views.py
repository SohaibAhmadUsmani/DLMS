import os
import re
import shutil

from asgiref.sync import async_to_sync
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.common.documents import Assignment, Course
from apps.common.jwt_auth import require_role
from apps.assignments.serializers import AssignmentSerializer
from shared.internal_client import InternalCallError, call_core

MATERIAL_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "assignment_materials",
)


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


class AssignmentViewSet(viewsets.ViewSet):
    lookup_value_regex = "[^/]+"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), require_role("teacher", "admin")()]

    def _get_or_error(self, pk):
        try:
            return Assignment.objects.get(id=pk)
        except Exception:
            return None

    def list(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id or "", re.I):
            return Response({"detail": "Not found."}, status=404)
        user = request.user
        role = user.get("role")
        if role not in ("admin", "teacher") and not _enrolled_student(user, course_id):
            return Response({"detail": "Forbidden."}, status=403)
        assignments = Assignment.objects(course_id=course_id).order_by("-due_date")
        try:
            serializer = AssignmentSerializer(assignments, many=True)
            return Response(serializer.data)
        except Exception:
            return Response({"detail": "Database error."}, status=500)

    def create(self, request, course_id=None):
        if not _owns_course(request.user, course_id):
            return Response({"detail": "Forbidden."}, status=403)
        data = request.data.copy()
        if isinstance(data, dict):
            data["course_id"] = course_id
        else:
            data = {**data, "course_id": course_id}
        serializer = AssignmentSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(AssignmentSerializer(assignment).data, status=201)

    def retrieve(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(AssignmentSerializer(assignment).data)

    def update(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = AssignmentSerializer(assignment, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(AssignmentSerializer(assignment).data)

    def partial_update(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = AssignmentSerializer(assignment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        return Response(AssignmentSerializer(assignment).data)

    def destroy(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        assignment.delete()
        return Response(status=204)

    @action(detail=False, methods=["get"], url_path="my")
    def my_assignments(self, request):
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
            return Response([])
        assignments = Assignment.objects(course_id__in=course_ids).order_by("-due_date")
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="upload-material")
    def upload_material(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=400)
        os.makedirs(MATERIAL_UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.name)[1]
        saved_name = f"assignment_{pk}{ext}"
        saved_path = os.path.join(MATERIAL_UPLOAD_DIR, saved_name)
        try:
            with open(saved_path, "wb") as f:
                shutil.copyfileobj(file, f)
        except OSError:
            return Response({"detail": "File save failed."}, status=500)
        file_url = f"/uploads/assignment_materials/{saved_name}"
        assignment.material_file_path = file_url
        assignment.material_original_name = file.name
        assignment.save()
        return Response({
            "material_file_path": file_url,
            "material_original_name": file.name,
        })

    def submissions(self, request, pk=None):
        assignment = self._get_or_error(pk)
        if assignment is None:
            return Response({"detail": "Not found."}, status=404)
        if not _owns_course(request.user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        try:
            result = async_to_sync(call_core)(
                "GET", f"/internal/assignment-submissions/by-assignment/{pk}"
            )
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)
        return Response(result)

    def grade_submission(self, request, submission_id=None):
        user = request.user
        try:
            sub = async_to_sync(call_core)(
                "GET", f"/internal/assignment-submissions/{submission_id}"
            )
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)
        assignment_id = sub.get("assignment_id")
        if not assignment_id:
            return Response({"detail": "Submission missing assignment_id."}, status=400)
        assignment = self._get_or_error(assignment_id)
        if assignment is None:
            return Response({"detail": "Assignment not found."}, status=404)
        if not _owns_course(user, assignment.course_id):
            return Response({"detail": "Forbidden."}, status=403)
        score = request.data.get("score")
        feedback = request.data.get("feedback", "")
        if score is None:
            return Response({"detail": "score is required."}, status=400)
        try:
            result = async_to_sync(call_core)(
                "PATCH",
                f"/internal/assignment-submissions/{submission_id}/grade",
                json={"score": score, "feedback": feedback},
            )
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)
        return Response(result)


class InternalAssignmentView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def list_by_course(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
            return Response([])
        assignments = Assignment.objects(course_id=course_id).order_by("due_date")
        try:
            serializer = AssignmentSerializer(assignments, many=True)
            return Response(serializer.data)
        except Exception:
            return Response([])

    def retrieve(self, request, pk=None):
        if not re.match(r"^[0-9a-f]{24}$", pk, re.I):
            return Response({"exists": False})
        try:
            assignment = Assignment.objects.get(id=pk)
        except Exception:
            return Response({"exists": False})
        return Response({
            "id": str(assignment.id),
            "course_id": assignment.course_id,
            "title": assignment.title,
            "description": assignment.description or "",
            "instructions": assignment.instructions or "",
            "due_date": assignment.due_date.isoformat(),
            "max_score": assignment.max_score,
            "section": assignment.section or "",
            "assignment_no": assignment.assignment_no or "",
            "status": assignment.status or "draft",
            "material_file_path": assignment.material_file_path or "",
            "material_original_name": assignment.material_original_name or "",
            "exists": True,
        })