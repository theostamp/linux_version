# backend/votes/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Vote, VoteSubmission
from buildings.models import Building
from projects.models import Project
from todo_management.models import TodoItem

User = get_user_model()

class VoteSerializer(serializers.ModelSerializer):
    building = serializers.PrimaryKeyRelatedField(
        queryset=Building.objects.all(),
        required=False,
        allow_null=True
    )
    creator = serializers.HiddenField(default=serializers.CurrentUserDefault())
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    choices = serializers.SerializerMethodField()
    is_currently_active = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    eligible_voters_count = serializers.SerializerMethodField()
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
            'building_name',
            'project',
            'project_title',
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
            'eligible_voters_count',
            'participation_percentage',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'creator', 'creator_name', 'project_title']

    def validate_building(self, value):
        user = self.context['request'].user
        
        # Superusers και staff έχουν πλήρη πρόσβαση
        if user.is_superuser or user.is_staff:
            return value
        
        # Office managers (role='manager') έχουν πλήρη πρόσβαση
        if getattr(user, 'is_office_manager', False) or user.role == 'manager':
            return value
        
        # Internal managers μπορούν να δημιουργήσουν ψηφοφορίες ΜΟΝΟ για τη δική τους πολυκατοικία
        if getattr(user, 'is_internal_manager', False) or user.role == 'internal_manager':
            if value is None:
                # Internal managers ΔΕΝ μπορούν να δημιουργήσουν καθολικές ψηφοφορίες
                raise serializers.ValidationError("Οι εσωτερικοί διαχειριστές δεν μπορούν να δημιουργήσουν καθολικές ψηφοφορίες. Επιλέξτε το κτίριό σας.")
            
            # Έλεγχος αν ο internal_manager διαχειρίζεται αυτό το κτίριο
            if hasattr(user, 'is_internal_manager_of') and user.is_internal_manager_of(value):
                return value
            
            raise serializers.ValidationError("Μπορείτε να δημιουργήσετε ψηφοφορία μόνο για το κτίριο που διαχειρίζεστε.")
        
        # Regular managers μπορούν να δημιουργήσουν ψηφοφορίες στα κτίρια που διαχειρίζονται
        if value is not None and hasattr(value, 'manager') and value.manager == user:
            return value
                
        raise serializers.ValidationError("Δεν έχετε δικαίωμα διαχείρισης για αυτό το κτήριο.")

    def validate(self, data):
        """Validation για τις ημερομηνίες, την ελάχιστη συμμετοχή και duplicate votes"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        min_participation = data.get('min_participation', 0)
        building = data.get('building')
        title = data.get('title')
        
        # Αν είναι update, παίρνουμε το instance
        instance = self.instance

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("Η ημερομηνία έναρξης δεν μπορεί να είναι μετά την ημερομηνία λήξης")
        
        if min_participation < 0 or min_participation > 100:
            raise serializers.ValidationError("Το ελάχιστο ποσοστό συμμετοχής πρέπει να είναι μεταξύ 0-100%")

        # Έλεγχος για duplicate votes (ίδιος τίτλος, ίδιο κτίριο, ίδια ημερομηνία έναρξης)
        # Μόνο για create operations (όχι για updates)
        if not instance and title and building and start_date:
            existing_vote = Vote.objects.filter(
                title__iexact=title.strip(),
                building=building,
                start_date=start_date
            ).first()
            
            if existing_vote:
                raise serializers.ValidationError({
                    'title': f'Υπάρχει ήδη ψηφοφορία με τον ίδιο τίτλο "{title}" για το ίδιο κτίριο και την ίδια ημερομηνία έναρξης.'
                })

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
        # NOTE: Be careful with Python operator precedence: the conditional expression has
        # lower precedence than `or`, so without parentheses we'd evaluate `obj.creator`
        # even when it's None and crash with AttributeError.
        return (obj.creator.get_full_name() or obj.creator.email) if obj.creator else "Άγνωστος"
    
    def get_project_title(self, obj):
        return obj.project.title if obj.project else None

    def get_building_name(self, obj):
        return obj.building.name if obj.building else "Όλα τα κτίρια"

    def get_total_votes(self, obj):
        return obj.total_votes

    def get_eligible_voters_count(self, obj):
        return obj.eligible_voters_count

    def get_participation_percentage(self, obj):
        return obj.participation_percentage

class VoteSubmissionSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    user_name = serializers.SerializerMethodField()
    vote_source_display = serializers.CharField(source='get_vote_source_display', read_only=True)
    receipt_id = serializers.UUIDField(source='last_event.receipt_id', read_only=True, allow_null=True)
    last_submitted_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = VoteSubmission
        fields = [
            'id', 'vote', 'user', 'user_name', 'choice', 'vote_source', 'vote_source_display',
            'submitted_at', 'updated_at', 'last_submitted_at', 'receipt_id'
        ]
        read_only_fields = [
            'id', 'vote', 'user', 'user_name', 'vote_source_display', 'submitted_at',
            'updated_at', 'last_submitted_at', 'receipt_id'
        ]

    def validate(self, data):
        """Validation για την ψήφο - το vote object περνιέται από το view context"""
        vote = self.context.get('vote')
        user = self.context['request'].user

        if vote:
            # 🔒 IMPORTANT: Reject VoteSubmission creation for linked votes
            # Linked votes should use AssemblyVote (canonical source), not VoteSubmission
            try:
                agenda_item = vote.agenda_item
                if agenda_item:
                    raise serializers.ValidationError(
                        "Αυτή η ψηφοφορία είναι συνδεδεμένη με συνέλευση. "
                        "Για να ψηφίσετε, χρησιμοποιήστε τη σελίδα της συνέλευσης."
                    )
            except Exception:
                # agenda_item doesn't exist or vote is not linked - continue with normal validation
                pass
            
            if not vote.is_currently_active:
                raise serializers.ValidationError("Η ψηφοφορία δεν είναι ενεργή αυτή τη στιγμή")

        return data


class VoteTaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    priority = serializers.ChoiceField(required=False, choices=TodoItem.PRIORITY_CHOICES)
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

class VoteResultsSerializer(serializers.Serializer):
    """Serializer για τα αποτελέσματα ψηφοφορίας"""
    ΝΑΙ = serializers.IntegerField()
    ΟΧΙ = serializers.IntegerField()
    ΛΕΥΚΟ = serializers.IntegerField()
    total = serializers.IntegerField()
    eligible_voters = serializers.IntegerField()
    participation_percentage = serializers.FloatField()
    is_valid = serializers.BooleanField()
    min_participation = serializers.IntegerField()
    by_source = serializers.DictField(required=False)
    source_details = serializers.DictField(required=False)

class VoteListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    creator_name = serializers.SerializerMethodField()
    building_name = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    eligible_voters_count = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    participation_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Vote
        fields = [
            # Core fields used by the frontend list & dashboard
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
            'building',
            'building_name',
            'is_urgent',
            'is_currently_active',
            'creator_name',
            'total_votes',
            'eligible_voters_count',
            'participation_percentage',
            'min_participation',
            'days_remaining',
            'is_active',
        ]

    def get_creator_name(self, obj):
        return (obj.creator.get_full_name() or obj.creator.email) if obj.creator else "Άγνωστος"

    def get_building_name(self, obj):
        return obj.building.name if obj.building else "Όλα τα κτίρια"

    def get_total_votes(self, obj):
        return obj.total_votes
    
    def get_eligible_voters_count(self, obj):
        return obj.eligible_voters_count
        
    def get_days_remaining(self, obj):
        return obj.days_remaining

    def get_participation_percentage(self, obj):
        return obj.participation_percentage
