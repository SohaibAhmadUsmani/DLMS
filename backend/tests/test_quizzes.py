"""
Integration tests for the quiz engine — teacher CRUD + student attempt lifecycle.

Auth guards work without DB.  Full flows skip when MongoDB is unreachable.

When DB is available, call_console is patched for course ownership checks
(create_quiz), but certificate_issuer's internal call_console to the
console settings endpoint is left REAL so we verify the real internal
crossing for passing_threshold.
"""

import datetime
import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio

import os
import fastapi_service.core.database as _db_module

_VALID_OID = "507f1f77bcf86cd799439011"

_CORE = "/api/v1/core"


@pytest.fixture(autouse=True)
def _reset_core_db():
    _db_module.client = None
    yield
    _db_module.client = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def _h(role_or_user, role_arg=None):
    from shared.security import create_access_token
    if role_arg is not None:
        return {"Authorization": f"Bearer {create_access_token(role_or_user, role_arg)}"}
    return {"Authorization": f"Bearer {create_access_token(f'{role_or_user}_fixture', role_or_user)}"}


async def _fresh_db():
    """Create a function-scoped Motor client and return (db, client)."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from django.conf import settings
    mongo_uri = os.environ["TEST_MONGO_URI"]
    client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
    return client[settings.MONGO_DB_NAME], client


async def _insert_enrollment(student_id, course_id=_VALID_OID):
    from motor.motor_asyncio import AsyncIOMotorClient
    from django.conf import settings
    mongo_uri = os.environ["TEST_MONGO_URI"]
    client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=4000)
    try:
        mdb = client[settings.MONGO_DB_NAME]
        await mdb["enrollments"].insert_one({
            "student_id": student_id,
            "course_id": course_id,
            "status": "active",
        })
    finally:
        client.close()


# ============================================================================
#  Auth guards — no DB needed
# ============================================================================


class TestQuizAuthGuards:

    async def test_create_quiz_requires_auth(self, async_client):
        r = await async_client.post(f"{_CORE}/courses/{_VALID_OID}/quizzes", json={"title": "x", "time_limit_minutes": 30})
        assert r.status_code == 401

    async def test_create_quiz_student_forbidden(self, async_client):
        r = await async_client.post(
            f"{_CORE}/courses/{_VALID_OID}/quizzes",
            json={"title": "x", "time_limit_minutes": 30},
            headers=_h("student"),
        )
        assert r.status_code == 403

    async def test_add_question_requires_auth(self, async_client):
        r = await async_client.post(
            f"{_CORE}/quizzes/{_VALID_OID}/questions",
            json={"question_text": "q?", "options": [{"option_text": "a", "is_correct": True}, {"option_text": "b"}], "marks": 1},
        )
        assert r.status_code == 401

    async def test_add_question_student_forbidden(self, async_client):
        r = await async_client.post(
            f"{_CORE}/quizzes/{_VALID_OID}/questions",
            json={"question_text": "q?", "options": [{"option_text": "a", "is_correct": True}, {"option_text": "b"}], "marks": 1},
            headers=_h("student"),
        )
        assert r.status_code == 403

    async def test_update_quiz_requires_auth(self, async_client):
        r = await async_client.put(f"{_CORE}/quizzes/{_VALID_OID}", json={"title": "new"})
        assert r.status_code == 401

    async def test_delete_quiz_requires_auth(self, async_client):
        r = await async_client.delete(f"{_CORE}/quizzes/{_VALID_OID}")
        assert r.status_code == 401

    async def test_start_attempt_requires_auth(self, async_client):
        r = await async_client.post(f"{_CORE}/quizzes/{_VALID_OID}/start")
        assert r.status_code == 401

    async def test_start_attempt_teacher_forbidden(self, async_client):
        r = await async_client.post(
            f"{_CORE}/quizzes/{_VALID_OID}/start",
            headers=_h("teacher"),
        )
        assert r.status_code == 403, f"Got {r.status_code}: {r.text}"

    async def test_submit_attempt_requires_auth(self, async_client):
        r = await async_client.post(f"{_CORE}/attempts/{_VALID_OID}/submit", json={"answers": []})
        assert r.status_code == 401

    async def test_get_results_requires_auth(self, async_client):
        r = await async_client.get(f"{_CORE}/quizzes/{_VALID_OID}/results")
        assert r.status_code == 401

    async def test_list_course_quizzes_requires_auth(self, async_client):
        r = await async_client.get(f"{_CORE}/courses/{_VALID_OID}/quizzes")
        assert r.status_code == 401

    async def test_get_attempt_requires_auth(self, async_client):
        r = await async_client.get(f"{_CORE}/quizzes/{_VALID_OID}/attempt/{_VALID_OID}")
        assert r.status_code == 401

    async def test_attempt_result_requires_auth(self, async_client):
        r = await async_client.get(f"{_CORE}/attempts/{_VALID_OID}/result")
        assert r.status_code == 401


# ============================================================================
#  Teacher CRUD — needs MongoDB + mocked call_console for course ownership
# ============================================================================


class TestTeacherQuizCRUD:

    async def _create_quiz(self, async_client, teacher_id, mock_call_console, title="Quiz A", time_limit=30):
        mock_call_console.return_value = {
            "exists": True, "teacher_id": teacher_id,
        }
        return await async_client.post(
            f"{_CORE}/courses/{_VALID_OID}/quizzes",
            json={"title": title, "time_limit_minutes": time_limit},
            headers=_h("teacher"),
        )

    async def test_create_quiz(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "Quiz A"
        assert data["time_limit_minutes"] == 30
        assert data["total_marks"] == 0

    async def test_create_quiz_not_found(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": False}
            r = await async_client.post(
                f"{_CORE}/courses/{_VALID_OID}/quizzes",
                json={"title": "x", "time_limit_minutes": 30},
                headers=_h("teacher"),
            )
            assert r.status_code == 404

    async def test_create_quiz_forbidden(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "other_teacher"}
            r = await async_client.post(
                f"{_CORE}/courses/{_VALID_OID}/quizzes",
                json={"title": "x", "time_limit_minutes": 30},
                headers=_h("teacher"),
            )
            assert r.status_code == 403

    async def test_add_question(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "What is 2+2?",
                    "options": [
                        {"option_text": "3", "is_correct": False},
                        {"option_text": "4", "is_correct": True},
                        {"option_text": "5", "is_correct": False},
                    ],
                    "marks": 2,
                },
                headers=_h("teacher"),
            )
        assert r.status_code == 201
        q = r.json()
        assert q["question_text"] == "What is 2+2?"
        assert q["marks"] == 2

    async def test_add_question_validation_less_than_two_options(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "q?",
                    "options": [{"option_text": "only", "is_correct": True}],
                    "marks": 1,
                },
                headers=_h("teacher"),
            )
        assert r.status_code == 400

    async def test_add_question_validation_no_correct(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "q?",
                    "options": [
                        {"option_text": "a", "is_correct": False},
                        {"option_text": "b", "is_correct": False},
                    ],
                    "marks": 1,
                },
                headers=_h("teacher"),
            )
        assert r.status_code == 400

    async def test_add_question_validation_multiple_correct(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "q?",
                    "options": [
                        {"option_text": "a", "is_correct": True},
                        {"option_text": "b", "is_correct": True},
                    ],
                    "marks": 1,
                },
                headers=_h("teacher"),
            )
        assert r.status_code == 400

    async def test_get_quiz_with_questions(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "Q1",
                    "options": [
                        {"option_text": "a", "is_correct": True},
                        {"option_text": "b", "is_correct": False},
                    ],
                    "marks": 10,
                },
                headers=_h("teacher"),
            )
            r = await async_client.get(
                f"{_CORE}/quizzes/{quiz_id}",
                headers=_h("teacher"),
            )
        assert r.status_code == 200
        data = r.json()
        assert data["total_marks"] == 10
        assert len(data["questions"]) == 1
        assert data["questions"][0]["question_text"] == "Q1"

    async def test_update_question(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "Original",
                    "options": [
                        {"option_text": "a", "is_correct": True},
                        {"option_text": "b", "is_correct": False},
                    ],
                    "marks": 5,
                },
                headers=_h("teacher"),
            )
            qid = r.json()["id"]
            r = await async_client.put(
                f"{_CORE}/questions/{qid}",
                json={"question_text": "Updated", "marks": 10},
                headers=_h("teacher"),
            )
        assert r.status_code == 200
        assert r.json()["question_text"] == "Updated"
        assert r.json()["marks"] == 10

    async def test_update_quiz(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.put(
                f"{_CORE}/quizzes/{quiz_id}",
                json={"title": "Updated Title", "time_limit_minutes": 60},
                headers=_h("teacher"),
            )
        assert r.status_code == 200
        assert r.json()["title"] == "Updated Title"
        assert r.json()["time_limit_minutes"] == 60

    async def test_delete_question(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "Del me",
                    "options": [
                        {"option_text": "a", "is_correct": True},
                        {"option_text": "b", "is_correct": False},
                    ],
                    "marks": 3,
                },
                headers=_h("teacher"),
            )
            qid = r.json()["id"]
            r = await async_client.delete(
                f"{_CORE}/questions/{qid}",
                headers=_h("teacher"),
            )
        assert r.status_code == 204
        r = await async_client.get(f"{_CORE}/quizzes/{quiz_id}", headers=_h("teacher"))
        assert r.json()["total_marks"] == 0

    async def test_delete_quiz(self, async_client, db):
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            r = await self._create_quiz(async_client, "teacher_fixture", mock)
            quiz_id = r.json()["id"]
            r = await async_client.delete(
                f"{_CORE}/quizzes/{quiz_id}",
                headers=_h("teacher"),
            )
        assert r.status_code == 204


# ============================================================================
#  Student attempt lifecycle
# ============================================================================


class TestStudentAttemptFlow:

    async def _setup_quiz(self, async_client, teacher="tchr1", student="stu1"):
        """Create a quiz with 2 questions and enroll the student. Returns IDs."""
        await _insert_enrollment(student, _VALID_OID)
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": teacher}
            r = await async_client.post(
                f"{_CORE}/courses/{_VALID_OID}/quizzes",
                json={"title": "Exam 1", "time_limit_minutes": 30},
                headers=_h(teacher, "teacher"),
            )
            quiz_id = r.json()["id"]

            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "2+2?",
                    "options": [
                        {"option_text": "3", "is_correct": False},
                        {"option_text": "4", "is_correct": True},
                    ],
                    "marks": 5,
                },
                headers=_h(teacher, "teacher"),
            )
            q1_id = r.json()["id"]

            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "Capital of France?",
                    "options": [
                        {"option_text": "London", "is_correct": False},
                        {"option_text": "Paris", "is_correct": True},
                        {"option_text": "Berlin", "is_correct": False},
                    ],
                    "marks": 3,
                },
                headers=_h(teacher, "teacher"),
            )
            q2_id = r.json()["id"]

        return quiz_id, q1_id, q2_id

    async def test_full_flow_start_get_submit_result(self, async_client, db):
        """Complete student quiz lifecycle: start → get → submit → verify."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "full_flow_student"
        quiz_id, q1_id, q2_id = await self._setup_quiz(async_client, student=student_id)
        h = _h(student_id, "student")

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        assert r.status_code == 201
        attempt_id = r.json()["id"]
        assert r.json()["status"] == "in_progress"

        r = await async_client.get(
            f"{_CORE}/quizzes/{quiz_id}/attempt/{attempt_id}",
            headers=h,
        )
        assert r.status_code == 200
        questions = r.json()
        assert len(questions) == 2
        for q in questions:
            assert "is_correct" not in q
            for opt in q["options"]:
                assert "is_correct" not in opt
                assert "option_text" in opt

        r = await async_client.post(
            f"{_CORE}/attempts/{attempt_id}/submit",
            json={"answers": [
                {"question_id": q1_id, "selected_option": 1},  # correct → 4
                {"question_id": q2_id, "selected_option": 0},  # wrong → London
            ]},
            headers=h,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "submitted"
        assert data["score"] == 62.5  # 5/8 = 62.5%
        assert data["submitted_at"] is not None

        r = await async_client.get(
            f"{_CORE}/attempts/{attempt_id}/result",
            headers=h,
        )
        assert r.status_code == 200
        assert r.json()["score"] == 62.5
        answers = r.json()["answers"]
        assert len(answers) == 2
        assert answers[0]["is_correct"] is True
        assert answers[1]["is_correct"] is False

    async def test_duplicate_start_rejected(self, async_client, db):
        """409 when student already has an in_progress attempt."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "dup_start_student"
        quiz_id, _, _ = await self._setup_quiz(async_client, student=student_id)
        h = _h(student_id, "student")

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        assert r.status_code == 201

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        assert r.status_code == 409

    async def test_completed_quiz_rejected(self, async_client, db):
        """409 when student already completed this quiz."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "completed_student"
        quiz_id, q1_id, q2_id = await self._setup_quiz(async_client, student=student_id)
        h = _h(student_id, "student")

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        attempt_id = r.json()["id"]

        await async_client.post(
            f"{_CORE}/attempts/{attempt_id}/submit",
            json={"answers": [
                {"question_id": q1_id, "selected_option": 1},
                {"question_id": q2_id, "selected_option": 1},
            ]},
            headers=h,
        )

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        assert r.status_code == 409

    async def test_time_limit_exceeded(self, async_client, db):
        """400 when submitted past the grace window (time_limit + 2 min)."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        mdb, mclient = await _fresh_db()
        try:
            student_id = "late_student"
            await _insert_enrollment(student_id, _VALID_OID)
            with patch("fastapi_service.routers.quizzes.call_console") as mock:
                mock.return_value = {"exists": True, "teacher_id": "tchr"}
                r = await async_client.post(
                    f"{_CORE}/courses/{_VALID_OID}/quizzes",
                    json={"title": "Tight", "time_limit_minutes": 1},
                    headers=_h("tchr", "teacher"),
                )
                quiz_id = r.json()["id"]
                r = await async_client.post(
                    f"{_CORE}/quizzes/{quiz_id}/questions",
                    json={
                        "question_text": "Q",
                        "options": [
                            {"option_text": "a", "is_correct": True},
                            {"option_text": "b", "is_correct": False},
                        ],
                        "marks": 1,
                    },
                    headers=_h("tchr", "teacher"),
                )
                qid = r.json()["id"]

            h = _h(student_id, "student")
            r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
            attempt_id = r.json()["id"]

            past = datetime.datetime.utcnow() - datetime.timedelta(minutes=4)
            attempt_doc = await mdb["quiz_attempts"].find_one(
                {"quiz_id": quiz_id, "student_id": student_id}
            )
            await mdb["quiz_attempts"].update_one(
                {"_id": attempt_doc["_id"]},
                {"$set": {"started_at": past}},
            )

            r = await async_client.post(
                f"{_CORE}/attempts/{attempt_id}/submit",
                json={"answers": [{"question_id": qid, "selected_option": 0}]},
                headers=h,
            )
            assert r.status_code == 400
        finally:
            mclient.close()

    async def test_list_course_quizzes(self, async_client, db):
        """Student can list quizzes for a course they're enrolled in."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "list_student"
        await _insert_enrollment(student_id, _VALID_OID)
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "tchr"}
            await async_client.post(
                f"{_CORE}/courses/{_VALID_OID}/quizzes",
                json={"title": "Quiz 1", "time_limit_minutes": 30},
                headers=_h("tchr", "teacher"),
            )
        r = await async_client.get(
            f"{_CORE}/courses/{_VALID_OID}/quizzes",
            headers=_h(student_id, "student"),
        )
        assert r.status_code == 200
        assert len(r.json()) > 0

    async def test_my_attempts(self, async_client, db):
        """Student can list their own attempts for a quiz."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "my_attempts_student"
        quiz_id, q1_id, q2_id = await self._setup_quiz(async_client, student=student_id)
        h = _h(student_id, "student")

        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        attempt_id = r.json()["id"]

        r = await async_client.get(
            f"{_CORE}/quizzes/{quiz_id}/attempts/my",
            headers=h,
        )
        assert r.status_code == 200
        attempts = r.json()
        assert any(a["id"] == attempt_id for a in attempts)

    async def test_submit_forbidden_wrong_student(self, async_client, db):
        """403 when a different student tries to submit another's attempt."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_a = "submit_a"
        student_b = "submit_b"
        quiz_id, q1_id, _ = await self._setup_quiz(async_client, student=student_a)
        await _insert_enrollment(student_b, _VALID_OID)

        r = await async_client.post(
            f"{_CORE}/quizzes/{quiz_id}/start",
            headers=_h(student_a, "student"),
        )
        attempt_id = r.json()["id"]

        r = await async_client.post(
            f"{_CORE}/attempts/{attempt_id}/submit",
            json={"answers": [{"question_id": q1_id, "selected_option": 1}]},
            headers=_h(student_b, "student"),
        )
        assert r.status_code == 403


# ============================================================================
#  Certificate eligibility via the real internal call_console
# ============================================================================


class TestCertificateIssuerIntegration:

    async def test_certificate_issued_on_passing_score(self, async_client, db):
        """Student scores >= passing_threshold (default 50) → certificate issued.

        The certificate_issuer's internal call_console to
        /api/v1/console/internal/settings/passing_threshold is NOT mocked —
        we verify the real crossing works (returns {"exists": False} without
        MongoDB, defaulting threshold to 50).
        """
        if db is None:
            pytest.skip("MongoDB not reachable")
        from bson import ObjectId
        course_id = str(ObjectId())
        student_id = "cert_student"
        await _insert_enrollment(student_id, course_id)

        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "tchr"}
            r = await async_client.post(
                f"{_CORE}/courses/{course_id}/quizzes",
                json={"title": "Cert Quiz", "time_limit_minutes": 30},
                headers=_h("tchr", "teacher"),
            )
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "1+1?",
                    "options": [
                        {"option_text": "1", "is_correct": False},
                        {"option_text": "2", "is_correct": True},
                    ],
                    "marks": 10,
                },
                headers=_h("tchr", "teacher"),
            )
            qid = r.json()["id"]

        h = _h(student_id, "student")
        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        attempt_id = r.json()["id"]

        # Submit with correct answer → 100% → eligible for certificate
        # issue_certificate_if_eligible will call call_console real (not mocked)
        # for the settings endpoint, which returns {"exists": False} → threshold 50
        await async_client.post(
            f"{_CORE}/attempts/{attempt_id}/submit",
            json={"answers": [{"question_id": qid, "selected_option": 1}]},
            headers=h,
        )

        mdb, mclient = await _fresh_db()
        try:
            cert = await mdb["certificates"].find_one({
                "student_id": student_id, "course_id": course_id,
            })
            assert cert is not None
            assert cert["student_id"] == student_id
        finally:
            mclient.close()

    async def test_no_certificate_below_threshold(self, async_client, db):
        """Score < threshold → no certificate issued."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        from bson import ObjectId
        course_id = str(ObjectId())
        student_id = "no_cert_student"
        await _insert_enrollment(student_id, course_id)

        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "tchr"}
            r = await async_client.post(
                f"{_CORE}/courses/{course_id}/quizzes",
                json={"title": "No Cert", "time_limit_minutes": 30},
                headers=_h("tchr", "teacher"),
            )
            quiz_id = r.json()["id"]
            r = await async_client.post(
                f"{_CORE}/quizzes/{quiz_id}/questions",
                json={
                    "question_text": "2+2?",
                    "options": [
                        {"option_text": "4", "is_correct": True},
                        {"option_text": "5", "is_correct": False},
                    ],
                    "marks": 10,
                },
                headers=_h("tchr", "teacher"),
            )
            qid = r.json()["id"]

        h = _h(student_id, "student")
        r = await async_client.post(f"{_CORE}/quizzes/{quiz_id}/start", headers=h)
        attempt_id = r.json()["id"]

        # Submit with wrong answer (option 1 = "5") → 0% → below threshold
        await async_client.post(
            f"{_CORE}/attempts/{attempt_id}/submit",
            json={"answers": [{"question_id": qid, "selected_option": 1}]},
            headers=h,
        )

        mdb, mclient = await _fresh_db()
        try:
            cert = await mdb["certificates"].find_one({
                "student_id": student_id, "course_id": course_id,
            })
            assert cert is None, f"Expected no cert but found: {cert}"
        finally:
            mclient.close()


# ============================================================================
#  Internal endpoints
# ============================================================================


class TestInternalQuizEndpoints:

    async def test_internal_list_quizzes_by_course(self, async_client):
        r = await async_client.get(f"{_CORE}/internal/quizzes/course/{_VALID_OID}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_internal_list_attempts(self, async_client):
        r = await async_client.get(f"{_CORE}/internal/attempts/quiz/{_VALID_OID}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    async def test_quiz_results_endpoint(self, async_client, db):
        """Teacher can view results for their quiz."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        with patch("fastapi_service.routers.quizzes.call_console") as mock:
            mock.return_value = {"exists": True, "teacher_id": "res_tchr"}
            r = await async_client.post(
                f"{_CORE}/courses/{_VALID_OID}/quizzes",
                json={"title": "Results Q", "time_limit_minutes": 30},
                headers=_h("res_tchr", "teacher"),
            )
            quiz_id = r.json()["id"]
            r = await async_client.get(
                f"{_CORE}/quizzes/{quiz_id}/results",
                headers=_h("res_tchr", "teacher"),
            )
        assert r.status_code == 200
        data = r.json()
        assert data["quiz"]["title"] == "Results Q"
        assert isinstance(data["attempts"], list)

    async def test_quiz_results_forbidden_for_student(self, async_client, db):
        """Results endpoint requires teacher/admin role."""
        if db is None:
            pytest.skip("MongoDB not reachable")
        student_id = "res_forbidden"
        quiz_id, _, _ = await TestStudentAttemptFlow()._setup_quiz(
            async_client, student=student_id,
        )
        r = await async_client.get(
            f"{_CORE}/quizzes/{quiz_id}/results",
            headers=_h(student_id, "student"),
        )
        assert r.status_code == 403
