from mongoengine import Document, StringField, IntField, FloatField, BooleanField, DateTimeField, ListField, DictField
from datetime import datetime


class LmsSetting(Document):
    meta = {
        "collection": "lms_settings",
        "indexes": [{"fields": ["key"], "unique": True}],
    }
    key = StringField(required=True, max_length=255)
    value = StringField(required=True)


class Course(Document):
    meta = {
        "collection": "courses",
        "indexes": ["teacher_id"],
    }
    title = StringField(required=True, max_length=255)
    description = StringField()
    teacher_id = StringField(required=True)
    credit_hours = IntField(default=3)
    created_at = DateTimeField(default=datetime.utcnow)
    is_published = BooleanField(default=False)
    cover_image = StringField()
    what_you_will_learn = ListField(StringField(), default=list)
    requirements = ListField(StringField(), default=list)
    total_duration = StringField(default="0")
    difficulty_level = StringField(default="beginner")
    price = FloatField(default=0.0)
    students_enrolled = IntField(default=0)


class Section(Document):
    meta = {
        "collection": "sections",
        "indexes": [
            "course_id",
            {"fields": ["course_id", "order"]},
        ],
    }
    course_id = StringField(required=True)
    title = StringField(required=True, max_length=255)
    order = IntField(default=0)


class Announcement(Document):
    meta = {
        "collection": "announcements",
        "indexes": ["course_id"],
    }
    course_id = StringField(required=True)
    title = StringField(required=True, max_length=255)
    body = StringField()
    created_by = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)


class Assignment(Document):
    meta = {
        "collection": "assignments",
        "indexes": ["course_id"],
    }
    course_id = StringField(required=True)
    title = StringField(required=True, max_length=255)
    description = StringField()
    instructions = StringField()
    due_date = DateTimeField(required=True)
    max_score = FloatField(default=100.0)
    section = StringField(max_length=50)
    assignment_no = StringField(max_length=50)
    status = StringField(default="draft")
    material_file_path = StringField()
    material_original_name = StringField()
    created_at = DateTimeField(default=datetime.utcnow)


class Review(Document):
    meta = {
        "collection": "reviews",
        "indexes": [
            "course_id",
            {"fields": ["course_id", "student_id"], "unique": True},
        ],
    }
    course_id = StringField(required=True)
    student_id = StringField(required=True)
    rating = IntField(required=True, min_value=1, max_value=5)
    comment = StringField()
    created_at = DateTimeField(default=datetime.utcnow)
