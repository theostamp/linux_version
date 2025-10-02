from rest_framework import serializers
from .models import Project, Offer, OfferFile, ProjectVote, ProjectExpense


class ProjectSerializer(serializers.ModelSerializer):
    offers_count = serializers.SerializerMethodField()
    votes_count = serializers.SerializerMethodField()
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'building', 'building_name',
            'estimated_cost', 'priority', 'status', 'created_at', 'updated_at',
            'deadline', 'tender_deadline', 'general_assembly_date',
            'assembly_time', 'assembly_is_online', 'assembly_location', 'assembly_zoom_link',
            'selected_contractor', 'final_cost', 'payment_terms',
            'payment_method', 'installments', 'advance_payment',
            'created_by', 'created_by_name', 'offers_count', 'votes_count',
            'linked_expense'
        ]
        read_only_fields = ['created_at', 'updated_at', 'offers_count', 'votes_count']

    def get_offers_count(self, obj):
        return obj.offers.count()

    def get_votes_count(self, obj):
        return obj.votes.count()


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
    votes = ProjectVoteSerializer(many=True, read_only=True)
    expenses = ProjectExpenseSerializer(many=True, read_only=True)
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['offers', 'votes', 'expenses']


class OfferDetailSerializer(OfferSerializer):
    """Extended serializer for offer detail view with files"""
    files = OfferFileSerializer(many=True, read_only=True)
    
    class Meta(OfferSerializer.Meta):
        fields = OfferSerializer.Meta.fields + ['files']
