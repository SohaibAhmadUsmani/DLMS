import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_service.main import app as fastapi_app

main_app = FastAPI(title="DLMS API Gateway")

main_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

main_app.mount("/api/v1/core", fastapi_app)

app = main_app
