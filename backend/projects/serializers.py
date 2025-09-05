from rest_framework import serializers
from .models import Project, Offer, Contract, Milestone, RFQ


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'building', 'project_type', 'status',
            'budget', 'actual_cost', 'start_date', 'end_date', 'estimated_duration',
            'location', 'specifications', 'requirements', 'notes', 'attachment',
            'created_by', 'created_at', 'updated_at', 'progress_percentage'
        ]
        read_only_fields = ['created_at', 'updated_at', 'progress_percentage']


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = [
            'id', 'project', 'rfq', 'contractor', 'amount', 'description',
            'technical_specifications', 'delivery_time', 'warranty_period',
            'status', 'submitted_date', 'evaluation_date', 'evaluation_notes',
            'evaluation_score', 'offer_file', 'created_by'
        ]
        read_only_fields = ['submitted_date']


class RFQSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFQ
        fields = [
            'id', 'project', 'title', 'description', 'due_date', 'status',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = [
            'id', 'project', 'contractor', 'offer', 'contract_type',
            'contract_number', 'title', 'description', 'amount',
            'start_date', 'end_date', 'status', 'payment_terms',
            'warranty_terms', 'contract_file', 'notes',
            'created_by', 'created_at', 'updated_at', 'is_active', 'days_remaining'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_active', 'days_remaining']


class MilestoneSerializer(serializers.ModelSerializer):
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = Milestone
        fields = [
            'id', 'project', 'project_title', 'title', 'description', 'due_at', 'amount',
            'status', 'approved_at', 'created_by', 'created_at', 'updated_at', 'is_overdue'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_overdue']
