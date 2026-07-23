from django.urls import path

from apps.admin_console.views import (
    AdminCourseListView,
    SettingsView,
    UserDeleteView,
    UserListView,
    UserStatusView,
)

urlpatterns = [
    path("users/", UserListView.as_view(), name="admin-users-list"),
    path("users/<slug:pk>/status/", UserStatusView.as_view(), name="admin-users-status"),
    path("users/<slug:pk>/", UserDeleteView.as_view(), name="admin-users-delete"),
    path("courses/", AdminCourseListView.as_view(), name="admin-courses-list"),
    path("settings/", SettingsView.as_view(), name="admin-settings"),
]
