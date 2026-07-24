import os
import sys
import mimetypes
from pathlib import Path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from fastapi_service.main import app as fastapi_app

uploads_root = Path(__file__).resolve().parent.parent / "backend" / "uploads"


async def app(scope, receive, send):
    if scope["type"] != "http":
        await fastapi_app(scope, receive, send)
        return

    path = scope["path"]

    if path.startswith("/uploads"):
        file_path = uploads_root / path.lstrip("/uploads").lstrip("/")
        if file_path.is_file():
            content = file_path.read_bytes()
            mime = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"content-type", mime.encode()),
                    (b"cache-control", b"public, max-age=3600"),
                ],
            })
            await send({"type": "http.response.body", "body": content})
            return
        await send({"type": "http.response.start", "status": 404, "headers": []})
        await send({"type": "http.response.body", "body": b"Not found"})
        return

    if path.startswith("/api/v1/core"):
        scope["path"] = path[len("/api/v1/core"):]
    await fastapi_app(scope, receive, send)
