import difflib
import logging

logger = logging.getLogger(__name__)
SIMILARITY_THRESHOLD = 0.85


def _normalize(text: str) -> str:
    return ' '.join(text.lower().split())


def is_duplicate(new_question: str, existing_questions: list[str]) -> bool:
    normalized_new = _normalize(new_question)
    for eq in existing_questions:
        normalized_existing = _normalize(eq)
        ratio = difflib.SequenceMatcher(None, normalized_new, normalized_existing).ratio()
        if ratio >= SIMILARITY_THRESHOLD:
            logger.info("Duplicate detected (ratio=%.2f): %s", ratio, new_question[:60])
            return True
    return False


def filter_duplicates(generated: list[dict], key: str, existing_texts: list[str]) -> list[dict]:
    return [item for item in generated if not is_duplicate(item.get(key, ""), existing_texts)]
