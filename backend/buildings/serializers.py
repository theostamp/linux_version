# backend/buildings/serializers.py

from rest_framework import serializers
from .models import Building

class BuildingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Building
        fields = [
            'id',
            'name',
            'address',
            'city',
            'postal_code',
            'floors',
            'manager',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'manager': {'required': True}
        }       