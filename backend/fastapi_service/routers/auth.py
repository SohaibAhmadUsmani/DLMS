import os
import shutil
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from fastapi_service.core.security import get_current_user, require_role
from fastapi_service.models.auth_schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    RegisterAdminRequest,
    UpdateProfileRequest,
    UpdateUserStatusRequest,
    UserResponse,
)
from shared.security import create_access_token, hash_password, verify_password

router = APIRouter(tags=["auth"])

COLLECTION = "users"


@router.post("/auth/register", status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    existing = await db[COLLECTION].find_one({"email": body.email})
    if existing:
        raise ConflictError("Email already registered")

    user = {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(user)
    return {"id": str(result.inserted_id), "email": body.email, "role": body.role}


@router.post("/auth/admin/users", status_code=201)
async def admin_create_user(
    body: RegisterAdminRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(require_role("admin")),
) -> dict:
    existing = await db[COLLECTION].find_one({"email": body.email})
    if existing:
        raise ConflictError("Email already registered")
    user = {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db[COLLECTION].insert_one(user)
    return {"id": str(result.inserted_id), "email": body.email, "role": body.role}


@router.post("/auth/login")
async def login(
    body: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AuthResponse:
    user = await db[COLLECTION].find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise UnauthorizedError("Invalid email or password")
    if not user.get("is_active", True):
        raise UnauthorizedError("Account is deactivated")

    token = create_access_token(user_id=str(user["_id"]), role=user["role"])
    return AuthResponse(access_token=token, role=user["role"])


def _user_to_response(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
        is_active=user.get("is_active", True),
        created_at=user["created_at"],
        profile_picture_url=user.get("profile_picture_url"),
        username=user.get("username"),
        phone=user.get("phone"),
        gender=user.get("gender"),
        dob=user.get("dob"),
        bio=user.get("bio"),
        cnic=user.get("cnic"),
        education=user.get("education", []),
        experience=user.get("experience", []),
    )


@router.get("/auth/me")
async def me(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    user = await db[COLLECTION].find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise NotFoundError("User not found")
    return _user_to_response(user)


@router.patch("/auth/me")
async def update_profile(
    body: UpdateProfileRequest,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    update = {}
    if body.name is not None:
        update["name"] = body.name
    if body.email is not None:
        existing = await db[COLLECTION].find_one({"email": body.email, "_id": {"$ne": ObjectId(payload["sub"])}})
        if existing:
            raise ConflictError("Email already in use")
        update["email"] = body.email
    if body.username is not None:
        update["username"] = body.username
    if body.phone is not None:
        update["phone"] = body.phone
    if body.gender is not None:
        update["gender"] = body.gender
    if body.dob is not None:
        update["dob"] = body.dob
    if body.bio is not None:
        update["bio"] = body.bio
    if body.cnic is not None:
        update["cnic"] = body.cnic
    if body.education is not None:
        update["education"] = [e.model_dump() for e in body.education]
    if body.experience is not None:
        update["experience"] = [e.model_dump() for e in body.experience]
    if not update:
        raise BadRequestError("No fields to update")

    await db[COLLECTION].update_one(
        {"_id": ObjectId(payload["sub"])}, {"$set": update}
    )
    user = await db[COLLECTION].find_one({"_id": ObjectId(payload["sub"])})
    return _user_to_response(user)


PROFILE_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "profiles")


@router.post("/auth/me/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "jpg")[1]
    saved_name = f"profile_{payload['sub']}{ext}"
    saved_path = os.path.join(PROFILE_UPLOAD_DIR, saved_name)
    try:
        with open(saved_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except OSError:
        raise BadRequestError("File save failed")

    url = f"/uploads/profiles/{saved_name}"
    await db[COLLECTION].update_one(
        {"_id": ObjectId(payload["sub"])}, {"$set": {"profile_picture_url": url}}
    )
    return {"profile_picture_url": url}


@router.delete("/auth/me/picture")
async def delete_profile_picture(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    user = await db[COLLECTION].find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise NotFoundError("User not found")
    old_url = user.get("profile_picture_url")
    if old_url:
        old_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            old_url.lstrip("/"),
        )
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass
    await db[COLLECTION].update_one(
        {"_id": ObjectId(payload["sub"])},
        {"$unset": {"profile_picture_url": ""}},
    )
    return {"success": True}


@router.delete("/auth/me")
async def delete_account(
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    user_id = payload["sub"]
    if payload.get("role") == "admin":
        admin_count = await db[COLLECTION].count_documents({"role": "admin"})
        if admin_count <= 1:
            raise ForbiddenError("Cannot delete the last admin")
    result = await db[COLLECTION].delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise NotFoundError("User not found")
    return {"success": True}


@router.get("/internal/users")
async def list_users(
    role: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active
    skip = (page - 1) * page_size
    total = await db[COLLECTION].count_documents(query)
    cursor = db[COLLECTION].find(query).sort("created_at", -1).skip(skip).limit(page_size)
    users = []
    async for doc in cursor:
        users.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "email": doc["email"],
            "role": doc["role"],
            "is_active": doc.get("is_active", True),
            "created_at": doc["created_at"].isoformat() if hasattr(doc["created_at"], "isoformat") else str(doc["created_at"]),
        })
    return {"users": users, "total": total, "page": page, "page_size": page_size}


@router.patch("/internal/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    body: UpdateUserStatusRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    update = {}
    if body.is_active is not None:
        update["is_active"] = body.is_active
    if body.role is not None:
        update["role"] = body.role
    if not update:
        raise BadRequestError("No fields to update")

    result = await db[COLLECTION].update_one(
        {"_id": ObjectId(user_id)}, {"$set": update}
    )
    if result.matched_count == 0:
        raise NotFoundError("User not found")
    return {"modified": True}


@router.delete("/internal/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    target = await db[COLLECTION].find_one({"_id": ObjectId(user_id)})
    if not target:
        raise NotFoundError("User not found")
    if target.get("role") == "admin":
        admin_count = await db[COLLECTION].count_documents({"role": "admin"})
        if admin_count <= 1:
            raise ForbiddenError("Cannot delete the last admin")
    result = await db[COLLECTION].delete_one({"_id": ObjectId(user_id)})
    return {"deleted": True}
