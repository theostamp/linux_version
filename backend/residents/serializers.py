from rest_framework import serializers
from .models import Resident


class ResidentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Resident
        fields = [
            "id",
            "user_email",
            "apartment",
            "building",
            "role",
            "phone",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
