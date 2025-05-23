from rest_framework import serializers
from buildings.models import Building
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all()
    )
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_currently_active = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'description',
            'created_at',
            'author',
            'building',
            'file',
            'start_date',
            'end_date',
            'is_active',
            'is_currently_active',
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

    def get_is_currently_active(self, obj):
        return obj.is_currently_active

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        return super().create(validated_data)
