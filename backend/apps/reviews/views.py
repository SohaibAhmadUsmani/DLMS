import re

from asgiref.sync import async_to_sync
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.common.documents import Review, Course
from apps.common.jwt_auth import require_role
from apps.reviews.serializers import ReviewSerializer
from shared.internal_client import InternalCallError, call_core


class ReviewViewSet(viewsets.ViewSet):
    lookup_value_regex = "[^/]+"

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        if self.action == "create":
            return [IsAuthenticated(), require_role("student")()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def _get_or_error(self, pk):
        try:
            return Review.objects.get(id=pk)
        except Exception:
            return None

    def list(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id or "", re.I):
            return Response({"detail": "Not found."}, status=404)
        reviews = Review.objects(course_id=course_id).order_by("-created_at")
        try:
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        except Exception:
            return Response({"detail": "Database error."}, status=500)

    def create(self, request, course_id=None):
        user = request.user
        if not course_id or not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
            return Response({"detail": "Invalid course_id."}, status=400)
        try:
            result = async_to_sync(call_core)(
                "GET", f"/internal/enrollments/check/{user.get('sub')}/{course_id}"
            )
            if not result.get("enrolled", False):
                return Response({"detail": "You are not enrolled in this course."}, status=403)
        except InternalCallError as e:
            return Response({"detail": str(e)}, status=502)
        existing = Review.objects(course_id=course_id, student_id=user.get("sub")).first()
        if existing:
            return Response({"detail": "You have already reviewed this course."}, status=409)
        serializer = ReviewSerializer(
            data={**request.data, "course_id": course_id, "student_id": user.get("sub")}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(ReviewSerializer(review).data, status=201)

    def retrieve(self, request, pk=None):
        review = self._get_or_error(pk)
        if review is None:
            return Response({"detail": "Not found."}, status=404)
        return Response(ReviewSerializer(review).data)

    def update(self, request, pk=None):
        review = self._get_or_error(pk)
        if review is None:
            return Response({"detail": "Not found."}, status=404)
        if review.student_id != request.user.get("sub"):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = ReviewSerializer(review, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(ReviewSerializer(review).data)

    def partial_update(self, request, pk=None):
        review = self._get_or_error(pk)
        if review is None:
            return Response({"detail": "Not found."}, status=404)
        if review.student_id != request.user.get("sub"):
            return Response({"detail": "Forbidden."}, status=403)
        serializer = ReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(ReviewSerializer(review).data)

    def destroy(self, request, pk=None):
        review = self._get_or_error(pk)
        if review is None:
            return Response({"detail": "Not found."}, status=404)
        user = request.user
        if review.student_id != user.get("sub") and user.get("role") != "admin":
            return Response({"detail": "Forbidden."}, status=403)
        review.delete()
        return Response(status=204)


class InternalReviewView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def list_by_course(self, request, course_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
            return Response([])
        reviews = Review.objects(course_id=course_id).order_by("-created_at")
        try:
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        except Exception:
            return Response([])

    def get_student_review(self, request, course_id=None, student_id=None):
        if not re.match(r"^[0-9a-f]{24}$", course_id, re.I):
            return Response({"exists": False})
        review = Review.objects(course_id=course_id, student_id=student_id).first()
        if not review:
            return Response({"exists": False})
        return Response({
            "id": str(review.id),
            "course_id": review.course_id,
            "student_id": review.student_id,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat(),
            "exists": True,
        })
