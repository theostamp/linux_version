from rest_framework import serializers
from .models import UserRequest
from buildings.models import Building

class UserRequestSerializer(serializers.ModelSerializer):
    # Expose building as a writable PK
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    created_by = serializers.ReadOnlyField(source='created_by.username')
    supporter_count = serializers.ReadOnlyField()

    class Meta:
        model = UserRequest
        fields = [
            'id',
            'building',
            'title',
            'description',
            'type',
            'status',
            'created_at',
            'created_by',
            'supporter_count',
        ]
        read_only_fields = [
            'id',
            'status',
            'created_at',
            'created_by',
            'supporter_count',
        ]

    def validate_building(self, building):
        user = self.context['request'].user
        # superusers or the building’s manager may use it
        if user.is_superuser or getattr(building, 'manager', None) == user:
            return building
        raise serializers.ValidationError(
            "Δεν έχετε δικαίωμα δημιουργίας σε αυτό το κτίριο."
        )
