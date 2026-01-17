from rest_framework import serializers
from .models import Expense, ExpensePayment, CashFunding, Transaction, Payment, ExpenseApartment, MeterReading, Supplier, FinancialReceipt, MonthlyBalance
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
    payer_responsibility_display = serializers.CharField(source='get_payer_responsibility_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    paid_total = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    last_payment_date = serializers.SerializerMethodField()

    # Linked maintenance/receipt (read-only)
    linked_service_receipt = serializers.SerializerMethodField()
    linked_scheduled_maintenance = serializers.SerializerMethodField()
    maintenance_payment_receipts = serializers.SerializerMethodField()

    # Installment information
    has_installments = serializers.SerializerMethodField()
    linked_maintenance_projects = serializers.SerializerMethodField()

    # 🔗 Project integration (new fields)
    project_title = serializers.CharField(source='project.title', read_only=True)
    project_status = serializers.CharField(source='project.status', read_only=True)
    project_url = serializers.SerializerMethodField()
    
    # Suggested payer based on category (for frontend auto-suggestion)
    suggested_payer = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'building', 'building_name', 'title', 'amount', 'date',
            'category', 'category_display', 'distribution_type', 'distribution_type_display',
            'payer_responsibility', 'payer_responsibility_display', 'suggested_payer', 'split_ratio',
            'supplier', 'supplier_name', 'supplier_details', 'attachment', 'attachment_url',
            'notes', 'due_date', 'add_to_calendar', 'expense_type', 'created_at', 'updated_at',
            'paid_total', 'remaining_amount', 'payment_status', 'payment_status_display', 'last_payment_date',
            'linked_service_receipt', 'linked_scheduled_maintenance', 'maintenance_payment_receipts',
            'has_installments', 'linked_maintenance_projects',
            # New project fields
            'project', 'project_title', 'project_status', 'project_url', 'audit_trail',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """
        Override create to auto-set payer_responsibility based on category if not provided.
        Χρησιμοποιεί το EXPENSE_CATEGORY_DEFAULTS mapping για αυτόματη πρόταση.
        """
        # Αν δεν έχει οριστεί payer_responsibility, ορίζεται αυτόματα από την κατηγορία
        if 'payer_responsibility' not in validated_data or not validated_data.get('payer_responsibility'):
            category = validated_data.get('category')
            if category:
                validated_data['payer_responsibility'] = Expense.get_default_payer_for_category(category)
        
        return super().create(validated_data)
    
    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

    def _get_paid_total(self, obj):
        from decimal import Decimal

        paid_total = getattr(obj, 'paid_total', None)
        if paid_total is None:
            try:
                from django.db.models import Sum
                paid_total = obj.payments.aggregate(total=Sum('amount'))['total']
            except Exception:
                paid_total = None
        return Decimal(str(paid_total or Decimal('0.00')))

    def get_paid_total(self, obj):
        return float(self._get_paid_total(obj))

    def get_remaining_amount(self, obj):
        from decimal import Decimal

        paid_total = self._get_paid_total(obj)
        amount = Decimal(str(obj.amount or Decimal('0.00')))
        remaining = amount - paid_total
        if remaining < 0:
            remaining = Decimal('0.00')
        return float(remaining)

    def get_payment_status(self, obj):
        from datetime import date

        paid_total = self._get_paid_total(obj)
        amount = getattr(obj, 'amount', 0) or 0
        remaining = amount - paid_total
        if paid_total <= 0:
            status = 'unpaid'
        elif remaining <= 0:
            status = 'paid'
        else:
            status = 'partial'

        if status != 'paid' and obj.due_date and obj.due_date < date.today():
            status = 'overdue'

        return status

    def get_payment_status_display(self, obj):
        status = self.get_payment_status(obj)
        return {
            'unpaid': 'Απλήρωτο',
            'partial': 'Μερικώς Πληρωμένο',
            'paid': 'Πληρωμένο',
            'overdue': 'Ληξιπρόθεσμο'
        }.get(status, 'Απλήρωτο')

    def get_last_payment_date(self, obj):
        last_payment_date = getattr(obj, 'last_payment_date', None)
        if last_payment_date:
            return last_payment_date.isoformat()

        try:
            latest_payment = obj.payments.order_by('-payment_date').first()
            return latest_payment.payment_date.isoformat() if latest_payment else None
        except Exception:
            return None

    def get_project_url(self, obj):
        """Return URL to project detail page"""
        if obj.project:
            return f"/projects/{obj.project.id}"
        return None
    
    def get_suggested_payer(self, obj):
        """
        Επιστρέφει την προτεινόμενη ευθύνη πληρωμής με βάση την κατηγορία.
        Χρήσιμο για το frontend να προ-επιλέγει την τιμή όταν αλλάζει η κατηγορία.
        """
        if obj.category:
            return Expense.get_default_payer_for_category(obj.category)
        return 'resident'  # default fallback
    
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
    
    def validate_split_ratio(self, value):
        """Επιβεβαίωση ότι το split_ratio είναι μεταξύ 0 και 1"""
        if value is not None:
            if value < 0 or value > 1:
                raise serializers.ValidationError("Το ποσοστό κατανομής πρέπει να είναι μεταξύ 0 και 1.")
        return value
    
    def validate(self, data):
        """Επιβεβαίωση ότι το split_ratio χρησιμοποιείται μόνο με shared payer_responsibility"""
        payer_responsibility = data.get('payer_responsibility')
        split_ratio = data.get('split_ratio')
        
        # Αν το split_ratio έχει οριστεί, πρέπει το payer_responsibility να είναι 'shared'
        if split_ratio is not None and payer_responsibility != 'shared':
            raise serializers.ValidationError({
                'split_ratio': "Το ποσοστό κατανομής μπορεί να χρησιμοποιηθεί μόνο όταν η ευθύνη πληρωμής είναι 'Κοινή Ευθύνη'."
            })
        
        return data

    def get_linked_service_receipt(self, obj):
        try:
            receipt = obj.linked_service_receipts.first()
            return receipt.id if receipt else None
        except Exception:
            return None

    def get_linked_scheduled_maintenance(self, obj):
        try:
            receipt = obj.linked_service_receipts.first()
            return receipt.scheduled_maintenance_id if receipt else None
        except Exception:
            return None

    def get_maintenance_payment_receipts(self, obj):
        """Return linked maintenance payment receipts"""
        try:
            from maintenance.models import PaymentReceipt
            receipts = PaymentReceipt.objects.filter(
                linked_expense=obj
            ).select_related(
                'scheduled_maintenance', 'installment'
            )
            
            result = []
            for receipt in receipts:
                receipt_data = {
                    'id': receipt.id,
                    'receipt_type': receipt.receipt_type,
                    'amount': float(receipt.amount),
                    'scheduled_maintenance': {
                        'id': receipt.scheduled_maintenance.id,
                        'title': receipt.scheduled_maintenance.title,
                    }
                }
                
                # Include installment info if available
                if receipt.installment:
                    receipt_data['installment'] = {
                        'id': receipt.installment.id,
                        'installment_type': receipt.installment.installment_type,
                        'installment_number': receipt.installment.installment_number,
                    }
                
                result.append(receipt_data)
            
            return result
        except Exception as e:
            # In case of import error or other issues, return empty list
            return []
    
    def get_has_installments(self, obj):
        """Ελέγχει αν η δαπάνη έχει δόσεις/διακανονισμούς"""
        return obj.has_installments()
    
    def get_linked_maintenance_projects(self, obj):
        """Επιστρέφει τα συνδεδεμένα έργα συντήρησης με δόσεις"""
        try:
            projects = obj.get_linked_maintenance_projects()
            result = []
            for project in projects:
                project_data = {
                    'id': project.id,
                    'title': project.title,
                    'description': project.description,
                    'scheduled_date': project.scheduled_date,
                    'status': project.status,
                    'priority': project.priority,
                    'payment_schedule': {
                        'id': project.payment_schedule.id,
                        'total_amount': float(project.payment_schedule.total_amount),
                        'installment_count': project.payment_schedule.installment_count,
                    } if project.payment_schedule else None
                }
                result.append(project_data)
            return result
        except Exception as e:
            return []


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
    payer_type_display = serializers.CharField(source='get_payer_type_display', read_only=True)
    apartment_number = serializers.CharField(source='apartment.number', read_only=True)
    building_name = serializers.CharField(source='apartment.building.name', read_only=True)
    owner_name = serializers.CharField(source='apartment.owner_name', read_only=True)
    tenant_name = serializers.CharField(source='apartment.tenant_name', read_only=True)
    current_balance = serializers.SerializerMethodField()
    monthly_due = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'apartment', 'apartment_number', 'building_name', 'owner_name', 'tenant_name', 'current_balance', 'monthly_due', 'amount', 'reserve_fund_amount', 'previous_obligations_amount', 'date',
            'method', 'method_display', 'payment_type', 'payment_type_display',
            'payer_type', 'payer_type_display', 'payer_name',
            'reference_number', 'notes', 'receipt', 'receipt_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_current_balance(self, obj):
        """
        Υπολογισμός τρέχοντος υπολοίπου διαμερίσματος βάσει συναλλαγών

        ΣΗΜΕΙΩΣΗ: Αυτή η μέθοδος χρησιμοποιεί το BalanceCalculationService
        για να διασφαλίσει consistency.
        """
        try:
            from .balance_service import BalanceCalculationService

            # Χρήση του κεντρικού service για σωστό υπολογισμό
            balance = BalanceCalculationService.calculate_current_balance(obj.apartment)
            return float(balance)
        except Exception:
            # Fallback στο στατικό current_balance αν κάτι πάει στραβά
            try:
                balance = obj.apartment.current_balance
                if balance is None:
                    return 0.0
                return float(balance)
            except:
                return 0.0
    
    def get_monthly_due(self, obj):
        """Υπολογισμός μηνιαίας οφειλής (κοινόχρηστα + αποθεματικό)"""
        try:
            from decimal import Decimal
            from buildings.models import Building
            from .models import Expense
            from datetime import datetime
            
            # Υπολογισμός κοινόχρηστων χειροκίνητα ανεξάρτητα από distribution_type
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            expenses = Expense.objects.filter(
                building_id=obj.apartment.building_id,
                date__year=current_year,
                date__month=current_month
            )
            
            total_expenses = sum(exp.amount for exp in expenses)
            
            # Υπολογισμός μερίδιου ανά χιλιοστά
            from apartments.models import Apartment
            apartments = Apartment.objects.filter(building_id=obj.apartment.building_id)
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            
            if total_mills > 0:
                apartment_share = (total_expenses * obj.apartment.participation_mills) / total_mills
            else:
                apartment_share = Decimal('0.00')
            
            # Αποθεματικό - υπολογίζουμε χειροκίνητα ανεξάρτητα από εκκρεμότητες
            building = Building.objects.get(id=obj.apartment.building_id)
            reserve_fund_amount = Decimal('0.00')
            
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
                apartment_reserve_share = (monthly_target * obj.apartment.participation_mills) / 1000
                reserve_fund_amount = apartment_reserve_share
            
            # Μηνιαία οφειλή = κοινόχρηστα + αποθεματικό
            monthly_due = apartment_share + reserve_fund_amount
            return float(monthly_due)
            
        except Exception:
            # Αν υπάρχει σφάλμα, επιστρέφουμε 0
            return 0.0
    
    def get_receipt_url(self, obj):
        """Λήψη URL για το receipt"""
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None


class ExpensePaymentSerializer(serializers.ModelSerializer):
    """Serializer για εξοφλήσεις δαπανών"""

    method_display = serializers.CharField(source='get_method_display', read_only=True)
    expense_title = serializers.CharField(source='expense.title', read_only=True)
    expense_amount = serializers.DecimalField(source='expense.amount', max_digits=10, decimal_places=2, read_only=True)
    receipt_url = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ExpensePayment
        fields = [
            'id', 'expense', 'expense_title', 'expense_amount',
            'payment_date', 'amount', 'method', 'method_display',
            'reference_number', 'notes', 'receipt', 'receipt_url',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by',
            'created_by_name', 'expense_title', 'expense_amount', 'receipt_url'
        ]

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Το ποσό πρέπει να είναι μεγαλύτερο του μηδενός.")
        return value

    def validate_receipt(self, value):
        if value:
            try:
                result = FileUploadService.validate_file(value)
                if not result.get('is_valid'):
                    errors = result.get('errors') or []
                    raise serializers.ValidationError("; ".join(errors) or "Μη έγκυρο αρχείο.")
            except Exception as e:
                raise serializers.ValidationError(f"Σφάλμα στο αρχείο: {str(e)}")


class CashFundingSerializer(serializers.ModelSerializer):
    """Serializer για έκτακτη χρηματοδότηση ταμείου"""

    method_display = serializers.CharField(source='get_method_display', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    building_name = serializers.CharField(source='building.name', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = CashFunding
        fields = [
            'id', 'building', 'building_name', 'amount', 'funding_date',
            'method', 'method_display', 'source_type', 'source_type_display',
            'source_name', 'reference_number', 'notes', 'receipt', 'receipt_url',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by',
            'created_by_name', 'building_name', 'receipt_url'
        ]

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Το ποσό πρέπει να είναι μεγαλύτερο του μηδενός.")
        return value

    def validate_receipt(self, value):
        if value:
            try:
                result = FileUploadService.validate_file(value)
                if not result.get('is_valid'):
                    errors = result.get('errors') or []
                    raise serializers.ValidationError("; ".join(errors) or "Μη έγκυρο αρχείο.")
            except Exception as e:
                raise serializers.ValidationError(f"Σφάλμα στο αρχείο: {str(e)}")
        return value


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
            'consumption_period', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
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


class MonthlyBalanceSerializer(serializers.ModelSerializer):
    """Serializer για τα μηνιαία υπολοιπα (Υβριδικό Σύστημα)"""
    
    month_display = serializers.SerializerMethodField()
    building_name = serializers.CharField(source='building.name', read_only=True)
    
    # Υβριδικό Σύστημα - Ξεχωριστά Υπολοιπα (Serialized Properties)
    main_obligations = serializers.SerializerMethodField()
    reserve_obligations = serializers.SerializerMethodField()
    management_obligations = serializers.SerializerMethodField()
    
    main_net_result = serializers.SerializerMethodField()
    reserve_net_result = serializers.SerializerMethodField()
    management_net_result = serializers.SerializerMethodField()
    
    class Meta:
        model = MonthlyBalance
        fields = [
            'id', 'building', 'building_name', 'year', 'month', 'month_display',
            'total_expenses', 'total_payments', 'previous_obligations',
            'reserve_fund_amount', 'management_fees', 'scheduled_maintenance_amount', 'total_obligations',
            'carry_forward', 'annual_carry_forward', 'balance_year',
            'main_balance_carry_forward', 'reserve_balance_carry_forward', 'management_balance_carry_forward',
            'main_obligations', 'reserve_obligations', 'management_obligations',
            'main_net_result', 'reserve_net_result', 'management_net_result',
            'net_result', 'is_closed', 'closed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_main_obligations(self, obj):
        """Κύριες υποχρεώσεις = κανονικές δαπάνες + παλαιότερες οφειλές"""
        return float(obj.total_expenses + obj.previous_obligations)
    
    def get_reserve_obligations(self, obj):
        """Αποθεματικές υποχρεώσεις = μόνο αποθεματικό"""
        return float(obj.reserve_fund_amount)
    
    def get_management_obligations(self, obj):
        """Διαχειριστικές υποχρεώσεις = μόνο έξοδα διαχείρισης"""
        return float(obj.management_fees)
    
    def get_main_net_result(self, obj):
        """Κύριο καθαρό αποτέλεσμα = εισπράξεις - κύριες υποχρεώσεις"""
        return float(obj.total_payments - (obj.total_expenses + obj.previous_obligations))
    
    def get_reserve_net_result(self, obj):
        """Αποθεματικό καθαρό αποτέλεσμα = εισπράξεις - αποθεματικές υποχρεώσεις"""
        return float(obj.total_payments - obj.reserve_fund_amount)
    
    def get_management_net_result(self, obj):
        """Διαχειριστικό καθαρό αποτέλεσμα = εισπράξεις - διαχειριστικές υποχρεώσεις"""
        return float(obj.total_payments - obj.management_fees)
    
    def get_month_display(self, obj):
        """Μορφή μήνα/έτους"""
        return f"{obj.month:02d}/{obj.year}"
    
    def to_representation(self, instance):
        """Override για να μετατρέψουμε Decimal σε float"""
        data = super().to_representation(instance)
        
        # Μετατροπή Decimal fields σε float
        decimal_fields = ['total_obligations', 'net_result']
        for field in decimal_fields:
            if field in data and data[field] is not None:
                data[field] = float(data[field])
        
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
    status = serializers.CharField()  # Νέα κατάσταση βασισμένη στον χρόνο οφειλής
    last_payment_date = serializers.DateField(allow_null=True)
    last_payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class FinancialSummarySerializer(serializers.Serializer):
    """Serializer για το οικονομικό σύνοψη"""
    
    total_balance = serializers.FloatField()
    current_obligations = serializers.FloatField()
    previous_obligations = serializers.FloatField()  # ← ΝΕΟ FIELD
    current_month_expenses = serializers.FloatField()  # ← ΝΕΟ FIELD
    reserve_fund_contribution = serializers.FloatField()
    current_reserve = serializers.FloatField()
    has_monthly_activity = serializers.BooleanField()  # ← ΝΕΟ FIELD
    apartments_count = serializers.IntegerField()
    pending_payments = serializers.IntegerField()
    average_monthly_expenses = serializers.FloatField()
    last_calculation_date = serializers.CharField()
    total_expenses_month = serializers.FloatField()
    total_payments_month = serializers.FloatField()
    pending_expenses = serializers.FloatField()
    third_party_obligations = serializers.FloatField()
    cash_available = serializers.FloatField()
    recent_transactions = TransactionSerializer(many=True, read_only=True)
    recent_transactions_count = serializers.IntegerField()
    apartment_balances = ApartmentBalanceSerializer(many=True, read_only=True)
    payment_statistics = serializers.DictField(read_only=True)
    # Reserve fund settings
    reserve_fund_goal = serializers.FloatField()
    reserve_fund_duration_months = serializers.IntegerField()
    reserve_fund_monthly_target = serializers.FloatField()
    # Reserve fund timeline dates - CRITICAL for frontend timeline checks
    reserve_fund_start_date = serializers.CharField(allow_null=True)
    reserve_fund_target_date = serializers.CharField(allow_null=True)
    # Management expenses
    management_fee_per_apartment = serializers.FloatField()
    total_management_cost = serializers.FloatField()
    # Expense breakdown by category with payer responsibility
    expense_breakdown = serializers.ListField(child=serializers.DictField(), required=False)


class CommonExpenseShareSerializer(serializers.Serializer):
    """Serializer για τα μερίδια κοινοχρήστων"""
    
    apartment_id = serializers.IntegerField()
    apartment_number = serializers.CharField()
    identifier = serializers.CharField()
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


class FinancialReceiptSerializer(serializers.ModelSerializer):
    """Serializer για τις αποδείξεις εισπράξεων"""
    
    receipt_type_display = serializers.CharField(source='get_receipt_type_display', read_only=True)
    payer_type_display = serializers.CharField(source='get_payer_type_display', read_only=True)
    payment_details = PaymentSerializer(source='payment', read_only=True)
    apartment_number = serializers.CharField(source='payment.apartment.number', read_only=True)
    building_name = serializers.CharField(source='payment.apartment.building.name', read_only=True)
    receipt_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FinancialReceipt
        fields = [
            'id', 'payment', 'payment_details', 'receipt_type', 'receipt_type_display',
            'amount', 'receipt_date', 'receipt_number', 'reference_number',
            'payer_name', 'payer_type', 'payer_type_display', 'notes',
            'receipt_file', 'receipt_file_url', 'created_by', 'created_at', 'updated_at',
            'apartment_number', 'building_name'
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at', 'updated_at']
    
    def get_receipt_file_url(self, obj):
        if obj.receipt_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_file.url)
            return obj.receipt_file.url
        return None
    
    def validate_amount(self, value):
        """Επιβεβαίωση ότι το ποσό είναι θετικό"""
        if value <= 0:
            raise serializers.ValidationError("Το ποσό πρέπει να είναι μεγαλύτερο του μηδενός.")
        return value
    
    def validate_receipt_file(self, value):
        """Επιβεβαίωση του αρχείου απόδειξης"""
        if value:
            try:
                FileUploadService.validate_file(value)
            except Exception as e:
                raise serializers.ValidationError(f"Σφάλμα στο αρχείο: {str(e)}")
        return value 
