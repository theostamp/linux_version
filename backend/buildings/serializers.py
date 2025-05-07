# backend/buildings/serializers.py
from rest_framework import serializers
from .models import Building

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