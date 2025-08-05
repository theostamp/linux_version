from rest_framework import serializers
from .models import Expense, Transaction, Payment, ExpenseApartment, MeterReading, Supplier
from buildings.models import Building
from apartments.models import Apartment
from .services import FileUploadService


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer για τους προμηθευτές"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'building', 'building_name', 'name', 'category', 'category_display',
            'account_number', 'phone', 'email', 'address', 'vat_number', 
            'contract_number', 'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer για τις δαπάνες"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    distribution_type_display = serializers.CharField(source='get_distribution_type_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = [
            'id', 'building', 'building_name', 'title', 'amount', 'date', 
            'category', 'category_display', 'distribution_type', 'distribution_type_display',
            'supplier', 'supplier_name', 'supplier_details', 'attachment', 'attachment_url',
            'notes', 'is_issued', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None
    
    def validate_amount(self, value):
        """Επιβεβαίωση ότι το ποσό είναι θετικό"""
        if value <= 0:
            raise serializers.ValidationError("Το ποσό πρέπει να είναι μεγαλύτερο του μηδενός.")
        return value
    
    def validate_attachment(self, value):
        """Επιβεβαίωση του attachment"""
        if value:
            try:
                FileUploadService.validate_file(value)
            except Exception as e:
                raise serializers.ValidationError(f"Σφάλμα στο αρχείο: {str(e)}")
        return value


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer για τις κινήσεις ταμείου"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'building', 'building_name', 'date', 'type', 'type_display',
            'status', 'status_display', 'description', 'apartment', 'apartment_number',
            'amount', 'balance_before', 'balance_after', 'reference_id', 'reference_type',
            'receipt', 'receipt_url', 'notes', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer για τις εισπράξεις"""
    
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    building_name = serializers.CharField(source='apartment.building.name', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'apartment', 'apartment_number', 'building_name', 'amount', 'date',
            'method', 'method_display', 'payment_type', 'payment_type_display',
            'reference_number', 'notes', 'receipt', 'receipt_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_receipt_url(self, obj):
        """Λήψη URL για το receipt"""
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None


class ExpenseApartmentSerializer(serializers.ModelSerializer):
    """Serializer για τη σύνδεση δαπανών-διαμερισμάτων"""
    
    expense_title = serializers.CharField(source='expense.title', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    
    class Meta:
        model = ExpenseApartment
        fields = ['id', 'expense', 'expense_title', 'apartment', 'apartment_number', 'created_at']
        read_only_fields = ['id', 'created_at']


class MeterReadingSerializer(serializers.ModelSerializer):
    """Serializer για τις μετρήσεις"""
    
    meter_type_display = serializers.CharField(source='get_meter_type_display', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    building_name = serializers.CharField(source='apartment.building.name', read_only=True)
    previous_value = serializers.SerializerMethodField()
    consumption = serializers.SerializerMethodField()
    consumption_period = serializers.SerializerMethodField()
    
    class Meta:
        model = MeterReading
        fields = [
            'id', 'apartment', 'apartment_number', 'building_name', 'reading_date',
            'value', 'meter_type', 'meter_type_display', 'previous_value', 'consumption',
            'consumption_period', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_previous_value(self, obj):
        """Λήψη της προηγούμενης τιμής μετρήσης"""
        previous_reading = obj.get_previous_reading()
        return previous_reading.value if previous_reading else None
    
    def get_consumption(self, obj):
        """Υπολογισμός κατανάλωσης"""
        return obj.calculate_consumption()
    
    def get_consumption_period(self, obj):
        """Λήψη περιόδου κατανάλωσης"""
        start_date, end_date = obj.get_consumption_period()
        return {
            'start_date': start_date,
            'end_date': end_date
        } if start_date else None
    
    def validate_value(self, value):
        """Επιβεβαίωση ότι η τιμή είναι θετική"""
        if value <= 0:
            raise serializers.ValidationError("Η τιμή μετρήσης πρέπει να είναι μεγαλύτερη του μηδενός.")
        return value
    
    def validate(self, data):
        """Validation για τη μετρήση"""
        # Έλεγχος για λογικές τιμές (νέα μετρήση >= παλιά μετρήση)
        apartment = data.get('apartment')
        meter_type = data.get('meter_type')
        reading_date = data.get('reading_date')
        value = data.get('value')
        
        if apartment and meter_type and reading_date and value:
            # Έλεγχος αν υπάρχει ήδη μετρήση για την ίδια ημερομηνία
            existing_reading = MeterReading.objects.filter(
                apartment=apartment,
                meter_type=meter_type,
                reading_date=reading_date
            ).first()
            
            if existing_reading and self.instance != existing_reading:
                raise serializers.ValidationError(
                    f"Υπάρχει ήδη μετρήση για το διαμέρισμα {apartment.number} "
                    f"τύπου {existing_reading.get_meter_type_display()} "
                    f"στην ημερομηνία {reading_date}."
                )
            
            # Έλεγχος για λογικές τιμές
            previous_reading = MeterReading.objects.filter(
                apartment=apartment,
                meter_type=meter_type,
                reading_date__lt=reading_date
            ).order_by('-reading_date').first()
            
            if previous_reading and value < previous_reading.value:
                raise serializers.ValidationError(
                    f"Η νέα μετρήση ({value}) δεν μπορεί να είναι μικρότερη "
                    f"από την προηγούμενη ({previous_reading.value})."
                )
        
        return data


class ApartmentBalanceSerializer(serializers.Serializer):
    """Serializer για τα υπολοίπα διαμερισμάτων"""
    
    id = serializers.IntegerField()
    apartment_id = serializers.IntegerField()
    number = serializers.CharField()
    apartment_number = serializers.CharField()
    owner_name = serializers.CharField()
    current_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    participation_mills = serializers.IntegerField()
    last_payment_date = serializers.DateField(allow_null=True)
    last_payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class FinancialSummarySerializer(serializers.Serializer):
    """Serializer για το οικονομικό σύνοψη"""
    
    current_reserve = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_obligations = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_expenses_month = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_payments_month = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    recent_transactions = TransactionSerializer(many=True, read_only=True)
    recent_transactions_count = serializers.IntegerField()
    apartment_balances = ApartmentBalanceSerializer(many=True, read_only=True)
    payment_statistics = serializers.DictField(read_only=True)


class CommonExpenseShareSerializer(serializers.Serializer):
    """Serializer για τα μερίδια κοινοχρήστων"""
    
    apartment_id = serializers.IntegerField()
    apartment_number = serializers.CharField()
    owner_name = serializers.CharField()
    participation_mills = serializers.IntegerField()
    current_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    previous_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_due = serializers.DecimalField(max_digits=10, decimal_places=2)
    breakdown = serializers.ListField(child=serializers.DictField())


class CommonExpenseCalculationSerializer(serializers.Serializer):
    """Serializer για τον υπολογισμό κοινοχρήστων"""
    
    building_id = serializers.IntegerField()
    period_id = serializers.IntegerField()
    expenses = serializers.ListField(child=serializers.IntegerField())
    distribution_type = serializers.CharField() 