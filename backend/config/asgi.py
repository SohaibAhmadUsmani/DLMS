import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
from django.core.asgi import get_asgi_application
django.setup()
django_asgi_app = get_asgi_application()
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Mount
from starlette.staticfiles import StaticFiles
from fastapi_service.main import app as fastapi_app

uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
application = Starlette(
    routes=[
        Mount("/api/v1/core", app=fastapi_app),
        Mount("/uploads", app=StaticFiles(directory=uploads_dir), name="uploads"),
        Mount("/", app=django_asgi_app),
    ],
    middleware=[
        Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]),
    ],
)
