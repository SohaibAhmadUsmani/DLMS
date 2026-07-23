import json
import logging
import os
import tempfile
from typing import Optional

import fitz
from groq import Groq

from fastapi_service.utils.pdf_extractor import extract_text_from_pdf
from fastapi_service.utils.prompt_builder import build_prompt
from fastapi_service.utils.json_validator import parse_ai_response
from fastapi_service.utils.duplicate_detector import filter_duplicates

logger = logging.getLogger(__name__)

SUPPORTED_FILE_TYPES = {"pdf", "reading", "document", "text"}
GROQ_MODEL = "llama-3.3-70b-versatile"
MAX_CONTENT_LENGTH = 50000


class AIContentEngine:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        self.client = Groq(api_key=api_key)

    async def _fetch_course_materials(self, course_id: str, db) -> list[dict]:
        section_ids = []
        async for s in db["sections"].find({"course_id": course_id}):
            section_ids.append(str(s["_id"]))

        if not section_ids:
            return []

        materials = []
        cursor = db["materials"].find({"section_id": {"$in": section_ids}})
        async for doc in cursor:
            file_type = doc.get("file_type", "")
            if file_type in SUPPORTED_FILE_TYPES:
                materials.append(doc)
        return materials

    def _extract_material_text(self, materials: list[dict], base_upload_dir: str) -> str:
        parts = []
        for mat in materials:
            file_type = mat.get("file_type", "")
            content = mat.get("content", "")
            file_url = mat.get("file_url", "")

            if content:
                parts.append(f"=== {mat.get('title', 'Material')} ===\n{content}")
            elif file_type == "pdf" and file_url:
                file_path = os.path.join(base_upload_dir, os.path.basename(file_url))
                if os.path.exists(file_path):
                    try:
                        text = extract_text_from_pdf(file_path)
                        if text.strip():
                            parts.append(f"=== {mat.get('title', 'PDF')} ===\n{text}")
                    except Exception as e:
                        logger.warning("Failed to extract PDF %s: %s", file_url, e)
        return "\n\n".join(parts)

    def _extract_uploaded_pdf(self, file_bytes: bytes) -> str:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            text = extract_text_from_pdf(tmp_path)
            if not text.strip():
                raise ValueError("No extractable text found in the uploaded PDF")
            return text
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    async def _get_existing_question_texts(self, course_id: str, db) -> list[str]:
        texts = []
        quiz_cursor = db["quizzes"].find({"course_id": course_id}, {"_id": 1})
        quiz_ids = []
        async for q in quiz_cursor:
            quiz_ids.append(str(q["_id"]))

        if not quiz_ids:
            return texts

        question_cursor = db["questions"].find({"quiz_id": {"$in": quiz_ids}}, {"question_text": 1})
        async for q in question_cursor:
            texts.append(q.get("question_text", ""))
        return texts

    async def generate_quiz(
        self,
        course_id: str,
        generation_mode: str,
        uploaded_pdf_bytes: Optional[bytes],
        difficulty: str,
        num_mcq: int,
        num_true_false: int,
        num_short: int,
        db,
    ) -> dict:
        if generation_mode == "existing_materials":
            materials = await self._fetch_course_materials(course_id, db)
            if not materials:
                raise ValueError("No supported materials found for this course")

            base_upload_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "uploads", "materials",
            )
            material_text = self._extract_material_text(materials, base_upload_dir)
            if not material_text.strip():
                raise ValueError("Could not extract any text from course materials")
        elif generation_mode == "uploaded_pdf":
            if not uploaded_pdf_bytes:
                raise ValueError("No PDF file provided")
            material_text = self._extract_uploaded_pdf(uploaded_pdf_bytes)
        else:
            raise ValueError(f"Invalid generation mode: {generation_mode}")

        if len(material_text) > MAX_CONTENT_LENGTH:
            material_text = material_text[:MAX_CONTENT_LENGTH]
            logger.info("Truncated material text to %d characters", MAX_CONTENT_LENGTH)

        messages = build_prompt(material_text, difficulty, num_mcq, num_true_false, num_short)

        try:
            completion = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                response_format={"type": "json_object"},
            )
        except Exception as e:
            logger.error("Groq API call failed: %s", e)
            raise RuntimeError(f"AI service unavailable: {e}")

        raw = completion.choices[0].message.content or ""
        if not raw:
            raise ValueError("Empty response from AI service")

        try:
            data = parse_ai_response(raw, retry_count=1)
        except ValueError as e:
            raise

        existing_texts = await self._get_existing_question_texts(course_id, db)

        if existing_texts:
            data["mcqs"] = filter_duplicates(data.get("mcqs", []), "question", existing_texts)
            data["true_false"] = filter_duplicates(data.get("true_false", []), "question", existing_texts)
            data["short_questions"] = filter_duplicates(data.get("short_questions", []), "question", existing_texts)

        total = (
            len(data.get("mcqs", []))
            + len(data.get("true_false", []))
            + len(data.get("short_questions", []))
        )
        if total == 0:
            raise ValueError("All generated questions were duplicates. Try different parameters or more material.")

        return data
