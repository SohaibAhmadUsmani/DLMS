from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from fastapi_service.core.database import PyObjectId


class Certificate(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    student_id: str
    course_id: str
    teacher_id: Optional[str] = None
    student_name: str
    course_title: str
    teacher_name: str = "Instructor"
    certificate_id: str
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"arbitrary_types_allowed": True, "populate_by_name": True}
