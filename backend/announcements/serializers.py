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
            'id', 'title', 'description', 'created_at', 'author', 'building',
            # Πρόσθεσε εδώ και άλλα πεδία αν χρειάζονται, π.χ., 'file', 'start_date', 'end_date'
            # όπως είχες στον τύπο Announcement στο api.ts
            # 'file', 'start_date', 'end_date', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'author']

    def validate_building(self, value):
        user = self.context['request'].user
        if hasattr(value, 'manager') and value.manager is not None:
            if not (user.is_superuser or value.manager == user):
                raise serializers.ValidationError("Δεν έχετε δικαίωμα διαχείρισης για αυτό το κτίριο.")
        elif not user.is_superuser:
            raise serializers.ValidationError("Μόνο διαχειριστές ή superusers μπορούν να αντιστοιχίσουν ανακοίνωση σε αυτό το κτίριο.")
        return value