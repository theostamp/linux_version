# backend/votes/serializers.py
from rest_framework import serializers
from .models import Vote, VoteSubmission
from buildings.models import Building

class VoteSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    creator = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Vote
        fields = [
            'id',
            'title',
            'description',
            'start_date',   # ✅ προσθήκη
            'end_date',     # ✅ προσθήκη
            'created_at',
            'building',
            'creator',
        ]
        read_only_fields = ['id', 'created_at', 'creator']


class VoteSubmissionSerializer(serializers.ModelSerializer):
    vote = serializers.PrimaryKeyRelatedField(read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = VoteSubmission
        fields = [
            'id',
            'choice',
            'submitted_at',
            'vote',
            'user',
        ]
        read_only_fields = ['id', 'submitted_at', 'vote', 'user']
