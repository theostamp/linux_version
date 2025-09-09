from rest_framework import serializers
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder, PaymentSchedule, PaymentInstallment, PaymentReceipt
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


class PaymentScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentSchedule
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }


class ScheduledMaintenanceSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    payment_config = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduledMaintenance
        fields = '__all__'
    
    def get_payment_config(self, obj):
        """Get payment configuration from related PaymentSchedule"""
        try:
            if hasattr(obj, 'payment_schedule') and obj.payment_schedule:
                schedule = obj.payment_schedule
                return {
                    'enabled': True,
                    'payment_type': schedule.payment_type,
                    'total_amount': float(schedule.total_amount),
                    'advance_percentage': float(schedule.advance_percentage) if schedule.advance_percentage else None,
                    'installment_count': schedule.installment_count,
                    'installment_frequency': schedule.installment_frequency,
                    'periodic_amount': float(schedule.periodic_amount) if schedule.periodic_amount else None,
                    'periodic_frequency': schedule.periodic_frequency,
                    'start_date': schedule.start_date.isoformat() if schedule.start_date else None,
                    'notes': schedule.notes,
                }
            # If no payment schedule exists but there's a total_cost, enable with defaults
            elif obj.total_cost:
                return {
                    'enabled': True,
                    'payment_type': 'lump_sum',
                    'total_amount': float(obj.total_cost),
                    'advance_percentage': 30,
                    'installment_count': 3,
                    'start_date': obj.scheduled_date.isoformat() if obj.scheduled_date else None,
                }
            return {'enabled': False}
        except:
            return {'enabled': False}


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


class PaymentScheduleSerializer(serializers.ModelSerializer):
    scheduled_maintenance_title = serializers.CharField(source='scheduled_maintenance.title', read_only=True)
    building_name = serializers.CharField(source='scheduled_maintenance.building.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Calculated fields
    advance_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    installment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    # Installments count
    installments_count = serializers.SerializerMethodField()
    paid_installments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentSchedule
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
        }
    
    def get_installments_count(self, obj):
        return obj.installments.count()
    
    def get_paid_installments_count(self, obj):
        return obj.installments.filter(status='paid').count()
    
    def validate(self, attrs):
        payment_type = attrs.get('payment_type')
        
        if payment_type == 'advance_installments':
            if not attrs.get('advance_percentage'):
                raise serializers.ValidationError({'advance_percentage': 'Απαιτείται ποσοστό προκαταβολής για προκαταβολή + δόσεις'})
            if not attrs.get('installment_count'):
                raise serializers.ValidationError({'installment_count': 'Απαιτείται αριθμός δόσεων για προκαταβολή + δόσεις'})
        
        elif payment_type == 'periodic':
            if not attrs.get('periodic_frequency'):
                raise serializers.ValidationError({'periodic_frequency': 'Απαιτείται συχνότητα για περιοδικές καταβολές'})
        
        return attrs


class PaymentInstallmentSerializer(serializers.ModelSerializer):
    payment_schedule_title = serializers.CharField(source='payment_schedule.scheduled_maintenance.title', read_only=True)
    building_name = serializers.CharField(source='payment_schedule.scheduled_maintenance.building.name', read_only=True)
    contractor_name = serializers.CharField(source='payment_schedule.scheduled_maintenance.contractor.name', read_only=True)
    
    # Status indicators
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.SerializerMethodField()
    
    # Receipt information
    receipt_number = serializers.CharField(source='receipt.receipt_number', read_only=True)
    receipt_status = serializers.CharField(source='receipt.status', read_only=True)
    
    class Meta:
        model = PaymentInstallment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_days_until_due(self, obj):
        if obj.due_date:
            from django.utils import timezone
            delta = obj.due_date - timezone.now().date()
            return delta.days
        return None
    
    def validate(self, attrs):
        due_date = attrs.get('due_date')
        payment_date = attrs.get('payment_date')
        
        if payment_date and due_date and payment_date < due_date:
            # Allow early payments but warn
            pass
        
        return attrs


class PaymentReceiptSerializer(serializers.ModelSerializer):
    scheduled_maintenance_title = serializers.CharField(source='scheduled_maintenance.title', read_only=True)
    building_name = serializers.CharField(source='scheduled_maintenance.building.name', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    contractor_phone = serializers.CharField(source='contractor.phone', read_only=True)
    contractor_tax_number = serializers.CharField(source='contractor.tax_number', read_only=True)
    
    # Installment information
    installment_number = serializers.IntegerField(source='installment.installment_number', read_only=True)
    installment_type = serializers.CharField(source='installment.installment_type', read_only=True)
    
    # Financial integration
    linked_expense_title = serializers.CharField(source='linked_expense.title', read_only=True)
    
    # Audit trail
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    # Status indicators
    is_signed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PaymentReceipt
        fields = '__all__'
        extra_kwargs = {
            'receipt_number': {'read_only': True},
            'created_by': {'read_only': True},
            'contractor_signature': {'write_only': True},
            'contractor_signature_ip': {'read_only': True},
        }
    
    def validate(self, attrs):
        scheduled_maintenance = attrs.get('scheduled_maintenance')
        contractor = attrs.get('contractor')
        
        # Validate contractor matches scheduled maintenance
        if scheduled_maintenance and contractor:
            if scheduled_maintenance.contractor and scheduled_maintenance.contractor != contractor:
                raise serializers.ValidationError({
                    'contractor': 'Το συνεργείο δεν ταιριάζει με το προγραμματισμένο έργο'
                })
        
        # Validate amount is positive
        amount = attrs.get('amount')
        if amount and amount <= 0:
            raise serializers.ValidationError({'amount': 'Το ποσό πρέπει να είναι θετικό'})
        
        return attrs


class PaymentReceiptCreateSerializer(PaymentReceiptSerializer):
    """Simplified serializer for creating payment receipts"""
    
    class Meta(PaymentReceiptSerializer.Meta):
        fields = [
            'scheduled_maintenance', 'installment', 'contractor', 'receipt_type',
            'amount', 'payment_date', 'description', 'receipt_file', 
            'contractor_invoice', 'status'
        ]


class PaymentReceiptDetailSerializer(PaymentReceiptSerializer):
    """Detailed serializer with all related information"""
    
    # Building information
    building_address = serializers.CharField(source='scheduled_maintenance.building.address', read_only=True)
    building_postal_code = serializers.CharField(source='scheduled_maintenance.building.postal_code', read_only=True)
    building_city = serializers.CharField(source='scheduled_maintenance.building.city', read_only=True)
    
    # Full contractor information
    contractor_address = serializers.CharField(source='contractor.address', read_only=True)
    contractor_email = serializers.CharField(source='contractor.email', read_only=True)
    
    class Meta(PaymentReceiptSerializer.Meta):
        pass


# Enhanced ScheduledMaintenance serializer with payment information
class ScheduledMaintenanceWithPaymentsSerializer(ScheduledMaintenanceSerializer):
    # Payment schedule information
    payment_schedule = PaymentScheduleSerializer(read_only=True)
    payment_receipts_count = serializers.SerializerMethodField()
    total_paid_amount = serializers.SerializerMethodField()
    
    class Meta(ScheduledMaintenanceSerializer.Meta):
        pass
    
    def get_payment_receipts_count(self, obj):
        return obj.payment_receipts.count()
    
    def get_total_paid_amount(self, obj):
        from django.db.models import Sum
        total = obj.payment_receipts.filter(status__in=['issued', 'signed', 'archived']).aggregate(
            total=Sum('amount')
        )['total']
        return total or 0