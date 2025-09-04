from rest_framework import serializers
from .models import Project, Offer, Contract, ProcurementEvent, Decision, ProjectTask


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'building', 'project_type', 'status',
            'budget', 'actual_cost', 'start_date', 'end_date', 'estimated_duration',
            'location', 'specifications', 'requirements', 'notes',
            'decision_mode', 'direct_assignment_reason', 'policy_threshold_exceeded', 'visibility',
            'created_by', 'created_at', 'updated_at', 'progress_percentage'
        ]
        read_only_fields = ['created_at', 'updated_at', 'progress_percentage']


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = [
            'id', 'project', 'contractor', 'amount', 'description',
            'technical_specifications', 'delivery_time', 'warranty_period',
            'status', 'submitted_date', 'evaluation_date', 'evaluation_notes',
            'evaluation_score', 'currency', 'tax_included', 'valid_until', 'scoring_breakdown', 'is_awarded',
            'offer_file', 'created_by'
        ]
        read_only_fields = ['submitted_date']


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = [
            'id', 'project', 'contractor', 'offer', 'contract_type',
            'contract_number', 'title', 'description', 'amount',
            'start_date', 'end_date', 'status', 'payment_terms',
            'warranty_terms', 'contract_file', 'notes', 'advance_amount', 'retention_percent',
            'guarantee_terms', 'deliverables', 'po_number',
            'created_by', 'created_at', 'updated_at', 'is_active', 'days_remaining'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_active', 'days_remaining']


class ProcurementEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementEvent
        fields = [
            'id', 'project', 'strategy', 'invited_vendors', 'start_date', 'end_date',
            'documents', 'criteria', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = [
            'id', 'project', 'mode', 'result', 'quorum', 'threshold',
            'minutes_text', 'minutes_file', 'occurred_at', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ProjectTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTask
        fields = [
            'id', 'project', 'title', 'description', 'due_date', 'status', 'progress',
            'assignee_user', 'assignee_contractor', 'evidence_files', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
