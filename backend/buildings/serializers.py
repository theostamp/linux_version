# backend/buildings/serializers.py
from rest_framework import serializers # type: ignore
from .models import Building
from users.models import CustomUser
from .models import BuildingMembership

class BuildingMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildingMembership
        fields = ["id", "building", "resident", "role", "created_at"]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        email = validated_data.pop('user_email')
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({'user_email': 'Δεν βρέθηκε χρήστης με αυτό το email.'})

        return BuildingMembership.objects.create(user=user, **validated_data)

class BuildingSerializer(serializers.ModelSerializer):
    # Ορίζουμε κρυφό πεδίο manager ως τον τρέχον χρήστη
    manager = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Building
        fields = [
            'id',
            'name',
            'address',
            'city',
            'postal_code',
            'apartments_count',
            'internal_manager_name',
            'internal_manager_phone',
            'created_at',
            'updated_at',
            'manager'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']