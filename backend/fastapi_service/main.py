import logging
import os
import traceback
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError
from fastapi_service.core.database import (
    close_db,
    connect_db,
    get_database,
)
from fastapi_service.core.exceptions import AppException
from fastapi_service.routers.auth import router as auth_router
from fastapi_service.routers.enrollments import router as enrollments_router
from fastapi_service.routers.internal import router as internal_router
from fastapi_service.routers.quizzes import router as quizzes_router
from fastapi_service.routers.materials import router as materials_router
from fastapi_service.routers.assignment_submissions import router as assignment_submissions_router
from fastapi_service.routers.attendance import router as attendance_router
from fastapi_service.routers.notifications import router as notifications_router
from fastapi_service.routers.messages import router as messages_router
from fastapi_service.routers.classes import router as classes_router
from fastapi_service.routers.courses import router as courses_router
from fastapi_service.routers.announcements import router as announcements_router
from fastapi_service.routers.events import router as events_router
from fastapi_service.routers.fees import router as fees_router
from fastapi_service.routers.leave_requests import router as leave_requests_router
from fastapi_service.routers.payments import router as payments_router
from fastapi_service.routers.certificates import router as certificates_router
from fastapi_service.routers.dashboard import router as dashboard_router
from shared.internal_client import InternalCallError

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="DLMS Core API", version="0.1.0", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(status_code=400, content={"detail": exc.errors()})


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(InternalCallError)
async def internal_call_error_handler(request: Request, exc: InternalCallError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth_router)
app.include_router(enrollments_router)
app.include_router(internal_router)
app.include_router(quizzes_router)
app.include_router(materials_router)
app.include_router(assignment_submissions_router)
app.include_router(attendance_router)
app.include_router(notifications_router)
app.include_router(messages_router)
app.include_router(classes_router)
app.include_router(courses_router)
app.include_router(announcements_router)
app.include_router(events_router)
app.include_router(fees_router)
app.include_router(leave_requests_router)
app.include_router(payments_router)
app.include_router(certificates_router)
app.include_router(dashboard_router)


@app.get("/health")
async def health(db: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        await db.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception:
        return {"status": "ok", "db": "disconnected"}
