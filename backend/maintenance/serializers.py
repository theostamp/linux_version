from rest_framework import serializers
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder
from financial.models import Expense


class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = '__all__'


class ServiceReceiptSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    linked_expense_title = serializers.CharField(source='linked_expense.title', read_only=True)
    # Explicit links
    expense = serializers.PrimaryKeyRelatedField(source='linked_expense', queryset=Expense.objects.all(), allow_null=True, required=False)
    scheduled_maintenance = serializers.PrimaryKeyRelatedField(queryset=ScheduledMaintenance.objects.all(), allow_null=True, required=False)
    
    class Meta:
        model = ServiceReceipt
        fields = '__all__'
        extra_kwargs = {
            'receipt_file': {'required': False, 'allow_null': True},
            'created_by': {'read_only': True},
        }

    def validate(self, attrs):
        receipt_building = attrs.get('building') or getattr(self.instance, 'building', None)
        linked_expense = attrs.get('linked_expense')
        scheduled = attrs.get('scheduled_maintenance')
        if linked_expense and receipt_building and linked_expense.building_id != receipt_building.id:
            raise serializers.ValidationError({'expense': 'Η δαπάνη ανήκει σε άλλο κτίριο.'})
        if scheduled and receipt_building and scheduled.building_id != receipt_building.id:
            raise serializers.ValidationError({'scheduled_maintenance': 'Το έργο ανήκει σε άλλο κτίριο.'})
        return attrs


class ScheduledMaintenanceSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ScheduledMaintenance
        fields = '__all__'


class PublicScheduledMaintenanceSerializer(serializers.ModelSerializer):
    building_name = serializers.CharField(source='building.name', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)

    class Meta:
        model = ScheduledMaintenance
        fields = (
            'id',
            'title',
            'scheduled_date',
            'priority',
            'status',
            'building_name',
            'contractor_name',
        )


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