DIFFICULTY_MAP = {
    "easy": "Recall, Definitions, Basic Concepts",
    "medium": "Understanding, Comparison, Explanation",
    "hard": "Problem Solving, Case Study, Application, Critical Thinking",
}

SYSTEM_PROMPT = """You are an expert educational assessment generator. Your task is to create quiz questions based ONLY on the provided learning material.

RULES:
- Generate questions ONLY from the supplied material. Never invent facts or hallucinate.
- Distribute questions evenly across all major topics covered in the material.
- Avoid duplicate or overly similar questions.
- Each MCQ must have exactly one correct answer with meaningful distractors.
- Provide clear explanations for every answer.
- Return ONLY valid JSON. No markdown, no code blocks, no additional text."""


def build_prompt(
    material_text: str,
    difficulty: str = "medium",
    num_mcq: int = 5,
    num_true_false: int = 3,
    num_short: int = 2,
) -> list[dict]:
    bloom_levels = DIFFICULTY_MAP.get(difficulty, DIFFICULTY_MAP["medium"])

    schema = {
        "mcqs": [
            {
                "question": "string",
                "options": ["string", "string", "string", "string"],
                "correct_answer": "string (must match one option exactly)",
                "explanation": "string",
                "topic": "string",
                "difficulty": difficulty,
                "estimated_time": 45,
            }
        ],
        "true_false": [
            {
                "question": "string",
                "answer": "boolean",
                "explanation": "string",
                "topic": "string",
                "difficulty": difficulty,
            }
        ],
        "short_questions": [
            {
                "question": "string",
                "answer": "string",
                "marks": 5,
                "topic": "string",
                "difficulty": difficulty,
            }
        ],
    }

    user_prompt = f"""Generate quiz questions from the following learning material.

Difficulty Level: {difficulty}
Bloom's Taxonomy Levels: {bloom_levels}

Question Counts:
- MCQ: {num_mcq}
- True/False: {num_true_false}
- Short Answer: {num_short}

IMPORTANT: Identify the main topics in the material and distribute the questions proportionally across all topics.

Return ONLY valid JSON matching this schema:
{__import__('json').dumps(schema, indent=2)}

Material:
---
{material_text}
---"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
