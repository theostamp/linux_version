from rest_framework import serializers
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder


class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = '__all__'


class ServiceReceiptSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ServiceReceipt
        fields = '__all__'


class ScheduledMaintenanceSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ScheduledMaintenance
        fields = '__all__' 


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    reporter_name = serializers.CharField(source='reporter.get_full_name', read_only=True)
    assignee_name = serializers.CharField(source='assignee.get_full_name', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)

    class Meta:
        model = MaintenanceTicket
        fields = '__all__'
        extra_kwargs = {
            'attachment': {'required': False, 'allow_null': True}
        }
        read_only_fields = ['created_at', 'updated_at', 'closed_at']


class WorkOrderSerializer(serializers.ModelSerializer):
    ticket_title = serializers.CharField(source='ticket.title', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    assignee_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']