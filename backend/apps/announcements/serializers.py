from rest_framework import serializers
from apps.common.documents import Announcement


class AnnouncementSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    course_id = serializers.CharField()
    title = serializers.CharField(max_length=255)
    body = serializers.CharField(required=False, allow_blank=True)
    created_by = serializers.CharField()
    created_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        announcement = Announcement(**validated_data).save()
        return announcement

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
