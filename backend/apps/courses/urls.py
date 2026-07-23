from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.courses.views import CourseCoverView, CourseViewSet, SectionViewSet

router = DefaultRouter()
router.register(r"", CourseViewSet, basename="course")

urlpatterns = [
    *router.urls,
    path("sections/<slug:pk>/", SectionViewSet.as_view({
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    })),
    path("<slug:pk>/cover/", CourseCoverView.as_view()),
]
