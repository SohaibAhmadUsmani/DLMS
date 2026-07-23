from datetime import datetime
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class AssignmentSubmission(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    assignment_id: str
    student_id: str
    file_url: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    score: Optional[float] = None
    feedback: Optional[str] = None
