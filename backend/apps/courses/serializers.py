from rest_framework import serializers
from apps.common.documents import Course, Section

class SectionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    course_id = serializers.CharField()
    title = serializers.CharField(max_length=255)
    order = serializers.IntegerField(default=0)

    def create(self, validated_data):
        section = Section(**validated_data).save()
        return section

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class CourseSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    teacher_id = serializers.CharField(required=False)
    credit_hours = serializers.IntegerField(default=3)
    created_at = serializers.DateTimeField(read_only=True)
    is_published = serializers.BooleanField(default=False)
    cover_image = serializers.CharField(required=False, allow_blank=True)
    what_you_will_learn = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    requirements = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    total_duration = serializers.CharField(required=False, allow_blank=True, default="0")
    difficulty_level = serializers.CharField(required=False, allow_blank=True, default="beginner")
    price = serializers.FloatField(default=0.0)
    students_enrolled = serializers.IntegerField(read_only=True, default=0)

    def create(self, validated_data):
        course = Course(**validated_data).save()
        return course

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class CourseDetailSerializer(CourseSerializer):
    sections = serializers.SerializerMethodField()
    sections_count = serializers.SerializerMethodField()

    def get_sections(self, obj):
        sections = Section.objects(course_id=str(obj.id)).order_by("order")
        return SectionSerializer(sections, many=True).data

    def get_sections_count(self, obj):
        return Section.objects(course_id=str(obj.id)).count()


class CourseListSerializer(CourseSerializer):
    sections_count = serializers.SerializerMethodField()

    def get_sections_count(self, obj):
        return Section.objects(course_id=str(obj.id)).count()
