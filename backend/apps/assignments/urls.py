from django.urls import path

from apps.assignments.views import AssignmentViewSet

urlpatterns = [
    path("my/", AssignmentViewSet.as_view({
        "get": "my_assignments",
    })),
    path("<slug:pk>/", AssignmentViewSet.as_view({
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    })),
    path("<slug:pk>/submissions/", AssignmentViewSet.as_view({
        "get": "submissions",
    })),
    path("<slug:pk>/upload-material/", AssignmentViewSet.as_view({
        "post": "upload_material",
    })),
    path("submissions/<slug:submission_id>/grade/", AssignmentViewSet.as_view({
        "patch": "grade_submission",
    })),
]