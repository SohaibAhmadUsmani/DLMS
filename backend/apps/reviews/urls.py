from django.urls import path

from apps.reviews.views import ReviewViewSet

urlpatterns = [
    path("<slug:pk>/", ReviewViewSet.as_view({
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    })),
]
