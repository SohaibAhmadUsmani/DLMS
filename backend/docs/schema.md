# MongoDB Schema — Single Source of Truth

This document defines every collection, its owning domain, and every field name.
Both the FastAPI (core) and Django (console) domains MUST reference this file when
reading or writing the other domain's collections via internal HTTP — field-name
drift is the main risk since they use different ODMs.

---

## Domain Ownership

| Collection | Owned By (ODM) | Readable By | Writable By |
|---|---|---|---|
| users | Core (Pydantic+Motor) | Core, Console | Core |
| enrollments | Core | Core, Console | Core |
| materials | Core | Core, Console | Core |
| quizzes | Core | Core, Console | Core |
| questions | Core | Core, Console | Core |
| quiz_attempts | Core | Core, Console | Core |
| quiz_attempt_answers | Core | Core, Console | Core |
| assignment_submissions | Core | Core, Console | Core |
| certificates | Core | Core, Console | Core |
| lms_settings | Console (mongoengine) | Console, Core | Console |
| courses | Console | Console, Core | Console |
| sections | Console | Console, Core | Console |
| announcements | Console | Console, Core | Console |
| assignments | Console | Console, Core | Console |
| reviews | Console | Console, Core | Console |

**Cross-domain access pattern:** Console reads core collections via `call_core()`,
Core reads console collections via `call_console()`. Only the owning domain writes
directly to its collections.

---

## CORE-owned collections (`dlms_core` database, Motor + Pydantic)

### `users`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | string | yes | |
| `email` | string | yes | unique index |
| `password_hash` | string | yes | bcrypt hash |
| `role` | string | yes | one of: `admin`, `teacher`, `student` |
| `created_at` | datetime | auto | UTC |
| `is_active` | bool | default `true` | console may deactivate |

Indexes:
- `{ email: 1 }` — unique
- `{ role: 1 }`

### `enrollments`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `student_id` | string | yes | references `users._id` |
| `course_id` | string | yes | references `courses._id` |
| `enrolled_at` | datetime | auto | UTC |
| `status` | string | default `"active"` | `active`, `dropped`, `completed` |

Indexes:
- `{ student_id: 1, course_id: 1 }` — unique
- `{ course_id: 1 }`
- `{ student_id: 1 }`

### `materials`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `section_id` | string | yes | references `sections._id` |
| `title` | string | yes | |
| `file_url` | string | yes | uploaded file path/URL |
| `file_type` | string | yes | `pdf`, `video`, `document`, `other` |
| `uploaded_by` | string | yes | references `users._id` |
| `uploaded_at` | datetime | auto | UTC |

Indexes:
- `{ section_id: 1 }`

### `quizzes`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `course_id` | string | yes | references `courses._id` |
| `title` | string | yes | |
| `time_limit_minutes` | int | yes | duration in minutes |
| `total_marks` | int | default `0` | populated from questions |
| `created_by` | string | yes | references `users._id` |

Indexes:
- `{ course_id: 1 }`

### `questions`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `quiz_id` | string | yes | references `quizzes._id` |
| `question_text` | string | yes | |
| `options` | array of objects | yes | see below |
| `marks` | int | default `1` | |

Each `options[]` object:

| Field | Type | Required | Notes |
|---|---|---|---|
| `option_text` | string | yes | |
| `is_correct` | bool | default `false` | exactly one per question |

Indexes:
- `{ quiz_id: 1 }`

### `quiz_attempts`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `quiz_id` | string | yes | references `quizzes._id` |
| `student_id` | string | yes | references `users._id` |
| `started_at` | datetime | auto | UTC |
| `submitted_at` | datetime | null | UTC, null until submitted |
| `score` | float | null | null until graded |
| `status` | string | default `"in_progress"` | `in_progress`, `submitted`, `graded` |

Indexes:
- `{ quiz_id: 1, student_id: 1 }` — one active attempt at a time
- `{ student_id: 1 }`

### `quiz_attempt_answers`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `attempt_id` | string | yes | references `quiz_attempts._id` |
| `question_id` | string | yes | references `questions._id` |
| `selected_option` | int | yes | index into the question's `options` array |
| `is_correct` | bool | default `false` | |

Indexes:
- `{ attempt_id: 1 }`

### `assignment_submissions`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `assignment_id` | string | yes | references `assignments._id` |
| `student_id` | string | yes | references `users._id` |
| `file_url` | string | yes | uploaded file path/URL |
| `submitted_at` | datetime | auto | UTC |
| `score` | float | null | null until graded |
| `feedback` | string | null | null until graded |

Indexes:
- `{ assignment_id: 1, student_id: 1 }`
- `{ student_id: 1 }`

### `certificates`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `student_id` | string | yes | references `users._id` |
| `course_id` | string | yes | references `courses._id` |
| `issued_at` | datetime | auto | UTC |
| `certificate_url` | string | yes | generated certificate path/URL |

Indexes:
- `{ student_id: 1, course_id: 1 }`
- `{ student_id: 1 }`

---

## CONSOLE-owned collections (`dlms_core` database, mongoengine)

### `lms_settings`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `key` | string | yes | unique |
| `value` | string | yes | |

Indexes:
- `{ key: 1 }` — unique

### `courses`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `title` | string | yes | |
| `description` | string | no | |
| `teacher_id` | string | yes | references `users._id` |
| `created_at` | datetime | auto | UTC |
| `is_published` | bool | default `false` | |

Indexes:
- `{ teacher_id: 1 }`

### `sections`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `course_id` | string | yes | references `courses._id` |
| `title` | string | yes | |
| `order` | int | default `0` | section ordering |

Indexes:
- `{ course_id: 1, order: 1 }`

### `announcements`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `course_id` | string | yes | references `courses._id` |
| `title` | string | yes | |
| `body` | string | no | |
| `created_by` | string | yes | references `users._id` |
| `created_at` | datetime | auto | UTC |

Indexes:
- `{ course_id: 1 }`

### `assignments`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `course_id` | string | yes | references `courses._id` |
| `title` | string | yes | |
| `description` | string | no | |
| `due_date` | datetime | yes | UTC |
| `max_score` | float | default `100.0` | |

Indexes:
- `{ course_id: 1 }`

### `reviews`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `course_id` | string | yes | references `courses._id` |
| `student_id` | string | yes | references `users._id` |
| `rating` | int | yes | 1–5 |
| `comment` | string | no | |
| `created_at` | datetime | auto | UTC |

Indexes:
- `{ course_id: 1, student_id: 1 }` — unique, one review per student per course
- `{ course_id: 1 }`

---

## Naming Convention

- All collections use `snake_case` for field names.
- All `_id` fields are MongoDB ObjectId, stored as `str` in Pydantic and `StringField` in mongoengine.
- All datetime fields are UTC.
- All reference fields (e.g. `course_id`, `student_id`) are plain strings holding the target document's `_id` — no DBRefs.
