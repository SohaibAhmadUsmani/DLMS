from django.contrib import admin
from django.urls import include, path
from apps.common.views import internal_health, internal_setting_by_key
from apps.courses.views import InternalCourseView, InternalSectionView
from apps.announcements.views import AnnouncementViewSet, InternalAnnouncementView
from apps.assignments.views import AssignmentViewSet, InternalAssignmentView
from apps.reviews.views import ReviewViewSet, InternalReviewView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("internal/health", internal_health, name="internal-health"),
    path("api/v1/console/admin/", include("apps.admin_console.urls")),
    path("api/v1/console/courses/", include("apps.courses.urls")),
    path("api/v1/console/courses/<slug:course_id>/announcements/", AnnouncementViewSet.as_view({
        "get": "list",
        "post": "create",
    })),
    path("api/v1/console/announcements/", include("apps.announcements.urls")),
    path("api/v1/console/courses/<slug:course_id>/assignments/", AssignmentViewSet.as_view({
        "get": "list",
        "post": "create",
    })),
    path("api/v1/console/assignments/", include("apps.assignments.urls")),
    path("api/v1/console/courses/<slug:course_id>/reviews/", ReviewViewSet.as_view({
        "get": "list",
        "post": "create",
    })),
    path("api/v1/console/reviews/", include("apps.reviews.urls")),
    # Internal routes — called by core domain via ASGITransport, no auth
    path("api/v1/console/internal/courses/<slug:pk>/", InternalCourseView.as_view({
        "get": "retrieve",
        "patch": "partial_update",
    })),
    path("api/v1/console/internal/sections/<slug:pk>/", InternalSectionView.as_view({
        "get": "retrieve",
    })),
    path("api/v1/console/internal/announcements/<slug:pk>/", InternalAnnouncementView.as_view({
        "get": "retrieve",
    })),
    path("api/v1/console/internal/announcements/course/<slug:course_id>/", InternalAnnouncementView.as_view({
        "get": "list_by_course",
    })),
    path("api/v1/console/internal/assignments/<slug:pk>/", InternalAssignmentView.as_view({
        "get": "retrieve",
    })),
    path("api/v1/console/internal/assignments/course/<slug:course_id>/", InternalAssignmentView.as_view({
        "get": "list_by_course",
    })),
    path("api/v1/console/internal/reviews/course/<slug:course_id>/", InternalReviewView.as_view({
        "get": "list_by_course",
    })),
    path("api/v1/console/internal/reviews/<slug:course_id>/<slug:student_id>/", InternalReviewView.as_view({
        "get": "get_student_review",
    })),
    path("api/v1/console/internal/settings/<slug:key>/", internal_setting_by_key, name="internal-setting"),
]
