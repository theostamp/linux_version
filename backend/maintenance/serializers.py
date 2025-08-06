from rest_framework import serializers
from .models import Contractor, ServiceReceipt, ScheduledMaintenance


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