from rest_framework import serializers
from announcements.models import Announcement
from votes.models import Vote

class AnnouncementPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'description', 'file', 'start_date', 'end_date']

class VotePublicSerializer(serializers.ModelSerializer):
    results = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    participation_percentage = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    min_participation = serializers.IntegerField()

    def get_results(self, obj: Vote):
        try:
            return obj.get_results()
        except Exception:
            return None

    def get_total_votes(self, obj: Vote):
        return getattr(obj, 'total_votes', 0)

    def get_participation_percentage(self, obj: Vote):
        return getattr(obj, 'participation_percentage', 0)

    def get_is_valid(self, obj: Vote):
        return getattr(obj, 'is_valid_result', False)

    class Meta:
        model = Vote
        fields = [
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'min_participation',
            'total_votes',
            'participation_percentage',
            'is_valid',
            'results',
        ]