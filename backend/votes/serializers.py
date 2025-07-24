# backend/votes/serializers.py
from rest_framework import serializers
from .models import Vote, VoteSubmission
from buildings.models import Building

class VoteSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    creator = serializers.HiddenField(default=serializers.CurrentUserDefault())
    choices = serializers.SerializerMethodField()
    is_currently_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    participation_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Vote
        fields = [
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
            'building',
            'creator',
            'creator_name',
            'is_active',
            'is_urgent',
            'min_participation',
            'choices',
            'is_currently_active',
            'days_remaining',
            'status_display',
            'total_votes',
            'participation_percentage',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'creator', 'creator_name']

    def validate_building(self, value):
        user = self.context['request'].user
        if hasattr(value, 'manager') and value.manager is not None:
            if not (user.is_superuser or value.manager == user):
                raise serializers.ValidationError("Δεν έχετε δικαίωμα διαχείρισης για αυτό το κτήριο.")
        elif not user.is_superuser:
            raise serializers.ValidationError("Μόνο διαχειριστές ή superusers μπορούν να δημιουργήσουν ψηφοφορία σε αυτό το κτήριο.")
        return value

    def validate(self, data):
        """Validation για τις ημερομηνίες και την ελάχιστη συμμετοχή"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        min_participation = data.get('min_participation', 0)

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if min_participation < 0 or min_participation > 100:
            raise serializers.ValidationError("Το ελάχιστο ποσοστό συμμετοχής πρέπει να είναι μεταξύ 0-100%")

        return data

    def get_choices(self, obj):
        return [choice[0] for choice in VoteSubmission.CHOICES]

    def get_is_currently_active(self, obj):
        return obj.is_currently_active

    def get_days_remaining(self, obj):
        return obj.days_remaining

    def get_status_display(self, obj):
        return obj.status_display

    def get_creator_name(self, obj):
        return obj.creator.get_full_name() or obj.creator.username if obj.creator else "Άγνωστος"

    def get_total_votes(self, obj):
        return obj.total_votes

    def get_participation_percentage(self, obj):
        return obj.participation_percentage

class VoteSubmissionSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = VoteSubmission
        fields = ['id', 'vote', 'user', 'user_name', 'choice', 'submitted_at', 'updated_at']
        read_only_fields = ['id', 'user', 'user_name', 'submitted_at', 'updated_at']

    def validate(self, data):
        """Validation για την ψήφο"""
        vote = data.get('vote')
        user = self.context['request'].user

        if not vote.is_currently_active:
            raise serializers.ValidationError("Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή")

        # Έλεγχος αν ο χρήστης έχει ήδη ψηφίσει
        if VoteSubmission.objects.filter(vote=vote, user=user).exists():
            raise serializers.ValidationError("Έχετε ήδη ψηφίσει σε αυτή τη ψηφοφορία")

        return data

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

class VoteResultsSerializer(serializers.Serializer):
    """Serializer για τα αποτελέσματα ψηφοφορίας"""
    ΝΑΙ = serializers.IntegerField()
    ΟΧΙ = serializers.IntegerField()
    ΛΕΥΚΟ = serializers.IntegerField()
    total = serializers.IntegerField()
    participation_percentage = serializers.FloatField()
    is_valid = serializers.BooleanField()
    min_participation = serializers.IntegerField()

class VoteListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    creator_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    
    class Meta:
        model = Vote
        fields = [
            'id', 'title', 'created_at', 'is_urgent', 'is_currently_active',
            'creator_name', 'building_name', 'total_votes', 'days_remaining'
        ]

    def get_creator_name(self, obj):
        return obj.creator.get_full_name() or obj.creator.username if obj.creator else "Άγνωστος"

    def get_building_name(self, obj):
        return obj.building.name

    def get_total_votes(self, obj):
        return obj.total_votes
