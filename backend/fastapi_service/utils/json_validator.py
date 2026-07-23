import json
import logging

logger = logging.getLogger(__name__)

REQUIRED_KEYS = {
    "mcqs": ["question", "options", "correct_answer", "explanation", "topic", "difficulty", "estimated_time"],
    "true_false": ["question", "answer", "explanation", "topic", "difficulty"],
    "short_questions": ["question", "answer", "marks", "topic", "difficulty"],
}


def validate_quiz_json(data: dict) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, "Response must be a JSON object"

    for key in REQUIRED_KEYS:
        if key not in data:
            return False, f"Missing key: {key}"
        if not isinstance(data[key], list):
            return False, f"{key} must be an array"

        for i, item in enumerate(data[key]):
            if not isinstance(item, dict):
                return False, f"Item {i} in {key} must be an object"
            for field in REQUIRED_KEYS[key]:
                if field not in item:
                    return False, f"Item {i} in {key} missing field: {field}"

            if key == "mcqs":
                opts = item.get("options", [])
                if not isinstance(opts, list) or len(opts) < 2:
                    return False, f"MCQ item {i} must have at least 2 options"
                if item.get("correct_answer") not in opts:
                    return False, f"MCQ item {i} correct_answer must match one of the options"

            if key == "true_false":
                if not isinstance(item.get("answer"), bool):
                    return False, f"True/False item {i} answer must be boolean"

            if key == "short_questions":
                if not isinstance(item.get("marks"), (int, float)) or item["marks"] <= 0:
                    return False, f"Short question item {i} marks must be a positive number"

    return True, ""


def parse_ai_response(raw: str, retry_count: int = 0, max_retries: int = 1) -> dict:
    for attempt in range(retry_count + 1):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            if attempt < retry_count:
                logger.warning("JSON decode failed (attempt %d): %s", attempt + 1, e)
                continue
            raise ValueError(f"Invalid JSON from AI: {e}")

        valid, msg = validate_quiz_json(data)
        if valid:
            return data

        if attempt < retry_count:
            logger.warning("Schema validation failed (attempt %d): %s", attempt + 1, msg)
            continue
        raise ValueError(f"AI response failed validation: {msg}")

    raise ValueError("Failed to parse AI response after all retries")
