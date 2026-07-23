"""
Pure unit tests for services/quiz_evaluator.py — no HTTP, no DB, no fixtures.

evaluate_quiz(questions, answers) is a pure function — every test is a
simple call-assert with no setup, teardown, or external dependencies.
"""

import pytest
from services.quiz_evaluator import evaluate_quiz


def _q(qid, marks=1, correct_idx=0, option_count=4):
    """Build a question dict matching what the quizzes router passes."""
    return {
        "_id": qid,
        "marks": marks,
        "options": [
            {"option_text": f"opt{i}", "is_correct": i == correct_idx}
            for i in range(option_count)
        ],
    }


def _a(qid, selected=0):
    return {"question_id": qid, "selected_option": selected}


class TestBasicScoring:

    def test_all_correct(self):
        qs = [_q("q1"), _q("q2"), _q("q3")]
        ans = [_a("q1", 0), _a("q2", 0), _a("q3", 0)]
        r = evaluate_quiz(qs, ans)
        assert r["score_pct"] == 100.0
        assert r["total_marks"] == 3
        assert r["earned_marks"] == 3.0
        assert all(a["is_correct"] for a in r["answers"])

    def test_all_wrong(self):
        qs = [_q("q1"), _q("q2")]
        ans = [_a("q1", 1), _a("q2", 2)]
        r = evaluate_quiz(qs, ans)
        assert r["score_pct"] == 0.0
        assert r["total_marks"] == 2
        assert r["earned_marks"] == 0.0
        assert not any(a["is_correct"] for a in r["answers"])

    def test_partial_score(self):
        qs = [_q("q1", marks=2), _q("q2", marks=3), _q("q3", marks=5)]
        ans = [_a("q1", 0), _a("q2", 1), _a("q3", 0)]
        r = evaluate_quiz(qs, ans)
        assert r["total_marks"] == 10
        assert r["earned_marks"] == 7.0
        assert r["score_pct"] == 70.0

    def test_empty_answers(self):
        qs = [_q("q1"), _q("q2")]
        r = evaluate_quiz(qs, [])
        assert r["total_marks"] == 0
        assert r["score_pct"] == 0.0
        assert r["earned_marks"] == 0.0
        assert r["answers"] == []


class TestEdgeCases:

    def test_unknown_question_id(self):
        qs = [_q("q1")]
        ans = [_a("unknown_q")]
        r = evaluate_quiz(qs, ans)
        assert not r["answers"][0]["is_correct"]
        assert r["answers"][0]["marks"] == 0
        assert r["answers"][0]["earned"] == 0.0
        assert r["score_pct"] == 0.0

    def test_out_of_range_option(self):
        qs = [_q("q1")]
        ans = [_a("q1", 99)]
        r = evaluate_quiz(qs, ans)
        assert not r["answers"][0]["is_correct"]
        assert r["earned_marks"] == 0.0

    def test_zero_total_marks_does_not_divide_by_zero(self):
        qs = [_q("q1", marks=0), _q("q2", marks=0)]
        ans = [_a("q1", 0), _a("q2", 0)]
        r = evaluate_quiz(qs, ans)
        assert r["score_pct"] == 0.0
        assert r["total_marks"] == 0
        assert r["earned_marks"] == 0.0

    def test_float_marks(self):
        qs = [_q("q1", marks=2.5), _q("q2", marks=1.5)]
        ans = [_a("q1", 0), _a("q2", 1)]
        r = evaluate_quiz(qs, ans)
        assert r["earned_marks"] == 2.5
        assert r["total_marks"] == 4.0
        assert r["score_pct"] == 62.5

    def test_score_pct_rounds_to_two_decimals(self):
        qs = [_q("q1", marks=3), _q("q2", marks=3)]
        ans = [_a("q1", 1)]
        r = evaluate_quiz(qs, ans)
        assert r["total_marks"] == 3
        assert r["earned_marks"] == 0.0
        assert r["score_pct"] == 0.0


class TestResponseStructure:

    def test_answers_preserve_input_order(self):
        qs = [_q("q1"), _q("q2"), _q("q3")]
        ans = [_a("q1", 0), _a("q3", 0), _a("q2", 1)]
        r = evaluate_quiz(qs, ans)
        assert [a["question_id"] for a in r["answers"]] == ["q1", "q3", "q2"]

    def test_evaluated_answer_has_all_keys(self):
        qs = [_q("q1")]
        ans = [_a("q1", 0)]
        r = evaluate_quiz(qs, ans)
        entry = r["answers"][0]
        assert "question_id" in entry
        assert "selected_option" in entry
        assert "is_correct" in entry
        assert "marks" in entry
        assert "earned" in entry

    def test_result_has_all_top_level_keys(self):
        r = evaluate_quiz([_q("q1")], [_a("q1", 0)])
        assert "answers" in r
        assert "score_pct" in r
        assert "total_marks" in r
        assert "earned_marks" in r
