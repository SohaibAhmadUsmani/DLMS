"""
Test environment for the entire backend — both core (FastAPI) and console (Django).

A single ASGI transport client (httpx.AsyncClient + ASGITransport) against the
combined Starlette application from config/asgi.py reaches ALL endpoints:
  /api/v1/core/*    → FastAPI
  /api/v1/console/* → Django
  /internal/*       → Django (console)
  /health           → FastAPI

Test DB isolation: overrides MONGO_DB_NAME → lms_test; uses TEST_MONGO_URI
(falls back to MONGO_URI) for the Motor connection.
"""

import os

# ── Override env BEFORE any Django/FastAPI imports ─────────────────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["MONGO_DB_NAME"] = "lms_test"

import django
django.setup()

# django.setup() triggers settings.py which loads .env via load_dotenv().
from datetime import datetime

import pytest
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

from config.asgi import application
from django.conf import settings
from shared.security import create_access_token, hash_password

# django.setup() triggered settings.py which loaded .env via load_dotenv().
# Now MONGO_URI is available — set TEST_MONGO_URI to match (user can still
# override by setting TEST_MONGO_URI in their environment before pytest).
os.environ.setdefault("TEST_MONGO_URI", settings.MONGO_URI)

# ── Database ────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def db():
    """Motor database handle. Returns None if MongoDB is unreachable.
    
    This is for *assertions* in tests, not for route injection.
    Routes use fastapi_service.core.database.get_database() which creates
    its own Motor client. When MongoDB is unavailable, DB-dependent tests
    should pytest.skip() using `if db is None: pytest.skip(...)`.
    """
    mongo_uri = os.environ["TEST_MONGO_URI"]
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
    try:
        loop.run_until_complete(client.admin.command("ping"))
    except Exception:
        client.close()
        loop.close()
        asyncio.set_event_loop(None)
        yield None
        return
    database = client[settings.MONGO_DB_NAME]
    yield database
    client.close()
    loop.close()
    asyncio.set_event_loop(None)


@pytest.fixture(scope="session")
def clean_db(db):
    """Drop all documents from every collection at session start.
    Only runs if MongoDB is available (db is not None).
    """
    if db is not None:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_drop_all(db))
        loop.close()
        asyncio.set_event_loop(None)


async def _drop_all(db):
    for name in await db.list_collection_names():
        await db[name].delete_many({})


# ── Reset core DB client ────────────────────────────────────────────

@pytest.fixture(autouse=True)
def _reset_core_db():
    """Reset Motor client between tests to avoid 'Event loop is closed'.

    The module-level Motor singleton (fastapi_service.core.database.client)
    gets bound to the test-function event loop via get_database(). When
    the loop closes after the test, the stale client causes RuntimeError.
    Resetting to None forces get_database() to create a fresh client on
    the next test's event loop.
    """
    import fastapi_service.core.database as coredb
    coredb.client = None


# ── HTTP client ─────────────────────────────────────────────────────

@pytest.fixture
async def async_client():
    """ASGI transport client against the combined app.

    Both /api/v1/core and /api/v1/console paths work through this one client.
    """
    transport = ASGITransport(app=application)
    async with AsyncClient(
        transport=transport, base_url="http://test", timeout=10
    ) as client:
        yield client


# ── Auth token fixtures (pre-generated, no DB hit) ──────────────────

@pytest.fixture(scope="session")
def admin_token():
    return create_access_token(user_id="admin_fixture", role="admin")


@pytest.fixture(scope="session")
def teacher_token():
    return create_access_token(user_id="teacher_fixture", role="teacher")


@pytest.fixture(scope="session")
def student_token():
    return create_access_token(user_id="student_fixture", role="student")


@pytest.fixture
def headers(admin_token, teacher_token, student_token):
    """Helper: headers('admin') → {'Authorization': 'Bearer <token>'}."""
    _tokens = {
        "admin": admin_token,
        "teacher": teacher_token,
        "student": student_token,
    }
    def _make(role: str):
        return {"Authorization": f"Bearer {_tokens[role]}"}
    return _make


# ── User factory (requires MongoDB) ─────────────────────────────────

@pytest.fixture
async def registered_user(db):
    """Factory fixture: creates a user in MongoDB, returns {id, email, role, token}.
    Uses a fresh Motor client to avoid event-loop conflicts with the session-scoped db.
    Skips the test if MongoDB is not reachable.

    Usage:
        user = await registered_user("a@b.com", "secret", "student")
        # user["token"] is a valid JWT
    """
    if db is None:
        pytest.skip("MongoDB not reachable")
    mongo_uri = os.environ["TEST_MONGO_URI"]
    async def _make(email: str, password: str, role: str) -> dict:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
        try:
            mdb = client[settings.MONGO_DB_NAME]
            doc = {
                "name": f"Test {role}",
                "email": email,
                "password_hash": hash_password(password),
                "role": role,
                "is_active": True,
                "created_at": datetime.utcnow(),
            }
            result = await mdb["users"].insert_one(doc)
            user_id = str(result.inserted_id)
            return {
                "id": user_id,
                "email": email,
                "role": role,
                "token": create_access_token(user_id, role),
            }
        finally:
            client.close()
    return _make
