from rest_framework import serializers
from .models import Project, Offer, OfferFile, ProjectVote, ProjectExpense


class ProjectSerializer(serializers.ModelSerializer):
    offers_count = serializers.SerializerMethodField()
    votes_count = serializers.SerializerMethodField()
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    # 🔒 Payment lock fields
    payment_fields_locked = serializers.BooleanField(read_only=True)
    payment_lock_reason = serializers.SerializerMethodField()
    expenses_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'building', 'building_name',
            'estimated_cost', 'priority', 'status', 'created_at', 'updated_at',
            'deadline', 'tender_deadline', 'general_assembly_date',
            'assembly_time', 'assembly_is_online', 'assembly_is_physical', 'assembly_location', 'assembly_zoom_link',
            'assembly_zoom_meeting_id', 'assembly_zoom_password', 'assembly_zoom_waiting_room',
            'assembly_zoom_participant_video', 'assembly_zoom_host_video', 'assembly_zoom_mute_on_entry',
            'assembly_zoom_auto_record', 'assembly_zoom_notes',
            'selected_contractor', 'final_cost', 'payment_terms',
            'payment_method', 'installments', 'advance_payment',
            'created_by', 'created_by_name', 'offers_count', 'votes_count',
            'linked_expense',
            # New lock fields
            'payment_fields_locked', 'payment_lock_reason', 'expenses_count',
        ]
        read_only_fields = ['created_at', 'updated_at', 'offers_count', 'votes_count', 'payment_fields_locked', 'payment_lock_reason', 'expenses_count']

    def get_offers_count(self, obj):
        return obj.offers.count()

    def get_votes_count(self, obj):
        return obj.votes.count()

    def get_payment_lock_reason(self, obj):
        return obj.get_payment_lock_reason()

    def get_expenses_count(self, obj):
        return obj.project_expenses.count()


class OfferSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)
    building_name = serializers.CharField(source='project.building.name', read_only=True)
    files_count = serializers.SerializerMethodField()
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    
    class Meta:
        model = Offer
        fields = [
            'id', 'project', 'project_title', 'building_name',
            'contractor_name', 'contractor_contact', 'contractor_phone',
            'contractor_email', 'contractor_address', 'amount', 'description',
            'payment_terms', 'payment_method', 'installments', 'advance_payment',
            'warranty_period', 'completion_time',
            'status', 'submitted_at', 'reviewed_at', 'notes',
            'reviewed_by', 'reviewed_by_name', 'files_count'
        ]
        read_only_fields = ['submitted_at', 'files_count']

    def validate_contractor_name(self, value):
        """Ensure contractor_name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Το όνομά του συνεργείου είναι υποχρεωτικό.")
        return value.strip()

    def validate_amount(self, value):
        """Ensure amount is positive"""
        if value is None:
            raise serializers.ValidationError("Το ποσό είναι υποχρεωτικό.")
        if value <= 0:
            raise serializers.ValidationError("Το ποσό πρέπει να είναι μεγαλύτερο από 0.")
        return value

    def validate_project(self, value):
        """Ensure project exists and user has access"""
        if not value:
            raise serializers.ValidationError("Το έργο είναι υποχρεωτικό.")
        # Project existence is validated by ForeignKey, but we can add custom checks here
        return value

    def validate_payment_method(self, value):
        """Validate payment_method against known choices"""
        if value:
            valid_methods = ['one_time', 'installments', 'milestones', 'other']
            if value not in valid_methods:
                raise serializers.ValidationError(
                    f"Μη έγκυρος τρόπος πληρωμής. Επιτρέπονται: {', '.join(valid_methods)}"
                )
        return value

    def validate_installments(self, value):
        """Ensure installments is positive if provided"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Ο αριθμός δόσεων πρέπει να είναι μεγαλύτερος από 0.")
        return value

    def validate_advance_payment(self, value):
        """Ensure advance_payment is <= amount if provided"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Η προκαταβολή δεν μπορεί να είναι αρνητική.")
        # Check against amount if available (will be done in validate() method)
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        # Validate advance_payment <= amount
        advance_payment = attrs.get('advance_payment')
        amount = attrs.get('amount')
        
        if advance_payment is not None and amount is not None:
            if advance_payment > amount:
                raise serializers.ValidationError({
                    'advance_payment': 'Η προκαταβολή δεν μπορεί να είναι μεγαλύτερη από το συνολικό ποσό.'
                })
        
        # Validate installments if payment_method requires it
        payment_method = attrs.get('payment_method')
        installments = attrs.get('installments')
        
        if payment_method == 'installments' and (installments is None or installments <= 0):
            raise serializers.ValidationError({
                'installments': 'Ο αριθμός δόσεων είναι υποχρεωτικός όταν ο τρόπος πληρωμής είναι "Δόσεις".'
            })
        
        return attrs

    def get_files_count(self, obj):
        return obj.files.count()


class OfferFileSerializer(serializers.ModelSerializer):
    offer_contractor = serializers.CharField(source='offer.contractor_name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = OfferFile
        fields = [
            'id', 'offer', 'offer_contractor', 'file', 'filename',
            'file_type', 'file_size', 'uploaded_at', 'uploaded_by',
            'uploaded_by_name'
        ]
        read_only_fields = ['uploaded_at', 'file_size']


class ProjectVoteSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)
    offer_contractor = serializers.CharField(source='offer.contractor_name', read_only=True)
    
    class Meta:
        model = ProjectVote
        fields = [
            'id', 'project', 'project_title', 'offer', 'offer_contractor',
            'vote_type', 'voter_name', 'apartment', 'participation_mills',
            'voted_at', 'notes'
        ]
        read_only_fields = ['voted_at']


class ProjectExpenseSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ProjectExpense
        fields = [
            'id', 'project', 'project_title', 'description', 'expense_type',
            'amount', 'expense_date', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['created_at']


class ProjectDetailSerializer(ProjectSerializer):
    """Extended serializer for project detail view with related data"""
    offers = OfferSerializer(many=True, read_only=True)
    project_votes = ProjectVoteSerializer(many=True, read_only=True)
    expenses = ProjectExpenseSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['offers', 'project_votes', 'expenses']


class OfferDetailSerializer(OfferSerializer):
    """Extended serializer for offer detail view with files"""
    files = OfferFileSerializer(many=True, read_only=True)
    
    class Meta(OfferSerializer.Meta):
        fields = OfferSerializer.Meta.fields + ['files']
