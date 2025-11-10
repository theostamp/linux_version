from rest_framework import serializers
from .models import Resident


class ResidentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name = serializers.CharField(source="user.last_name", read_only=True)
    building_name = serializers.CharField(source="building.name", read_only=True)
    
    # Πεδία για δημιουργία
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    building_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Resident
        fields = [
            "id",
            "user_email",
            "user_first_name", 
            "user_last_name",
            "building_name",
            "apartment",
            "building",
            "role",
            "phone",
            "created_at",
            # Πεδία για δημιουργία
            "email",
            "first_name", 
            "last_name",
            "password",
            "building_id",
        ]
        read_only_fields = ["id", "created_at", "user_email", "user_first_name", "user_last_name", "building_name"]
