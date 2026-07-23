from datetime import timedelta
import pytest
from jose import jwt as jose_jwt
from django.conf import settings
from shared.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
class TestSharedSecurity:
    def test_encode_decode_round_trip(self):
        token = create_access_token("user_abc", "admin")
        payload = decode_access_token(token)
        assert payload["sub"] == "user_abc"
        assert payload["role"] == "admin"
        assert "iat" in payload
        assert "exp" in payload

    def test_expired_token_rejected(self):
        token = create_access_token(
            "user_abc", "student", expires_delta=timedelta(seconds=-1)
        )
        with pytest.raises(InvalidTokenError):
            decode_access_token(token)

    def test_wrong_signature_rejected(self):
        bad_token = jose_jwt.encode(
            {"sub": "x", "role": "x"}, "wrong_secret", algorithm="HS256"
        )
        with pytest.raises(InvalidTokenError):
            decode_access_token(bad_token)

    def test_malformed_token_rejected(self):
        with pytest.raises(InvalidTokenError):
            decode_access_token("not.a.token")

    def test_empty_string_rejected(self):
        with pytest.raises(InvalidTokenError):
            decode_access_token("")

    def test_hash_password_and_verify(self):
        h = hash_password("my_password")
        assert h != "my_password"
        assert verify_password("my_password", h) is True
        assert verify_password("wrong_password", h) is False

    def test_default_expiry(self):
        token = create_access_token("u1", "teacher")
        payload = decode_access_token(token)
        # Default expiry is set in settings (iat/exp are Unix timestamps)
        expected_min = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        actual_min = (payload["exp"] - payload["iat"]) / 60
        assert abs(actual_min - expected_min) < 1  # within 1 minute tolerance

@pytest.mark.asyncio
class TestAuthEndpoints:
    async def test_register_creates_user(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post("/api/v1/core/auth/register", json={
            "name": "Ahmad",
            "email": "ahmad@gmail.com",
            "password": "ahmad123",
            "role": "student",
        })
        assert r.status_code == 201
        data = r.json()
        assert data["email"] == "ahmad@gmail.com"
        assert data["role"] == "student"
        assert "id" in data

    async def test_login_returns_token(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        await async_client.post("/api/v1/core/auth/register", json={
            "name": "farnaz",
            "email": "farnaz@gmail.com",
            "password": "farnaz123",
            "role": "teacher",
        })
        r = await async_client.post("/api/v1/core/auth/login", json={
            "email": "farnaz@gmail.com",
            "password": "farnaz123",
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["role"] == "teacher"

    async def test_login_wrong_password_401(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        await async_client.post("/api/v1/core/auth/register", json={
            "name": "khan",
            "email": "khan@gmail.com",
            "password": "correct",
            "role": "student",
        })
        r = await async_client.post("/api/v1/core/auth/login", json={
            "email": "khan@gmail.com",
            "password": "wrong",
        })
        assert r.status_code == 401

    async def test_login_nonexistent_email_401(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        r = await async_client.post("/api/v1/core/auth/login", json={
            "email": "noone@test.com",
            "password": "doesnotmatter",
        })
        assert r.status_code == 401

    async def test_register_duplicate_409(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        await async_client.post("/api/v1/core/auth/register", json={
            "name": "Dup",
            "email": "dup@test.com",
            "password": "secret123",
            "role": "student",
        })
        r = await async_client.post("/api/v1/core/auth/register", json={
            "name": "Dup2",
            "email": "dup@test.com",
            "password": "secret123",
            "role": "student",
        })
        assert r.status_code == 409

    async def test_me_requires_auth(self, async_client):
        r = await async_client.get("/api/v1/core/auth/me")
        assert r.status_code == 401

    async def test_me_with_valid_token(self, async_client, db, registered_user):
        if db is None:
            pytest.skip("MongoDB not reachable")
        user = await registered_user("me_test@test.com", "pass", "student")
        r = await async_client.get(
            "/api/v1/core/auth/me",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert r.status_code == 200
        assert r.json()["email"] == "me_test@test.com"
        assert r.json()["role"] == "student"


@pytest.mark.asyncio
class TestCrossDomainJWT:
   

    async def test_same_token_accepted_by_both_domains(self, async_client):
        """Prove a single JWT works across both frameworks without DB."""
        token = create_access_token(user_id="cross_proof", role="teacher")
        bearer = {"Authorization": f"Bearer {token}"}

        r = await async_client.post(
            "/api/v1/core/enrollments?course_id=507f1f77bcf86cd799439011",
            headers=bearer,
        )
        assert r.status_code == 403, (
            f"Expected 403 (role gate), got {r.status_code}: {r.text}. "
            "FastAPI rejected the JWT."
        )

        r = await async_client.get(
            "/api/v1/console/certificates/my/",
            headers=bearer,
        )
        assert r.status_code in (200, 502), (
            f"Expected 200 or 502 (auth passed), got {r.status_code}: {r.text}. "
            "DRF rejected the JWT."
        )

    async def test_invalid_token_rejected_by_both_domains(self, async_client):
        bad_bearer = {"Authorization": "Bearer this.is.not.a.valid.jwt"}

        # FastAPI
        r = await async_client.get(
            "/api/v1/core/auth/me", headers=bad_bearer,
        )
        assert r.status_code == 401

        # DRF
        r = await async_client.get(
            "/api/v1/console/certificates/my/", headers=bad_bearer,
        )
        assert r.status_code == 401

    async def test_expired_token_rejected_by_both_domains(self, async_client):
        expired = create_access_token(
            user_id="expired_user", role="student",
            expires_delta=timedelta(seconds=-1),
        )
        expired_bearer = {"Authorization": f"Bearer {expired}"}

        # FastAPI
        r = await async_client.get(
            "/api/v1/core/auth/me", headers=expired_bearer,
        )
        assert r.status_code == 401

        # DRF
        r = await async_client.get(
            "/api/v1/console/certificates/my/", headers=expired_bearer,
        )
        assert r.status_code == 401
