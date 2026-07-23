from rest_framework import serializers
from apps.common.documents import Review


class ReviewSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    course_id = serializers.CharField()
    student_id = serializers.CharField(read_only=True)
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)
    created_at = serializers.DateTimeField(read_only=True)

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def create(self, validated_data):
        review = Review(**validated_data).save()
        return review

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
