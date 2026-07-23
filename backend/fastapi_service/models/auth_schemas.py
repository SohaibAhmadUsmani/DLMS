from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("student", "teacher"):
            raise ValueError("Role must be 'student' or 'teacher'")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterAdminRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("admin", "student", "teacher"):
            raise ValueError("Role must be 'admin', 'student', or 'teacher'")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class EducationEntry(BaseModel):
    degree: str
    university: str
    from_date: str
    to_date: str


class ExperienceEntry(BaseModel):
    company: str
    position: str
    from_date: str
    to_date: Optional[str] = None
    is_current: bool = False


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    profile_picture_url: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    bio: Optional[str] = None
    cnic: Optional[str] = None
    education: list[EducationEntry] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    bio: Optional[str] = None
    cnic: Optional[str] = None
    education: Optional[list[EducationEntry]] = None
    experience: Optional[list[ExperienceEntry]] = None

    @field_validator("cnic")
    @classmethod
    def validate_cnic(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip():
            import re
            cleaned = v.strip()
            if not re.match(r'^\d{5}-\d{7}-\d{1}$', cleaned):
                raise ValueError("CNIC must be in format XXXXX-XXXXXXX-X (e.g., 12345-1234567-1)")
            return cleaned
        return v


class UpdateUserStatusRequest(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("admin", "teacher", "student"):
            raise ValueError("Role must be 'admin', 'teacher', or 'student'")
        return v
