"""
Assembly Serializers
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    Assembly, AgendaItem, AgendaItemAttachment,
    AssemblyAttendee, AssemblyVote, AssemblyMinutesTemplate,
    CommunityPoll, PollOption, PollVote
)


class PollOptionSerializer(serializers.ModelSerializer):
    """Serializer για επιλογές δημοσκόπησης"""
    
    class Meta:
        model = PollOption
        fields = ['id', 'text', 'order']


class CommunityPollSerializer(serializers.ModelSerializer):
    """Serializer για δημοσκοπήσεις κοινότητας"""
    
    options = PollOptionSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    vote_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunityPoll
        fields = [
            'id', 'building', 'title', 'description', 'author', 'author_name',
            'is_active', 'allow_multiple_choices', 'expires_at', 'is_expired',
            'options', 'vote_count', 'has_voted', 'created_at'
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_vote_count(self, obj):
        return obj.votes.count()

    def get_has_voted(self, obj):
        user = self.context.get('request').user
        if not user or user.is_anonymous:
            return False
        return obj.votes.filter(user=user).exists()


class PollVoteSerializer(serializers.ModelSerializer):
    """Serializer για ψήφους σε δημοσκόπηση"""
    
    class Meta:
        model = PollVote
        fields = ['id', 'poll', 'option', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class AgendaItemAttachmentSerializer(serializers.ModelSerializer):
    """Serializer για συνημμένα αρχεία θεμάτων"""
    
    class Meta:
        model = AgendaItemAttachment
        fields = [
            'id', 'filename', 'file', 'file_type', 'file_size',
            'description', 'uploaded_at', 'uploaded_by'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by', 'file_size', 'file_type']


class AssemblyVoteSerializer(serializers.ModelSerializer):
    """Serializer για ψήφους συνέλευσης"""
    
    attendee_name = serializers.CharField(source='attendee.display_name', read_only=True)
    apartment_number = serializers.CharField(source='attendee.apartment.number', read_only=True)
    vote_display = serializers.CharField(source='get_vote_display', read_only=True)
    
    class Meta:
        model = AssemblyVote
        fields = [
            'id', 'agenda_item', 'attendee', 'attendee_name', 'apartment_number',
            'vote', 'vote_display', 'mills', 'vote_source', 'voted_at', 'notes'
        ]
        read_only_fields = ['id', 'voted_at']


class AgendaItemSerializer(serializers.ModelSerializer):
    """Serializer για θέματα ημερήσιας διάταξης"""
    
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    voting_type_display = serializers.CharField(source='get_voting_type_display', read_only=True)
    time_status = serializers.CharField(read_only=True)
    is_voting_item = serializers.BooleanField(read_only=True)
    
    presenter_name_display = serializers.SerializerMethodField()
    vote_results = serializers.SerializerMethodField()
    attachments = AgendaItemAttachmentSerializer(many=True, read_only=True)
    
    linked_project_title = serializers.CharField(source='linked_project.title', read_only=True)
    
    class Meta:
        model = AgendaItem
        fields = [
            'id', 'assembly', 'order', 'title', 'description',
            'item_type', 'item_type_display',
            'estimated_duration', 'actual_duration',
            'started_at', 'ended_at',
            'presenter', 'presenter_name', 'presenter_name_display',
            'status', 'status_display', 'time_status',
            'voting_type', 'voting_type_display', 'allows_pre_voting',
            'is_voting_item', 'linked_vote',
            'linked_project', 'linked_project_title',
            'decision', 'decision_type', 'discussion_notes',
            'has_attachments', 'attachments',
            'vote_results',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'linked_vote', 'actual_duration', 'started_at', 'ended_at',
            'created_at', 'updated_at'
        ]
    
    def get_presenter_name_display(self, obj):
        if obj.presenter_name:
            return obj.presenter_name
        if obj.presenter:
            return obj.presenter.get_full_name() or obj.presenter.email
        return None
    
    def get_vote_results(self, obj):
        """Υπολογίζει τα αποτελέσματα ψηφοφορίας"""
        if not obj.is_voting_item:
            return None
        
        votes = obj.assembly_votes.all()
        if not votes.exists():
            return None
        
        approve_mills = sum(v.mills for v in votes if v.vote == 'approve')
        reject_mills = sum(v.mills for v in votes if v.vote == 'reject')
        abstain_mills = sum(v.mills for v in votes if v.vote == 'abstain')
        total_mills = approve_mills + reject_mills + abstain_mills
        
        approve_votes = votes.filter(vote='approve').count()
        reject_votes = votes.filter(vote='reject').count()
        abstain_votes = votes.filter(vote='abstain').count()
        
        return {
            'total_votes': votes.count(),
            'approve_votes': approve_votes,
            'reject_votes': reject_votes,
            'abstain_votes': abstain_votes,
            'approve_mills': approve_mills,
            'reject_mills': reject_mills,
            'abstain_mills': abstain_mills,
            'total_mills': total_mills,
            'approve_percentage': round(approve_mills * 100 / total_mills, 1) if total_mills > 0 else 0,
            'reject_percentage': round(reject_mills * 100 / total_mills, 1) if total_mills > 0 else 0,
            'abstain_percentage': round(abstain_mills * 100 / total_mills, 1) if total_mills > 0 else 0,
        }


class AgendaItemCreateSerializer(serializers.ModelSerializer):
    """Serializer για δημιουργία θεμάτων"""
    
    class Meta:
        model = AgendaItem
        fields = [
            'order', 'title', 'description', 'item_type',
            'estimated_duration', 'presenter', 'presenter_name',
            'voting_type', 'allows_pre_voting', 'linked_project'
        ]
    
    def validate_order(self, value):
        assembly = self.context.get('assembly')
        if assembly and AgendaItem.objects.filter(assembly=assembly, order=value).exists():
            raise serializers.ValidationError("Αυτή η σειρά υπάρχει ήδη")
        return value


class AssemblyAttendeeSerializer(serializers.ModelSerializer):
    """Serializer για παρόντες συνέλευσης"""
    
    display_name = serializers.CharField(read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    rsvp_status_display = serializers.CharField(source='get_rsvp_status_display', read_only=True)
    attendance_type_display = serializers.CharField(source='get_attendance_type_display', read_only=True)
    has_completed_voting = serializers.BooleanField(read_only=True)
    pending_votes_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AssemblyAttendee
        fields = [
            'id', 'assembly', 'apartment', 'apartment_number',
            'user', 'display_name', 'mills',
            'rsvp_status', 'rsvp_status_display', 'rsvp_at', 'rsvp_notes',
            'attendance_type', 'attendance_type_display',
            'is_present', 'checked_in_at', 'checked_out_at',
            'is_proxy', 'proxy_from_apartment',
            'has_pre_voted', 'pre_voted_at',
            'has_completed_voting', 'pending_votes_count',
            'attendee_name', 'attendee_phone',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'mills', 'checked_in_at', 'checked_out_at',
            'rsvp_at', 'pre_voted_at', 'created_at', 'updated_at'
        ]


class AssemblyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer για λίστα συνελεύσεων"""
    
    building_name = serializers.CharField(source='building.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assembly_type_display = serializers.CharField(source='get_assembly_type_display', read_only=True)
    quorum_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    quorum_status = serializers.CharField(read_only=True)
    agenda_items_count = serializers.SerializerMethodField()
    attendees_count = serializers.SerializerMethodField()
    is_upcoming = serializers.BooleanField(read_only=True)
    is_pre_voting_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Assembly
        fields = [
            'id', 'title', 'building', 'building_name',
            'assembly_type', 'assembly_type_display',
            'scheduled_date', 'scheduled_time', 'estimated_duration',
            'status', 'status_display',
            'is_physical', 'is_online', 'location',
            'quorum_percentage', 'quorum_achieved', 'quorum_status',
            'agenda_items_count', 'attendees_count',
            'is_upcoming', 'is_pre_voting_active',
            'pre_voting_enabled',
            'invitation_sent',
            'created_at'
        ]
    
    def get_agenda_items_count(self, obj):
        return obj.agenda_items.count()
    
    def get_attendees_count(self, obj):
        return obj.attendees.filter(is_present=True).count()


class AssemblyDetailSerializer(serializers.ModelSerializer):
    """Full serializer για λεπτομέρειες συνέλευσης"""
    
    building_name = serializers.CharField(source='building.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assembly_type_display = serializers.CharField(source='get_assembly_type_display', read_only=True)
    
    required_quorum_mills = serializers.IntegerField(read_only=True)
    quorum_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    quorum_status = serializers.CharField(read_only=True)
    total_agenda_duration = serializers.IntegerField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_pre_voting_active = serializers.BooleanField(read_only=True)
    
    agenda_items = AgendaItemSerializer(many=True, read_only=True)
    attendees = AssemblyAttendeeSerializer(many=True, read_only=True)
    
    created_by_name = serializers.SerializerMethodField()
    continued_from_title = serializers.CharField(source='continued_from.title', read_only=True)
    
    # Statistics
    stats = serializers.SerializerMethodField()
    
    class Meta:
        model = Assembly
        fields = [
            'id', 'title', 'building', 'building_name',
            'assembly_type', 'assembly_type_display',
            'description',
            'scheduled_date', 'scheduled_time', 'estimated_duration',
            'is_physical', 'is_online', 'location',
            'meeting_link', 'meeting_id', 'meeting_password',
            'total_building_mills', 'required_quorum_percentage',
            'required_quorum_mills', 'achieved_quorum_mills',
            'quorum_achieved', 'quorum_achieved_at', 'quorum_percentage', 'quorum_status',
            'status', 'status_display',
            'actual_start_time', 'actual_end_time',
            'pre_voting_enabled', 'pre_voting_start_date', 'pre_voting_end_date',
            'is_pre_voting_active',
            'minutes_text', 'minutes_approved', 'minutes_approved_at',
            'invitation_sent', 'invitation_sent_at', 'linked_announcement',
            'continued_from', 'continued_from_title',
            'total_agenda_duration', 'is_upcoming',
            'agenda_items', 'attendees',
            'stats',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'achieved_quorum_mills', 'quorum_achieved', 'quorum_achieved_at',
            'actual_start_time', 'actual_end_time',
            'minutes_approved_at', 'invitation_sent_at',
            'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_stats(self, obj):
        attendees = obj.attendees.all()
        agenda_items = obj.agenda_items.all()
        
        return {
            'total_apartments_invited': attendees.count(),
            'rsvp_attending': attendees.filter(rsvp_status='attending').count(),
            'rsvp_not_attending': attendees.filter(rsvp_status='not_attending').count(),
            'rsvp_pending': attendees.filter(rsvp_status='pending').count(),
            'present_count': attendees.filter(is_present=True).count(),
            'pre_voted_count': attendees.filter(has_pre_voted=True).count(),
            'agenda_items_total': agenda_items.count(),
            'agenda_items_completed': agenda_items.filter(status='completed').count(),
            'agenda_items_pending': agenda_items.filter(status='pending').count(),
            'voting_items_count': agenda_items.filter(item_type='voting').count(),
        }


class AssemblyCreateSerializer(serializers.ModelSerializer):
    """Serializer για δημιουργία συνέλευσης"""
    
    agenda_items = AgendaItemCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Assembly
        fields = [
            'title', 'building', 'assembly_type', 'description',
            'scheduled_date', 'scheduled_time', 'estimated_duration',
            'is_physical', 'is_online', 'location',
            'meeting_link', 'meeting_id', 'meeting_password',
            'total_building_mills', 'required_quorum_percentage',
            'pre_voting_enabled', 'pre_voting_start_date', 'pre_voting_end_date',
            'agenda_items'
        ]
    
    def validate(self, data):
        # Validate pre-voting dates
        if data.get('pre_voting_enabled'):
            scheduled_date = data.get('scheduled_date')
            pre_start = data.get('pre_voting_start_date')
            pre_end = data.get('pre_voting_end_date')
            
            if pre_start and pre_end and pre_start > pre_end:
                raise serializers.ValidationError({
                    'pre_voting_start_date': 'Η έναρξη pre-voting πρέπει να είναι πριν τη λήξη'
                })

            if scheduled_date and pre_end and pre_end > scheduled_date:
                raise serializers.ValidationError({
                    'pre_voting_end_date': 'Η λήξη pre-voting πρέπει να είναι πριν ή την ημέρα της συνέλευσης'
                })
        
        return data
    
    def create(self, validated_data):
        agenda_items_data = validated_data.pop('agenda_items', [])
        # Όλες οι νέες συνελεύσεις δημιουργούνται ως "scheduled" (όχι draft)
        validated_data['status'] = 'scheduled'
        assembly = Assembly.objects.create(**validated_data)
        
        for item_data in agenda_items_data:
            AgendaItem.objects.create(assembly=assembly, **item_data)
        
        return assembly


class AssemblyMinutesTemplateSerializer(serializers.ModelSerializer):
    """Serializer για templates πρακτικών"""
    
    class Meta:
        model = AssemblyMinutesTemplate
        fields = [
            'id', 'name', 'description', 'building', 'is_default',
            'header_template', 'agenda_item_template',
            'attendees_template', 'footer_template',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Action Serializers

class CheckInSerializer(serializers.Serializer):
    """Serializer για check-in παρόντος"""
    attendance_type = serializers.ChoiceField(
        choices=AssemblyAttendee.ATTENDANCE_TYPE_CHOICES,
        default='in_person'
    )


class RSVPSerializer(serializers.Serializer):
    """Serializer για RSVP"""
    rsvp_status = serializers.ChoiceField(
        choices=AssemblyAttendee.RSVP_STATUS_CHOICES
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class CastVoteSerializer(serializers.Serializer):
    """Serializer για ψηφοφορία"""
    vote = serializers.ChoiceField(choices=AssemblyVote.VOTE_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)


class StartAssemblySerializer(serializers.Serializer):
    """Serializer για έναρξη συνέλευσης"""
    pass


class EndAssemblySerializer(serializers.Serializer):
    """Serializer για λήξη συνέλευσης"""
    pass


class AdjournAssemblySerializer(serializers.Serializer):
    """Serializer για αναβολή συνέλευσης"""
    continuation_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True)


class EndAgendaItemSerializer(serializers.Serializer):
    """Serializer για ολοκλήρωση θέματος"""
    decision = serializers.CharField(required=False, allow_blank=True)
    decision_type = serializers.ChoiceField(
        choices=[
            ('approved', 'Εγκρίθηκε'),
            ('rejected', 'Απορρίφθηκε'),
            ('deferred', 'Αναβλήθηκε'),
            ('amended', 'Εγκρίθηκε με Τροποποιήσεις'),
            ('no_decision', 'Χωρίς Απόφαση'),
        ],
        required=False
    )


class GenerateMinutesSerializer(serializers.Serializer):
    """Serializer για δημιουργία πρακτικών"""
    template_id = serializers.UUIDField(required=False)
    secretary_name = serializers.CharField(required=False)
    chairman_name = serializers.CharField(required=False)
