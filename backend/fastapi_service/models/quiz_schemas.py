from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OptionItem(BaseModel):
    option_text: str
    is_correct: bool = False


class OptionPublic(BaseModel):
    option_text: str


class QuestionCreate(BaseModel):
    question_text: str
    options: list[OptionItem]
    marks: int = 1
    image_url: Optional[str] = None


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    options: Optional[list[OptionItem]] = None
    marks: Optional[int] = None
    image_url: Optional[str] = None


class QuestionResponse(BaseModel):
    id: str
    quiz_id: str
    question_text: str
    options: list[OptionItem]
    marks: int
    image_url: Optional[str] = None


class QuestionPublicResponse(BaseModel):
    id: str
    question_text: str
    options: list[OptionPublic]
    marks: int
    image_url: Optional[str] = None


class QuizCreate(BaseModel):
    title: str
    time_limit_minutes: int
    allow_multiple_attempts: bool = False
    due_date: Optional[datetime] = None
    difficulty_level: str = "medium"


class QuizUpdate(BaseModel):
    title: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    allow_multiple_attempts: Optional[bool] = None
    due_date: Optional[datetime] = None
    difficulty_level: Optional[str] = None


class QuizResponse(BaseModel):
    id: str
    course_id: str
    title: str
    time_limit_minutes: int
    total_marks: int
    created_by: str
    allow_multiple_attempts: bool = False
    due_date: Optional[datetime] = None
    question_count: int = 0
    difficulty_level: str = "medium"


class QuizDetailResponse(QuizResponse):
    questions: list[QuestionResponse] = []


class AttemptStartResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    started_at: datetime
    status: str
    attempt_number: int = 1


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
    score_pct: Optional[float] = None
    status: str
    attempt_number: int = 1
    duration_seconds: Optional[int] = None
    answers: list[AttemptAnswerResponse] = []
    questions: list[QuestionPublicResponse] = []


class AttemptDetailResultResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    score_pct: Optional[float] = None
    status: str
    attempt_number: int = 1
    duration_seconds: Optional[int] = None
    answers: list[AttemptAnswerResponse] = []
    questions: list[QuestionResponse] = []


class AttemptListResponse(BaseModel):
    id: str
    quiz_id: str
    student_id: str
    student_name: Optional[str] = None
    started_at: datetime
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    score_pct: Optional[float] = None
    status: str
    attempt_number: int = 1
    duration_seconds: Optional[int] = None


class QuizResultsResponse(BaseModel):
    quiz: QuizResponse
    attempts: list[AttemptListResponse]


class StudentQuizResponse(BaseModel):
    id: str
    course_id: str
    course_name: Optional[str] = None
    title: str
    time_limit_minutes: int
    total_marks: int
    due_date: Optional[datetime] = None
    question_count: int = 0
    attempt_status: Optional[str] = None
    attempt_id: Optional[str] = None
    attempt_score: Optional[float] = None
    difficulty_level: str = "medium"


class QuizSubmitResponse(BaseModel):
    attempt_id: str
    score: float
    score_pct: float
    total_marks: int
    earned_marks: float
    correct_count: int
    total_questions: int
    duration_seconds: int
    status: str


class AIGeneratedMCQ(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    explanation: str
    topic: str
    difficulty: str
    estimated_time: int = 45


class AIGeneratedTrueFalse(BaseModel):
    question: str
    answer: bool
    explanation: str
    topic: str
    difficulty: str


class AIGeneratedShort(BaseModel):
    question: str
    answer: str
    marks: int = 5
    topic: str
    difficulty: str


class AIGenerateResponse(BaseModel):
    mcqs: list[AIGeneratedMCQ] = []
    true_false: list[AIGeneratedTrueFalse] = []
    short_questions: list[AIGeneratedShort] = []
