from django.urls import path

from apps.announcements.views import AnnouncementViewSet

urlpatterns = [
    path("my-count/", AnnouncementViewSet.as_view({
        "get": "my_count",
    })),
    path("<slug:pk>/", AnnouncementViewSet.as_view({
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    })),
]
