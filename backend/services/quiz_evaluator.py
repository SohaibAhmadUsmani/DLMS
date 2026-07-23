"""
Standalone, unit-testable quiz evaluation function.
No I/O, no DB — pure logic.

Usage:
    result = evaluate_quiz(questions, answers)
    # result = {"answers": [...], "score_pct": 85.0, "total_marks": 10, "earned_marks": 8.5}
"""


def evaluate_quiz(questions: list[dict], answers: list[dict]) -> dict:
    """
    Evaluate a student's answers against quiz questions.

    Args:
        questions: list of question dicts with keys:
            _id (ObjectId or str), marks (int), options (list[dict] with is_correct).
        answers: list of answer dicts with keys:
            question_id (str), selected_option (int).

    Returns:
        dict with:
            answers (list[dict]): each with question_id, selected_option, is_correct, marks, earned
            score_pct (float): 0–100
            total_marks (int)
            earned_marks (float)
    """
    question_map = {}
    for q in questions:
        qid = str(q["_id"])
        question_map[qid] = q

    evaluated = []
    total_marks = 0
    earned_marks = 0.0

    for ans in answers:
        qid = ans["question_id"]
        selected = ans["selected_option"]
        q = question_map.get(qid)
        if q is None:
            evaluated.append({
                "question_id": qid,
                "selected_option": selected,
                "is_correct": False,
                "marks": 0,
                "earned": 0.0,
            })
            continue
        marks = q.get("marks", 1)
        total_marks += marks
        opts = q.get("options", [])
        is_correct = False
        if 0 <= selected < len(opts):
            is_correct = bool(opts[selected].get("is_correct", False))
        earned = marks if is_correct else 0.0
        earned_marks += earned
        evaluated.append({
            "question_id": qid,
            "selected_option": selected,
            "is_correct": is_correct,
            "marks": marks,
            "earned": earned,
        })

    score_pct = round((earned_marks / total_marks * 100), 2) if total_marks > 0 else 0.0
    return {
        "answers": evaluated,
        "score_pct": score_pct,
        "total_marks": total_marks,
        "earned_marks": earned_marks,
    }
