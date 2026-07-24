import os
import re
import shutil
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Form, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase

from fastapi_service.core.database import get_database
from fastapi_service.core.exceptions import BadRequestError, ForbiddenError, NotFoundError, ConflictError
from fastapi_service.core.security import get_current_user, require_role
from fastapi_service.models.quiz_schemas import (
    AnswerSubmit,
    AttemptAnswerResponse,
    AttemptDetailResponse,
    AttemptDetailResultResponse,
    AttemptListResponse,
    AttemptStartResponse,
    AttemptSubmitRequest,
    OptionPublic,
    QuestionCreate,
    QuestionPublicResponse,
    QuestionResponse,
    QuestionUpdate,
    QuizCreate,
    QuizDetailResponse,
    QuizResponse,
    QuizResultsResponse,
    QuizSubmitResponse,
    QuizUpdate,
    StudentQuizResponse,
    AIGenerateResponse,
)
from services.quiz_evaluator import evaluate_quiz
from fastapi_service.services.ai_content_engine import AIContentEngine
from shared.internal_client import InternalCallError, call_console

logger = logging.getLogger(__name__)

router = APIRouter(tags=["quizzes"])

QUIZZES = "quizzes"
QUESTIONS = "questions"
ATTEMPTS = "quiz_attempts"
ANSWERS = "quiz_attempt_answers"
COLLECTION = QUIZZES
QUESTION_IMAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "question_images")


def _as_oid(v: str) -> ObjectId | None:
    if not re.match(r"^[0-9a-f]{24}$", v, re.I):
        return None
    return ObjectId(v)


def _strip_is_correct(options: list[dict]) -> list[dict]:
    return [{"option_text": o["option_text"]} for o in options]


def _quiz_to_response(doc: dict) -> QuizResponse:
    return QuizResponse(
        id=str(doc["_id"]),
        course_id=doc["course_id"],
        title=doc["title"],
        time_limit_minutes=doc["time_limit_minutes"],
        total_marks=doc.get("total_marks", 0),
        created_by=doc["created_by"],
        allow_multiple_attempts=doc.get("allow_multiple_attempts", False),
        due_date=doc.get("due_date"),
        question_count=doc.get("question_count", 0),
        difficulty_level=doc.get("difficulty_level", "medium"),
    )


# ─── Teacher: Quiz CRUD ────────────────────────────────────────────

@router.post("/courses/{course_id}/quizzes", status_code=201)
async def create_quiz(
    course_id: str,
    body: QuizCreate,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizResponse:
    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise
    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if payload.get("role") != "admin" and course.get("teacher_id") != payload["sub"]:
        raise ForbiddenError("Forbidden")
    doc = {
        "course_id": course_id,
        "title": body.title,
        "time_limit_minutes": body.time_limit_minutes,
        "allow_multiple_attempts": body.allow_multiple_attempts,
        "due_date": body.due_date,
        "difficulty_level": body.difficulty_level,
        "total_marks": 0,
        "question_count": 0,
        "created_by": payload["sub"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db[QUIZZES].insert_one(doc)
    return _quiz_to_response({**doc, "_id": result.inserted_id})


@router.get("/courses/{course_id}/quizzes")
async def list_course_quizzes(
    course_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[QuizResponse]:
    cursor = db[QUIZZES].find({"course_id": course_id}).sort("created_at", -1)
    items = [_quiz_to_response(doc) async for doc in cursor]
    return items


@router.put("/quizzes/{quiz_id}")
async def update_quiz(
    quiz_id: str,
    body: QuizUpdate,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizResponse:
    update = {}
    for field in ("title", "time_limit_minutes", "allow_multiple_attempts", "due_date", "difficulty_level"):
        if getattr(body, field, None) is not None:
            update[field] = getattr(body, field)
    if not update:
        raise BadRequestError("No fields to update")
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    result = await db[QUIZZES].find_one_and_update(
        {"_id": oid},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise NotFoundError("Quiz not found")
    return _quiz_to_response(result)


@router.delete("/quizzes/{quiz_id}", status_code=204)
async def delete_quiz(
    quiz_id: str,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    result = await db[QUIZZES].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise NotFoundError("Quiz not found")
    await db[QUESTIONS].delete_many({"quiz_id": quiz_id})
    await db[ATTEMPTS].delete_many({"quiz_id": quiz_id})


@router.get("/quizzes/{quiz_id}")
async def get_quiz(
    quiz_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizDetailResponse:
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    quiz = await db[QUIZZES].find_one({"_id": oid})
    if not quiz:
        raise NotFoundError("Quiz not found")
    is_student = payload.get("role") == "student"
    questions = []
    async for q in db[QUESTIONS].find({"quiz_id": quiz_id}).sort("_id", 1):
        opts = q["options"]
        if is_student:
            opts = _strip_is_correct(opts)
        questions.append(QuestionResponse(
            id=str(q["_id"]),
            quiz_id=q["quiz_id"],
            question_text=q["question_text"],
            options=opts,
            marks=q["marks"],
        ))
    return QuizDetailResponse(
        id=str(quiz["_id"]),
        course_id=quiz["course_id"],
        title=quiz["title"],
        time_limit_minutes=quiz["time_limit_minutes"],
        total_marks=quiz.get("total_marks", 0),
        created_by=quiz["created_by"],
        allow_multiple_attempts=quiz.get("allow_multiple_attempts", False),
        due_date=quiz.get("due_date"),
        question_count=quiz.get("question_count", 0),
        questions=questions,
    )


# ─── Helpers ───────────────────────────────────────────────────────

async def _clear_quiz_attempts(quiz_id: str, db: AsyncIOMotorDatabase):
    """Delete all attempts and answers for a quiz (used when questions change)."""
    attempt_ids = []
    async for a in db[ATTEMPTS].find({"quiz_id": quiz_id}, {"_id": 1}):
        attempt_ids.append(str(a["_id"]))
    if attempt_ids:
        await db[ANSWERS].delete_many({"attempt_id": {"$in": attempt_ids}})
        await db[ATTEMPTS].delete_many({"quiz_id": quiz_id})

# ─── Teacher: Questions ──────────────────────────────────────────────

@router.post("/quizzes/{quiz_id}/questions", status_code=201)
async def add_question(
    quiz_id: str,
    body: QuestionCreate,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionResponse:
    if len(body.options) < 2:
        raise BadRequestError("At least 2 options are required")
    correct_count = sum(1 for o in body.options if o.is_correct)
    if correct_count != 1:
        raise BadRequestError("Exactly one option must be marked as correct")
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    quiz = await db[QUIZZES].find_one({"_id": oid})
    if not quiz:
        raise NotFoundError("Quiz not found")
    doc = {
        "quiz_id": quiz_id,
        "question_text": body.question_text,
        "options": [o.model_dump() for o in body.options],
        "marks": body.marks,
        "image_url": body.image_url or "",
    }
    result = await db[QUESTIONS].insert_one(doc)
    await db[QUIZZES].update_one(
        {"_id": oid},
        {"$inc": {"total_marks": body.marks, "question_count": 1}},
    )
    await _clear_quiz_attempts(quiz_id, db)
    return QuestionResponse(id=str(result.inserted_id), **doc)


@router.put("/questions/{question_id}")
async def update_question(
    question_id: str,
    body: QuestionUpdate,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuestionResponse:
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "options" in update:
        if len(body.options) < 2:
            raise BadRequestError("At least 2 options are required")
        correct_count = sum(1 for o in body.options if o.is_correct)
        if correct_count != 1:
            raise BadRequestError("Exactly one option must be marked as correct")
        update["options"] = [o.model_dump() for o in body.options]
    if not update:
        raise BadRequestError("No fields to update")
    oid = _as_oid(question_id)
    if not oid:
        raise NotFoundError("Question not found")
    result = await db[QUESTIONS].find_one_and_update(
        {"_id": oid},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise NotFoundError("Question not found")
    await _clear_quiz_attempts(result["quiz_id"], db)
    return QuestionResponse(
        id=str(result["_id"]),
        quiz_id=result["quiz_id"],
        question_text=result["question_text"],
        options=result["options"],
        marks=result["marks"],
    )


@router.delete("/questions/{question_id}", status_code=204)
async def delete_question(
    question_id: str,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    oid = _as_oid(question_id)
    if not oid:
        raise NotFoundError("Question not found")
    question = await db[QUESTIONS].find_one_and_delete({"_id": oid})
    if not question:
        raise NotFoundError("Question not found")
    quiz_oid = _as_oid(question["quiz_id"])
    if quiz_oid:
        await db[QUIZZES].update_one(
            {"_id": quiz_oid},
            {"$inc": {"total_marks": -question["marks"], "question_count": -1}},
        )
    await _clear_quiz_attempts(question["quiz_id"], db)


@router.post("/questions/{question_id}/image")
async def upload_question_image(
    question_id: str,
    file: UploadFile = File(...),
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    oid = _as_oid(question_id)
    if not oid:
        raise NotFoundError("Question not found")
    question = await db[QUESTIONS].find_one({"_id": oid})
    if not question:
        raise NotFoundError("Question not found")
    os.makedirs(QUESTION_IMAGE_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "jpg")[1]
    saved_name = f"q_{question_id}{ext}"
    saved_path = os.path.join(QUESTION_IMAGE_DIR, saved_name)
    try:
        with open(saved_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except OSError:
        raise BadRequestError("File save failed")
    url = f"/uploads/question_images/{saved_name}"
    await db[QUESTIONS].update_one({"_id": oid}, {"$set": {"image_url": url}})
    return {"image_url": url}


@router.get("/quizzes/my/count")
async def my_quiz_count(
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    count = await db[QUIZZES].count_documents({"created_by": payload["sub"]})
    return {"count": count}


# ─── Attempt Lifecycle ─────────────────────────────────────────────

async def _can_attempt(
    db: AsyncIOMotorDatabase,
    quiz_id: str,
    student_id: str,
    allow_multiple: bool,
) -> tuple[bool, str | None]:
    existing = await db[ATTEMPTS].find(
        {"quiz_id": quiz_id, "student_id": student_id}
    ).sort("attempt_number", -1).to_list(length=1)
    if not existing:
        return True, None
    last = existing[0]
    if last["status"] == "in_progress":
        return False, str(last["_id"])
    if not allow_multiple:
        return False, None
    return True, None


@router.post("/quizzes/{quiz_id}/start", status_code=201)
async def start_quiz_attempt(
    quiz_id: str,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AttemptStartResponse:
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    quiz = await db[QUIZZES].find_one({"_id": oid})
    if not quiz:
        raise NotFoundError("Quiz not found")
    allow_multiple = quiz.get("allow_multiple_attempts", False)
    can, existing_id = await _can_attempt(db, quiz_id, payload["sub"], allow_multiple)
    if not can and existing_id:
        raise ConflictError("You already have an active attempt for this quiz")
    if not can and not existing_id:
        raise ConflictError("You have already completed this quiz and multiple attempts are not allowed")

    last_num = await db[ATTEMPTS].count_documents(
        {"quiz_id": quiz_id, "student_id": payload["sub"]}
    )
    doc = {
        "quiz_id": quiz_id,
        "student_id": payload["sub"],
        "started_at": datetime.now(timezone.utc),
        "submitted_at": None,
        "score": None,
        "score_pct": None,
        "status": "in_progress",
        "attempt_number": last_num + 1,
        "duration_seconds": None,
    }
    result = await db[ATTEMPTS].insert_one(doc)
    return AttemptStartResponse(
        id=str(result.inserted_id),
        quiz_id=quiz_id,
        student_id=payload["sub"],
        started_at=doc["started_at"],
        status=doc["status"],
        attempt_number=doc["attempt_number"],
    )


@router.get("/quizzes/{quiz_id}/attempt/{attempt_id}")
async def get_attempt_questions(
    quiz_id: str,
    attempt_id: str,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AttemptDetailResponse:
    oid = _as_oid(attempt_id)
    if not oid:
        raise NotFoundError("Attempt not found")
    attempt = await db[ATTEMPTS].find_one({"_id": oid, "quiz_id": quiz_id, "student_id": payload["sub"]})
    if not attempt:
        raise NotFoundError("Attempt not found")

    question_responses = []
    async for q in db[QUESTIONS].find({"quiz_id": quiz_id}).sort("_id", 1):
        question_responses.append(QuestionPublicResponse(
            id=str(q["_id"]),
            question_text=q["question_text"],
            options=[OptionPublic(option_text=o["option_text"]) for o in q["options"]],
            marks=q["marks"],
            image_url=q.get("image_url") or None,
        ))

    q_responses = []
    async for a in db[ANSWERS].find({"attempt_id": attempt_id}):
        q_responses.append(AttemptAnswerResponse(
            id=str(a["_id"]),
            attempt_id=a["attempt_id"],
            question_id=a["question_id"],
            selected_option=a["selected_option"],
            is_correct=a["is_correct"],
        ))

    return AttemptDetailResponse(
        id=str(attempt["_id"]),
        quiz_id=attempt["quiz_id"],
        student_id=attempt["student_id"],
        started_at=attempt["started_at"],
        submitted_at=attempt.get("submitted_at"),
        score=attempt.get("score"),
        score_pct=attempt.get("score_pct"),
        status=attempt["status"],
        attempt_number=attempt.get("attempt_number", 1),
        duration_seconds=attempt.get("duration_seconds"),
        answers=q_responses,
        questions=question_responses,
    )


@router.post("/attempts/{attempt_id}/submit")
async def submit_attempt(
    attempt_id: str,
    body: AttemptSubmitRequest,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizSubmitResponse:
    oid = _as_oid(attempt_id)
    if not oid:
        raise NotFoundError("Attempt not found")
    attempt = await db[ATTEMPTS].find_one({"_id": oid, "student_id": payload["sub"]})
    if not attempt:
        raise NotFoundError("Attempt not found")
    if attempt["status"] != "in_progress":
        raise BadRequestError("This attempt has already been submitted")

    quiz_id = attempt["quiz_id"]
    started_at = attempt["started_at"].replace(tzinfo=timezone.utc)
    duration = int((datetime.now(timezone.utc) - started_at).total_seconds())

    questions = []
    async for q in db[QUESTIONS].find({"quiz_id": quiz_id}).sort("_id", 1):
        questions.append(q)

    answers_data = [{"question_id": a.question_id, "selected_option": a.selected_option} for a in body.answers]
    result = evaluate_quiz(questions, answers_data)

    score = result["earned_marks"]
    score_pct = result["score_pct"]
    total_marks = result["total_marks"]

    await db[ANSWERS].delete_many({"attempt_id": attempt_id})
    correct_count = 0
    for ev in result["answers"]:
        if ev["is_correct"]:
            correct_count += 1
        await db[ANSWERS].insert_one({
            "attempt_id": attempt_id,
            "question_id": ev["question_id"],
            "selected_option": ev["selected_option"],
            "is_correct": ev["is_correct"],
        })

    await db[ATTEMPTS].update_one(
        {"_id": oid},
        {"$set": {
            "status": "submitted",
            "score": score,
            "score_pct": score_pct,
            "submitted_at": datetime.now(timezone.utc),
            "duration_seconds": duration,
        }},
    )

    course_id = None
    quiz = await db[QUIZZES].find_one({"_id": ObjectId(quiz_id)})
    if quiz:
        course_id = quiz.get("course_id")

    if course_id:
        try:
            await issue_certificate_if_eligible(db, payload["sub"], course_id)
        except Exception:
            pass

    return QuizSubmitResponse(
        attempt_id=attempt_id,
        score=score,
        score_pct=score_pct,
        total_marks=total_marks,
        earned_marks=result["earned_marks"],
        correct_count=correct_count,
        total_questions=len(questions),
        duration_seconds=duration,
        status="submitted",
    )


@router.get("/attempts/{attempt_id}/result")
async def get_attempt_result(
    attempt_id: str,
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AttemptDetailResultResponse:
    oid = _as_oid(attempt_id)
    if not oid:
        raise NotFoundError("Attempt not found")
    attempt = await db[ATTEMPTS].find_one({"_id": oid})
    if not attempt:
        raise NotFoundError("Attempt not found")
    role = payload.get("role")
    if role != "admin" and attempt["student_id"] != payload["sub"]:
        raise NotFoundError("Attempt not found")

    answers = []
    async for a in db[ANSWERS].find({"attempt_id": attempt_id}):
        answers.append(AttemptAnswerResponse(
            id=str(a["_id"]),
            attempt_id=a["attempt_id"],
            question_id=a["question_id"],
            selected_option=a["selected_option"],
            is_correct=a["is_correct"],
        ))

    question_responses = []
    async for q in db[QUESTIONS].find({"quiz_id": attempt["quiz_id"]}).sort("_id", 1):
        question_responses.append(QuestionResponse(
            id=str(q["_id"]),
            quiz_id=q["quiz_id"],
            question_text=q["question_text"],
            options=q["options"],
            marks=q["marks"],
            image_url=q.get("image_url") or None,
        ))

    return AttemptDetailResultResponse(
        id=str(attempt["_id"]),
        quiz_id=attempt["quiz_id"],
        student_id=attempt["student_id"],
        started_at=attempt["started_at"],
        submitted_at=attempt.get("submitted_at"),
        score=attempt.get("score"),
        score_pct=attempt.get("score_pct"),
        status=attempt["status"],
        attempt_number=attempt.get("attempt_number", 1),
        duration_seconds=attempt.get("duration_seconds"),
        answers=answers,
        questions=question_responses,
    )


@router.get("/quizzes/{quiz_id}/attempts/my")
async def get_my_attempts(
    quiz_id: str,
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[AttemptListResponse]:
    cursor = db[ATTEMPTS].find({"quiz_id": quiz_id, "student_id": payload["sub"]}).sort("started_at", -1)
    results = []
    async for a in cursor:
        results.append(AttemptListResponse(
            id=str(a["_id"]),
            quiz_id=a["quiz_id"],
            student_id=a["student_id"],
            started_at=a["started_at"],
            submitted_at=a.get("submitted_at"),
            score=a.get("score"),
            score_pct=a.get("score_pct"),
            status=a["status"],
            attempt_number=a.get("attempt_number", 1),
            duration_seconds=a.get("duration_seconds"),
        ))
    return results


# ─── Teacher: Results ────────────────────────────────────────────────

@router.get("/quizzes/{quiz_id}/results")
async def quiz_results(
    quiz_id: str,
    payload: dict = Depends(require_role("teacher", "admin")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizResultsResponse:
    oid = _as_oid(quiz_id)
    if not oid:
        raise NotFoundError("Quiz not found")
    quiz = await db[QUIZZES].find_one({"_id": oid})
    if not quiz:
        raise NotFoundError("Quiz not found")

    attempts_list = []
    async for a in db[ATTEMPTS].find({"quiz_id": quiz_id}).sort("started_at", -1):
        student_name = a["student_id"]
        try:
            user = await db["users"].find_one({"_id": ObjectId(a["student_id"])})
            if user:
                student_name = user.get("name", "Unknown")
        except Exception:
            pass
        attempts_list.append(AttemptListResponse(
            id=str(a["_id"]),
            quiz_id=a["quiz_id"],
            student_id=a["student_id"],
            student_name=student_name,
            started_at=a["started_at"],
            submitted_at=a.get("submitted_at"),
            score=a.get("score"),
            score_pct=a.get("score_pct"),
            status=a["status"],
            attempt_number=a.get("attempt_number", 1),
            duration_seconds=a.get("duration_seconds"),
        ))

    return QuizResultsResponse(
        quiz=_quiz_to_response(quiz),
        attempts=attempts_list,
    )


# ─── Student: My Quizzes ───────────────────────────────────────────

@router.get("/my-quizzes")
async def get_my_quizzes(
    payload: dict = Depends(require_role("student")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[StudentQuizResponse]:
    enrollments = await db["enrollments"].find(
        {"student_id": payload["sub"], "status": "active"}
    ).to_list(length=None)
    course_ids = [e["course_id"] for e in enrollments]

    results = []
    quizzes_cursor = db[QUIZZES].find({"course_id": {"$in": course_ids}}).sort("created_at", -1)
    async for quiz in quizzes_cursor:
        qid = str(quiz["_id"])
        course_name = quiz.get("course_id", "")
        try:
            course = await call_console("GET", f"/api/v1/console/internal/courses/{quiz['course_id']}/")
            if course.get("exists"):
                course_name = course.get("title", course_name)
        except Exception:
            pass

        attempt_status = None
        attempt_id = None
        attempt_score = None
        attempts_cursor = db[ATTEMPTS].find(
            {"quiz_id": qid, "student_id": payload["sub"]}
        ).sort("started_at", -1).limit(1)
        last_attempt = await attempts_cursor.to_list(length=1)
        if last_attempt:
            la = last_attempt[0]
            if la["status"] == "in_progress":
                attempt_status = "in_progress"
                attempt_id = str(la["_id"])
            elif la["status"] == "submitted":
                attempt_status = "completed"
                attempt_id = str(la["_id"])
                attempt_score = la.get("score_pct")

        results.append(StudentQuizResponse(
            id=qid,
            course_id=quiz["course_id"],
            course_name=course_name,
            title=quiz["title"],
            time_limit_minutes=quiz["time_limit_minutes"],
            total_marks=quiz.get("total_marks", 0),
            due_date=quiz.get("due_date"),
            question_count=quiz.get("question_count", 0),
            attempt_status=attempt_status,
            attempt_id=attempt_id,
            attempt_score=attempt_score,
            difficulty_level=quiz.get("difficulty_level", "medium"),
        ))

    return results


@router.get("/my-quizzes/teacher")
async def get_my_quizzes_teacher(
    payload: dict = Depends(require_role("teacher")),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[QuizResponse]:
    cursor = db[QUIZZES].find({"created_by": payload["sub"]}).sort("created_at", -1)
    items = [_quiz_to_response(doc) async for doc in cursor]
    return items


# ─── Certificate issuance ──────────────────────────────────────────

async def issue_certificate_if_eligible(
    db: AsyncIOMotorDatabase,
    student_id: str,
    course_id: str,
) -> dict | None:
    threshold = await _fetch_passing_threshold()
    score = await _average_quiz_score(db, student_id, course_id)
    if score is None or score < threshold:
        return None
    existing = await db["certificates"].find_one(
        {"student_id": student_id, "course_id": course_id}
    )
    if existing:
        return None
    doc = {
        "student_id": student_id,
        "course_id": course_id,
        "issued_at": datetime.now(timezone.utc),
        "certificate_url": f"/certificates/{student_id}/{course_id}",
    }
    result = await db["certificates"].insert_one(doc)
    return {"id": str(result.inserted_id), **doc}


async def _fetch_passing_threshold() -> float:
    try:
        result = await call_console(
            "GET", "/api/v1/console/internal/settings/passing_threshold"
        )
        value = result.get("value")
        if value is not None:
            return float(value)
    except (InternalCallError, ValueError, TypeError) as e:
        logger.warning("Failed to fetch passing_threshold, defaulting to 50: %s", e)
    return 50.0


async def _average_quiz_score(
    db: AsyncIOMotorDatabase,
    student_id: str,
    course_id: str,
) -> float | None:
    quiz_ids = []
    async for q in db[QUIZZES].find({"course_id": course_id}, {"_id": 1}):
        quiz_ids.append(str(q["_id"]))
    if not quiz_ids:
        return None
    scores = []
    async for a in db[ATTEMPTS].find(
        {"quiz_id": {"$in": quiz_ids}, "student_id": student_id, "status": "submitted"},
        {"score": 1},
    ):
        s = a.get("score")
        if s is not None:
            scores.append(s)
    if not scores:
        return None
    return sum(scores) / len(scores)


# ─── Internal ────────────────────────────────────────────────────────

@router.get("/internal/quizzes/course/{course_id}")
async def internal_list_quizzes(
    course_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[QuizResponse]:
    cursor = db[QUIZZES].find({"course_id": course_id}).sort("title", 1)
    results = [_quiz_to_response(doc) async for doc in cursor]
    return results


@router.get("/internal/attempts/quiz/{quiz_id}")
async def internal_quiz_attempts(
    quiz_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[AttemptListResponse]:
    cursor = db[ATTEMPTS].find({"quiz_id": quiz_id}).sort("started_at", -1)
    results = []
    async for a in cursor:
        results.append(AttemptListResponse(
            id=str(a["_id"]),
            quiz_id=a["quiz_id"],
            student_id=a["student_id"],
            started_at=a["started_at"],
            submitted_at=a.get("submitted_at"),
            score=a.get("score"),
            score_pct=a.get("score_pct"),
            status=a["status"],
            attempt_number=a.get("attempt_number", 1),
            duration_seconds=a.get("duration_seconds"),
        ))
    return results


@router.post("/quizzes/generate-ai")
async def generate_ai_quiz(
    course_id: str = Form(...),
    generation_mode: str = Form(...),
    uploaded_pdf: UploadFile = File(None),
    difficulty: str = Form("medium"),
    number_of_mcqs: int = Form(5),
    number_of_true_false: int = Form(3),
    number_of_short: int = Form(2),
    payload: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AIGenerateResponse:
    require_role("teacher", "admin")(payload)

    try:
        course = await call_console("GET", f"/api/v1/console/internal/courses/{course_id}/")
    except InternalCallError:
        raise
    if not course.get("exists"):
        raise NotFoundError("Course not found")
    if payload.get("role") == "teacher" and course.get("teacher_id") != payload["sub"]:
        raise ForbiddenError("Forbidden")

    if generation_mode not in ("existing_materials", "uploaded_pdf"):
        raise BadRequestError("generation_mode must be 'existing_materials' or 'uploaded_pdf'")

    pdf_bytes = None
    if generation_mode == "uploaded_pdf":
        if not uploaded_pdf:
            raise BadRequestError("uploaded_pdf file is required when generation_mode is 'uploaded_pdf'")
        pdf_bytes = await uploaded_pdf.read()

    try:
        engine = AIContentEngine()
        result = await engine.generate_quiz(
            course_id=course_id,
            generation_mode=generation_mode,
            uploaded_pdf_bytes=pdf_bytes,
            difficulty=difficulty,
            num_mcq=number_of_mcqs,
            num_true_false=number_of_true_false,
            num_short=number_of_short,
            db=db,
        )
    except ValueError as e:
        raise BadRequestError(str(e))
    except RuntimeError as e:
        raise BadRequestError(str(e))

    return AIGenerateResponse(**result)
