# backend/votes/serializers.py
from rest_framework import serializers
from .models import Vote, VoteSubmission
from buildings.models import Building

class VoteSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    creator = serializers.HiddenField(default=serializers.CurrentUserDefault())
    choices = serializers.SerializerMethodField()

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
            'choices',
        ]
        read_only_fields = ['id', 'created_at', 'creator', 'choices']

    def get_choices(self, obj):
        return [choice[0] for choice in VoteSubmission.CHOICES]


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
