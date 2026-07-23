from rest_framework import serializers
from apps.common.documents import Assignment


class AssignmentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    course_id = serializers.CharField()
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateTimeField()
    max_score = serializers.FloatField(default=100.0)
    section = serializers.CharField(required=False, allow_blank=True, max_length=50)
    assignment_no = serializers.CharField(required=False, allow_blank=True, max_length=50)
    status = serializers.CharField(default="draft")
    material_file_path = serializers.CharField(required=False, allow_blank=True)
    material_original_name = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        assignment = Assignment(**validated_data).save()
        return assignment

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance