from datetime import datetime
from typing import Annotated, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class Material(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    section_id: str
    title: str
    file_url: str = ""
    file_type: str  # "video" | "youtube" | "reading" | "pdf" | "document" | "other"
    content: str = ""
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
