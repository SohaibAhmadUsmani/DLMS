import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from fastapi_service.main import app as fastapi_app
from config.asgi import django_asgi_app
from starlette.staticfiles import StaticFiles

uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'uploads')
os.makedirs(uploads_dir, exist_ok=True)
static_app = StaticFiles(directory=uploads_dir, check_dir=False)


async def app(scope, receive, send):
    if scope["type"] != "http":
        await fastapi_app(scope, receive, send)
        return

    path = scope["path"]

    if path.startswith("/uploads"):
        await static_app(scope, receive, send)
        return

    if path.startswith("/api/v1/core"):
        scope["path"] = path[len("/api/v1/core"):]
        await fastapi_app(scope, receive, send)
        return

    await django_asgi_app(scope, receive, send)
