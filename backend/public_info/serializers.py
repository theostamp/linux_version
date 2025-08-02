from rest_framework import serializers
from announcements.models import Announcement
from votes.models import Vote

class AnnouncementPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'description', 'file', 'start_date', 'end_date']

class VotePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['id', 'title', 'description', 'start_date', 'end_date']