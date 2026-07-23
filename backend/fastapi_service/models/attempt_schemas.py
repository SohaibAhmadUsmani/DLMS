from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AttemptStartResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    started_at: datetime
    status: str


class AnswerSubmit(BaseModel):
    question_id: str
    selected_option: int


class AttemptSubmitRequest(BaseModel):
    answers: list[AnswerSubmit]


class AttemptAnswerResponse(BaseModel):
    id: str
    attempt_id: str
    question_id: str
    selected_option: int
    is_correct: bool


class AttemptDetailResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    status: str
    answers: list[AttemptAnswerResponse] = []


class AttemptListResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    status: str
