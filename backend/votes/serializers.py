# backend/votes/serializers.py
from rest_framework import serializers
from .models import Vote, VoteSubmission
from buildings.models import Building

class VoteSerializer(serializers.ModelSerializer):
    # Ορίζουμε τα πεδία βάσει του μοντέλου Vote
    # Θεωρούμε ότι το μοντέλο έχει πεδία: id, title, description, created_at, building, creator
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all()
    )
    creator = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Vote
        fields = [
            'id',
            'title',         # Το πεδίο που υπάρχει στο μοντέλο
            'description',   # Προσθήκη περιγραφής αντί για question
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
