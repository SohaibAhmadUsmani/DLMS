from datetime import datetime
from typing import Annotated, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    email: str
    password_hash: str
    role: str  # "admin" | "teacher" | "student"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
