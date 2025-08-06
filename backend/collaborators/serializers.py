from rest_framework import serializers
from .models import (
    Collaborator, CollaborationProject, CollaborationContract, 
    CollaborationInvoice, CollaborationMeeting, CollaboratorPerformance
)


class CollaboratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collaborator
        fields = '__all__'


class CollaborationProjectSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    project_manager_name = serializers.CharField(source='project_manager.get_full_name', read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = CollaborationProject
        fields = '__all__'


class CollaborationContractSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    
    class Meta:
        model = CollaborationContract
        fields = '__all__'


class CollaborationInvoiceSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    contract_number = serializers.CharField(source='contract.contract_number', read_only=True)
    
    class Meta:
        model = CollaborationInvoice
        fields = '__all__'


class CollaborationMeetingSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    attendees_names = serializers.SerializerMethodField()
    
    class Meta:
        model = CollaborationMeeting
        fields = '__all__'
    
    def get_attendees_names(self, obj):
        return [f"{attendee.get_full_name()} ({attendee.email})" for attendee in obj.attendees.all()]


class CollaboratorPerformanceSerializer(serializers.ModelSerializer):
    collaborator_name = serializers.CharField(source='collaborator.name', read_only=True)
    completion_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = CollaboratorPerformance
        fields = '__all__' 