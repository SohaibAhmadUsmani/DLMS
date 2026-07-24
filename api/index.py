import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Scope, Receive, Send
from fastapi_service.main import app as fastapi_app


class StripPrefixMiddleware:
    def __init__(self, app: ASGIApp, prefix: str):
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http" and scope["path"].startswith(self.prefix):
            scope["path"] = scope["path"][len(self.prefix):]
            scope["raw_path"] = scope["path"].encode()
        await self.app(scope, receive, send)


app = StripPrefixMiddleware(fastapi_app, "/api/v1/core")
app = CORSMiddleware(app, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
