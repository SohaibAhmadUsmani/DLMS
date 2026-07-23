from datetime import datetime
from typing import Annotated, Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field
from pydantic.functional_validators import BeforeValidator

PyObjectId = Annotated[str, BeforeValidator(str)]


class OptionItem(BaseModel):
    option_text: str
    is_correct: bool = False


class Quiz(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    course_id: str
    title: str
    time_limit_minutes: int
    total_marks: int = 0
    created_by: str


class Question(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    quiz_id: str
    question_text: str
    options: list[OptionItem]
    marks: int = 1
    image_url: str = ""


class QuizAttempt(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    quiz_id: str
    student_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    status: str = "in_progress"  # "in_progress" | "submitted" | "graded"


class QuizAttemptAnswer(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    attempt_id: str
    question_id: str
    selected_option: int  # index into options array
    is_correct: bool = False
