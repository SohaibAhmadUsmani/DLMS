import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from fastapi_service.main import app as fastapi_app


async def app(scope, receive, send):
    if scope["type"] == "http" and scope["path"].startswith("/api/v1/core"):
        scope["path"] = scope["path"][len("/api/v1/core"):]
    await fastapi_app(scope, receive, send)
