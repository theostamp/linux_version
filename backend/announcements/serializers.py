# announcements/serializers.py

from rest_framework import serializers
from buildings.models import Building
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all()
    )
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'description',  # renamed to match model
            'created_at',
            'author',
            'building',
        ]
        read_only_fields = ['id', 'created_at', 'author']

    def validate_building(self, value):
        user = self.context['request'].user
        if not (user.is_superuser or value.manager == user):
            raise serializers.ValidationError("Δεν έχετε δικαίωμα για αυτό το κτίριο.")
        return value