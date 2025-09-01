from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Q
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import Expense, Transaction, Payment, ExpenseApartment, MeterReading, Supplier, CommonExpensePeriod, ApartmentShare, FinancialReceipt
from .serializers import (
    ExpenseSerializer, TransactionSerializer, PaymentSerializer,
    ExpenseApartmentSerializer, MeterReadingSerializer, SupplierSerializer,
    FinancialSummarySerializer, ApartmentBalanceSerializer,
    CommonExpenseCalculationSerializer, FinancialReceiptSerializer
)
from .services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator, FinancialDashboardService, PaymentProcessor, FileUploadService
from buildings.models import Building
from apartments.models import Apartment
from .services import ReportService
from .permissions import (
    ExpensePermission, PaymentPermission, TransactionPermission,
    FinancialReadPermission, FinancialWritePermission, ReportPermission
)
from .audit import FinancialAuditLog
from .services import CommonExpenseAutomationService
from django.db import models
from system_health_validator import run_system_health_check
from auto_fix_system_issues import run_auto_fix


class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση προμηθευτών"""
    
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [FinancialWritePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'category', 'is_active']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας προμηθευτή"""
        supplier = serializer.save()
        FinancialAuditLog.log_supplier_action(
            user=self.request.user,
            action='CREATE',
            supplier=supplier,
            request=self.request
        )
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης προμηθευτή"""
        supplier = serializer.save()
        FinancialAuditLog.log_supplier_action(
            user=self.request.user,
            action='UPDATE',
            supplier=supplier,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής προμηθευτή"""
        FinancialAuditLog.log_supplier_action(
            user=self.request.user,
            action='DELETE',
            supplier=instance,
            request=self.request
        )
        instance.delete()
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(building_id=building_id)
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Λήψη διαθέσιμων κατηγοριών προμηθευτών"""
        categories = [{'value': choice[0], 'label': choice[1]} for choice in Supplier.SUPPLIER_CATEGORIES]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Λήψη προμηθευτών ανά κατηγορία"""
        building_id = request.query_params.get('building_id')
        category = request.query_params.get('category')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(is_active=True)
        if category:
            queryset = queryset.filter(category=category)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση δαπανών"""
    
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [ExpensePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'category', 'date', 'distribution_type', 'supplier']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας δαπάνης με αυτόματη έκδοση και χρέωση διαμερισμάτων"""
        expense = serializer.save()
        
        # Ενημέρωση του τρέχοντος αποθεματικού του κτιρίου
        building = expense.building
        building.current_reserve -= expense.amount
        building.save()
        
        # Χειρισμός file upload αν υπάρχει
        if 'attachment' in self.request.FILES:
            try:
                file = self.request.FILES['attachment']
                file_path = FileUploadService.save_file(file, expense.id)
                expense.attachment = file_path
                expense.save()
            except Exception as e:
                # Αν αποτύχει το file upload, διαγράφουμε την expense και επαναφέρουμε το αποθεματικό
                building.current_reserve += expense.amount
                building.save()
                expense.delete()
                raise ValidationError(f"Σφάλμα στο upload αρχείου: {str(e)}")
        
        # Αυτόματη χρέωση διαμερισμάτων αν η δαπάνη είναι εκδοθείσα
        # Σημείωση: Όλες οι δαπάνες θεωρούνται πλέον εκδομένες
        if True:  # expense.is_issued removed
            try:
                from financial.services import CommonExpenseCalculator
                calculator = CommonExpenseCalculator(expense.building.id)
                shares = calculator.calculate_shares()
                
                # Ενημέρωση υπολοίπων διαμερισμάτων
                for apartment_id, share_data in shares.items():
                    apartment = Apartment.objects.get(id=apartment_id)
                    expense_share = share_data.get('total_amount', 0)
                    
                    if expense_share > 0:
                        # Ενημέρωση υπόλοιπου διαμερίσματος
                        apartment.current_balance = (apartment.current_balance or Decimal('0.00')) - expense_share
                        apartment.save()
                        
                        # Δημιουργία transaction
                        Transaction.objects.create(
                            building=expense.building,
                            date=datetime.now(),
                            type='expense_issued',
                            description=f"Αυτόματη χρέωση: {expense.title} - {apartment.number}",
                            apartment_number=apartment.number,
                            apartment=apartment,
                            amount=-expense_share,
                            balance_before=(apartment.current_balance or Decimal('0.00')) + expense_share,
                            balance_after=apartment.current_balance,
                            reference_id=str(expense.id),
                            reference_type='expense',
                            created_by=self.request.user.username if self.request.user else 'System'
                        )
            except Exception as e:
                # Αν αποτύχει η αυτόματη χρέωση, καταγράφουμε το σφάλμα αλλά δεν διακόπτουμε τη δημιουργία
                print(f"Σφάλμα στην αυτόματη χρέωση διαμερισμάτων: {str(e)}")
        
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='CREATE',
            expense=expense,
            request=self.request
        )
        
        # Auto cleanup and refresh after expense creation
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(expense.building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result['cleanup_performed']:
                print(f"🧹 Auto cleanup performed after expense creation: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after expense creation: {str(e)}")
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης δαπάνης"""
        # Get the old expense amount before update
        old_expense = self.get_object()
        old_amount = old_expense.amount
        
        # Save the updated expense
        expense = serializer.save()
        new_amount = expense.amount
        
        # Update the building's current reserve
        building = expense.building
        building.current_reserve += old_amount - new_amount  # Add back old amount, subtract new amount
        building.save()
        
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='UPDATE',
            expense=expense,
            request=self.request
        )
        
        # Auto cleanup and refresh after expense update
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(expense.building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result['cleanup_performed']:
                print(f"🧹 Auto cleanup performed after expense update: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after expense update: {str(e)}")
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής δαπάνης με καθαρισμό σχετικών συναλλαγών"""
        building = instance.building
        expense_id = instance.id
        
        # ΠΡΩΤΑ: Καθαρισμός σχετικών συναλλαγών και ενημέρωση υπολοίπων
        related_transactions = Transaction.objects.filter(
            building_id=building.id,
            reference_type='expense',
            reference_id=str(expense_id)
        )
        
        print(f"🗑️ Διαγραφή δαπάνης {expense_id}: Βρέθηκαν {related_transactions.count()} σχετικές συναλλαγές")
        
        # Ενημέρωση υπολοίπων διαμερισμάτων πριν τη διαγραφή των συναλλαγών
        for transaction in related_transactions:
            if transaction.apartment:
                apartment = transaction.apartment
                old_balance = apartment.current_balance or Decimal('0.00')
                
                # Αφαιρούμε την χρέωση (προσθέτουμε το ποσό γιατί οι χρεώσεις είναι αρνητικές)
                new_balance = old_balance - transaction.amount
                apartment.current_balance = new_balance
                apartment.save()
                
                print(f"   🏠 Διαμέρισμα {apartment.number}: {old_balance}€ → {new_balance}€")
        
        # Διαγραφή των σχετικών συναλλαγών
        deleted_count = related_transactions.count()
        related_transactions.delete()
        print(f"   ✅ Διαγράφηκαν {deleted_count} συναλλαγές")
        
        # ΔΕΥΤΕΡΑ: Επαναφορά του αποθεματικού του κτιρίου
        building.current_reserve += instance.amount
        building.save()
        
        # ΤΡΙΤΑ: Audit log
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='DELETE',
            expense=instance,
            request=self.request
        )
        
        # ΤΕΤΑΡΤΑ: Διαγραφή της δαπάνης
        instance.delete()
        
        print(f"✅ Δαπάνη {expense_id} διαγράφηκε επιτυχώς με όλες τις σχετικές συναλλαγές")
        
        # Auto cleanup and refresh after expense deletion
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result.get('cleanup_performed'):
                print(f"🧹 Auto cleanup performed after expense deletion: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after expense deletion: {str(e)}")
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = self.queryset
        building_id = self.request.query_params.get('building_id')
        month = self.request.query_params.get('month')
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        # Φιλτράρισμα ανά μήνα
        if month:
            try:
                # Parse month parameter (format: YYYY-MM)
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)
                
                # Create date range for the month
                from datetime import date
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, month_num + 1, 1)
                
                queryset = queryset.filter(date__gte=start_date, date__lt=end_date)
            except (ValueError, TypeError):
                # If month parameter is invalid, ignore it
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Λήψη ανέκδοτων δαπανών - DEPRECATED: Όλες οι δαπάνες θεωρούνται εκδομένες"""
        # Για backwards compatibility, επιστρέφουμε άδεια λίστα
        return Response([])
    
    @action(detail=False, methods=['get'])
    def issued(self, request):
        """Λήψη εκδοθεισών δαπανών - Επιστρέφει όλες τις δαπάνες"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Όλες οι δαπάνες θεωρούνται πλέον εκδομένες
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Λήψη διαθέσιμων κατηγοριών δαπανών"""
        categories = [{'value': choice[0], 'label': choice[1]} for choice in Expense.EXPENSE_CATEGORIES]
        return Response(categories)
    
    @action(detail=False, methods=['get'])
    def distribution_types(self, request):
        """Λήψη διαθέσιμων τρόπων κατανομής"""
        distribution_types = [{'value': choice[0], 'label': choice[1]} for choice in Expense.DISTRIBUTION_TYPES]
        return Response(distribution_types)
    
    @action(detail=False, methods=['post'])
    def upload_file(self, request):
        """Upload αρχείου για δαπάνη"""
        try:
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'Δεν βρέθηκε αρχείο'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            file = request.FILES['file']
            expense_id = request.data.get('expense_id')
            
            # Επιβεβαίωση αρχείου
            validation = FileUploadService.validate_file(file)
            if not validation['is_valid']:
                return Response(
                    {'error': validation['errors']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Αποθήκευση αρχείου
            file_path = FileUploadService.save_file(file, expense_id)
            
            return Response({
                'success': True,
                'file_path': file_path,
                'file_name': file.name,
                'file_size': file.size
            })
            
        except Exception as e:
            return Response(
                {'error': f'Σφάλμα στο upload: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση κινήσεων ταμείου"""
    
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [TransactionPermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'type', 'date', 'apartment_number']
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης κίνησης"""
        transaction = serializer.save()
        FinancialAuditLog.log_transaction_action(
            user=self.request.user,
            action='UPDATE',
            transaction=transaction,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής κίνησης"""
        FinancialAuditLog.log_transaction_action(
            user=self.request.user,
            action='DELETE',
            transaction=instance,
            request=self.request
        )
        instance.delete()
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = self.queryset
        building_id = self.request.query_params.get('building_id')
        month = self.request.query_params.get('month')
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        # Φιλτράρισμα ανά μήνα
        if month:
            try:
                # Parse month parameter (format: YYYY-MM)
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)
                
                # Create date range for the month
                from datetime import date
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, month_num + 1, 1)
                
                queryset = queryset.filter(date__gte=start_date, date__lt=end_date)
            except (ValueError, TypeError):
                # If month parameter is invalid, ignore it
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Λήψη πρόσφατων κινήσεων"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().order_by('-date')[:20]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Λήψη διαθέσιμων τύπων κινήσεων"""
        types = [{'value': choice[0], 'label': choice[1]} for choice in Transaction.TRANSACTION_TYPES]
        return Response(types)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση εισπράξεων"""
    
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['apartment', 'method', 'date']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας εισπράξεως με file upload"""
        # Get reserve_fund_amount and previous_obligations_amount from request data if provided
        reserve_fund_amount = self.request.data.get('reserve_fund_amount', 0)
        previous_obligations_amount = self.request.data.get('previous_obligations_amount', 0)
        
        payment = serializer.save()
        
        # Set reserve_fund_amount if provided
        if reserve_fund_amount:
            payment.reserve_fund_amount = reserve_fund_amount
            payment.save()
        
        # Set previous_obligations_amount if provided
        if previous_obligations_amount:
            payment.previous_obligations_amount = previous_obligations_amount
            payment.save()
        
        # Ενημέρωση του τρέχοντος αποθεματικού του κτιρίου
        building = payment.apartment.building
        building.current_reserve += payment.amount
        building.save()
        
        # Ενημέρωση του υπολοίπου του διαμερίσματος
        apartment = payment.apartment
        previous_balance = apartment.current_balance or 0
        apartment.current_balance = previous_balance + payment.amount
        apartment.save()
        
        # Δημιουργία αντίστοιχου Transaction record
        from .models import Transaction
        
        # Προσθήκη πληροφοριών αποθεματικού στις σημειώσεις αν υπάρχει
        description = f"Είσπραξη κοινοχρήστων από {apartment.number} - {payment.get_method_display()}"
        if payment.reserve_fund_amount and float(payment.reserve_fund_amount) > 0:
            description += f" (Αποθεματικό: {payment.reserve_fund_amount}€)"
        
        # Convert payment.date (DateField) to DateTimeField for Transaction
        from datetime import datetime
        from django.utils import timezone
        
        payment_datetime = datetime.combine(payment.date, datetime.min.time())
        if timezone.is_naive(payment_datetime):
            payment_datetime = timezone.make_aware(payment_datetime)
        
        Transaction.objects.create(
            building=building,
            apartment=apartment,
            date=payment_datetime,  # Use converted datetime
            apartment_number=apartment.number,
            type='common_expense_payment',
            description=description,
            amount=payment.amount,
            balance_before=previous_balance,
            balance_after=apartment.current_balance,
            reference_id=str(payment.id),
            reference_type='payment',
            notes=payment.notes,
            created_by=str(self.request.user) if self.request.user.is_authenticated else 'System'
        )
        
        # Χειρισμός file upload αν υπάρχει
        if 'receipt' in self.request.FILES:
            try:
                file = self.request.FILES['receipt']
                file_path = FileUploadService.save_file(file, payment.id)
                payment.receipt = file_path
                payment.save()
            except Exception as e:
                # Αν αποτύχει το file upload, διαγράφουμε την payment και επαναφέρουμε τις αλλαγές
                building.current_reserve -= payment.amount
                building.save()
                
                # Επαναφορά υπολοίπου διαμερίσματος
                apartment.current_balance = previous_balance
                apartment.save()
                
                # Διαγραφή του transaction που δημιουργήθηκε
                from .models import Transaction
                Transaction.objects.filter(
                    reference_id=str(payment.id),
                    reference_type='payment'
                ).delete()
                
                payment.delete()
                raise ValidationError(f"Σφάλμα στο upload αρχείου: {str(e)}")
        
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='CREATE',
            payment=payment,
            request=self.request
        )
        
        # Automatically create a receipt for the payment
        self._create_payment_receipt(payment)
        
        # Auto cleanup and refresh after payment creation
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result['cleanup_performed']:
                print(f"🧹 Auto cleanup performed after payment creation: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after payment creation: {str(e)}")
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης εισπράξεως"""
        # Get the old payment amount before update
        old_payment = self.get_object()
        old_amount = old_payment.amount
        
        # Save the updated payment
        payment = serializer.save()
        new_amount = payment.amount
        
        # Update the building's current reserve
        building = payment.apartment.building
        building.current_reserve -= old_amount - new_amount  # Subtract old amount, add new amount
        building.save()
        
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='UPDATE',
            payment=payment,
            request=self.request
        )
        
        # Auto cleanup and refresh after payment update
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result['cleanup_performed']:
                print(f"🧹 Auto cleanup performed after payment update: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after payment update: {str(e)}")
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής εισπράξεως"""
        # Subtract the payment amount from the building's current reserve
        building = instance.apartment.building
        building.current_reserve -= instance.amount
        building.save()
        
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='DELETE',
            payment=instance,
            request=self.request
        )
        instance.delete()
        
        # Auto cleanup and refresh after payment deletion
        try:
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(instance.apartment.building.id)
            cleanup_result = integrity_service.auto_cleanup_and_refresh()
            
            if cleanup_result['cleanup_performed']:
                print(f"🧹 Auto cleanup performed after payment deletion: {cleanup_result['message']}")
        except Exception as e:
            print(f"⚠️ Auto cleanup failed after payment deletion: {str(e)}")
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = self.queryset
        building_id = self.request.query_params.get('building_id')
        month = self.request.query_params.get('month')
        
        if building_id:
            queryset = queryset.filter(apartment__building_id=building_id)
        
        # Φιλτράρισμα ανά μήνα
        if month:
            try:
                # Parse month parameter (format: YYYY-MM)
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)
                
                # Create date range for the month
                from datetime import date
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, month_num + 1, 1)
                
                queryset = queryset.filter(date__gte=start_date, date__lt=end_date)
            except (ValueError, TypeError):
                # If month parameter is invalid, ignore it
                pass
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def process_payment(self, request):
        """Επεξεργασία πληρωμής με ενημέρωση υπολοίπων"""
        try:
            payment_data = request.data
            processor = PaymentProcessor()
            transaction = processor.process_payment(payment_data)
            
            return Response({
                'success': True,
                'transaction_id': getattr(transaction, 'id', None),
                'message': 'Η πληρωμή επεξεργάστηκε επιτυχώς'
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def methods(self, request):
        """Λήψη διαθέσιμων μεθόδων πληρωμής"""
        methods = [{'value': choice[0], 'label': choice[1]} for choice in Payment.PAYMENT_METHODS]
        return Response(methods)
    
    def _create_payment_receipt(self, payment):
        """Αυτόματη δημιουργία απόδειξης για την πληρωμή"""
        try:
            # Map payment method to receipt type
            method_to_receipt_type = {
                'cash': 'cash',
                'bank_transfer': 'bank_transfer',
                'check': 'check',
                'card': 'card',
            }
            
            receipt_type = method_to_receipt_type.get(payment.method, 'other')
            
            # Create receipt
            FinancialReceipt.objects.create(
                payment=payment,
                receipt_type=receipt_type,
                amount=payment.amount,
                receipt_date=payment.date,
                payer_name=payment.payer_name or f"{payment.apartment.owner_name}",
                payer_type=payment.payer_type,
                reference_number=payment.reference_number or '',
                notes=payment.notes or '',
                created_by=self.request.user if self.request.user.is_authenticated else None
            )
            
            print(f"✅ Receipt created automatically for payment {payment.id}")
            
        except Exception as e:
            print(f"⚠️ Failed to create receipt for payment {payment.id}: {str(e)}")
            # Don't fail the payment creation if receipt creation fails
    
    @action(detail=False, methods=['post'])
    def cleanup_data_integrity(self, request):
        """Manual cleanup of data integrity issues"""
        try:
            building_id = request.data.get('building_id')
            if not building_id:
                return Response(
                    {'error': 'building_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from .services import DataIntegrityService
            integrity_service = DataIntegrityService(building_id)
            result = integrity_service.auto_cleanup_and_refresh()
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Μαζική διαγραφή εισπράξεων για συγκεκριμένο διαμέρισμα.

        Query params:
        - apartment_id: υποχρεωτικό
        - month: προαιρετικό (μορφή YYYY-MM) για φιλτράρισμα ανά μήνα
        - building_id: προαιρετικό για επιπλέον έλεγχο κτιρίου
        """
        try:
            apartment_id = request.query_params.get('apartment_id')
            month = request.query_params.get('month')
            building_id = request.query_params.get('building_id')

            if not apartment_id:
                return Response({'error': 'apartment_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Βεβαίωση ότι το διαμέρισμα υπάρχει και (αν δοθεί) ανήκει στο κτίριο
            try:
                if building_id:
                    apartment = Apartment.objects.get(id=apartment_id, building_id=building_id)
                else:
                    apartment = Apartment.objects.get(id=apartment_id)
            except Apartment.DoesNotExist:
                return Response({'error': 'Το διαμέρισμα δεν βρέθηκε'}, status=status.HTTP_404_NOT_FOUND)

            # Βασικό queryset πληρωμών για το διαμέρισμα
            queryset = Payment.objects.filter(apartment_id=apartment_id)

            # Φίλτρο ανά μήνα αν ζητηθεί
            if month:
                try:
                    year_str, month_str = month.split('-')
                    year = int(year_str)
                    month_num = int(month_str)
                    from datetime import date
                    start_date = date(year, month_num, 1)
                    if month_num == 12:
                        end_date = date(year + 1, 1, 1)
                    else:
                        end_date = date(year, month_num + 1, 1)
                    queryset = queryset.filter(date__gte=start_date, date__lt=end_date)
                except (ValueError, TypeError):
                    return Response({'error': 'invalid month format, expected YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)

            payments_to_delete = list(queryset.order_by('date', 'id'))

            if not payments_to_delete:
                return Response({
                    'success': True,
                    'deleted_count': 0,
                    'total_amount': 0.0,
                    'apartment_id': int(apartment_id),
                    'month': month,
                    'message': 'Δεν βρέθηκαν πληρωμές προς διαγραφή'
                })

            deleted_count = 0
            total_amount = Decimal('0.00')

            # Διαγράφουμε μία-μία για να εκτελεστεί το perform_destroy (audit + ενημερώσεις)
            for payment in payments_to_delete:
                total_amount += payment.amount
                self.perform_destroy(payment)
                deleted_count += 1

            return Response({
                'success': True,
                'deleted_count': deleted_count,
                'total_amount': float(total_amount),
                'apartment_id': int(apartment_id),
                'month': month,
                'message': f'Διαγράφηκαν {deleted_count} πληρωμές συνολικού ποσού {float(total_amount):.2f}'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        """Επαλήθευση πληρωμής για QR code"""
        try:
            payment = self.get_object()
            
            # Δημιουργία δεδομένων επαλήθευσης
            verification_data = {
                'payment_id': payment.id,
                'apartment_number': payment.apartment.number,
                'building_name': payment.apartment.building.name,
                'amount': float(payment.amount),
                'date': payment.date.isoformat(),
                'method': payment.get_method_display(),
                'payment_type': payment.get_payment_type_display(),
                'payer_name': payment.payer_name or 'Μη καταχωρημένος',
                'payer_type': payment.get_payer_type_display(),
                'reference_number': payment.reference_number or 'Μη διαθέσιμος',
                'notes': payment.notes or 'Δεν υπάρχουν σημειώσεις',
                'verified_at': datetime.now().isoformat(),
                'status': 'verified'
            }
            
            return Response({
                'success': True,
                'message': 'Η πληρωμή επαληθεύθηκε επιτυχώς',
                'data': verification_data
            })
            
        except Payment.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Η πληρωμή δεν βρέθηκε'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Σφάλμα κατά την επαλήθευση: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FinancialDashboardViewSet(viewsets.ViewSet):
    """ViewSet για το οικονομικό dashboard"""
    # permission_classes = [FinancialReadPermission]  # Temporarily disabled for debugging
    authentication_classes = []  # Temporarily disable authentication for debugging
    permission_classes = []  # Temporarily disable permissions for debugging
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Λήψη οικονομικού συνόψη"""
        building_id = request.query_params.get('building_id')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = FinancialDashboardService(int(building_id))
            summary = service.get_summary(month)
            serializer = FinancialSummarySerializer(summary)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='improved-summary')
    def improved_summary(self, request):
        """Λήψη βελτιωμένου οικονομικού συνόψη με καλύτερη ορολογία"""
        building_id = request.query_params.get('building_id')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            from dateutil.relativedelta import relativedelta
            
            service = FinancialDashboardService(int(building_id))
            
            # Get current month info
            if month:
                current_date = datetime.strptime(month + '-01', '%Y-%m-%d')
            else:
                current_date = datetime.now()
            
            # Get previous month info
            previous_date = current_date - relativedelta(months=1)
            previous_month_str = previous_date.strftime('%Y-%m')
            
            # Get basic summary
            summary = service.get_summary(month)
            
            # Calculate improved structure
            improved_data = {
                # Previous month expenses (operational expenses from previous month)
                'previous_month_expenses': summary.get('total_expenses_month', 0),
                'previous_month_name': previous_date.strftime('%B %Y'),
                
                # Current month charges
                'management_fees': summary.get('management_fees', 0),
                'reserve_fund_contribution': summary.get('reserve_fund_contribution', 0),
                'current_month_name': current_date.strftime('%B %Y'),
                
                # Invoice total (previous expenses + current charges)
                'invoice_total': (
                    summary.get('total_expenses_month', 0) + 
                    summary.get('management_fees', 0) + 
                    summary.get('reserve_fund_contribution', 0)
                ),
                
                # Total obligations
                'current_invoice': (
                    summary.get('total_expenses_month', 0) + 
                    summary.get('management_fees', 0) + 
                    summary.get('reserve_fund_contribution', 0)
                ),
                'previous_balances': summary.get('previous_balance', 0),
                'grand_total': summary.get('total_balance', 0),
                
                # Coverage calculations
                'current_invoice_paid': summary.get('total_payments_month', 0),
                'current_invoice_total': (
                    summary.get('total_expenses_month', 0) + 
                    summary.get('management_fees', 0) + 
                    summary.get('reserve_fund_contribution', 0)
                ),
                'current_invoice_coverage_percentage': (
                    (summary.get('total_payments_month', 0) / max(
                        summary.get('total_expenses_month', 0) + 
                        summary.get('management_fees', 0) + 
                        summary.get('reserve_fund_contribution', 0), 1
                    )) * 100
                ),
                
                'total_paid': summary.get('total_payments', 0),
                'total_obligations': abs(summary.get('total_balance', 0)),
                'total_coverage_percentage': (
                    (summary.get('total_payments', 0) / max(abs(summary.get('total_balance', 0)), 1)) * 100
                ),
                
                # Reserve fund info
                'current_reserve': summary.get('current_reserve', 0),
                'reserve_target': summary.get('reserve_target', 1000),
                'reserve_monthly_contribution': summary.get('reserve_fund_contribution', 0),
                'reserve_progress_percentage': (
                    (summary.get('current_reserve', 0) / max(summary.get('reserve_target', 1000), 1)) * 100
                ),
                
                # Building info
                'apartment_count': summary.get('apartment_count', 0),
                'has_monthly_activity': summary.get('has_monthly_activity', False)
            }
            
            return Response(improved_data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    


    @action(detail=True, methods=['get'])
    def apartments_summary(self, request, pk=None):
        """Λήψη συνοπτικών οικονομικών δεδομένων όλων των διαμερισμάτων ενός κτιρίου"""
        building_id = pk
        month = request.query_params.get('month')  # Προσθήκη παραμέτρου month
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = FinancialDashboardService(int(building_id))
            
            # Get apartment balances with month filtering
            apartment_balances = service.get_apartment_balances(month)
            balance_dict = {b['id']: b['current_balance'] for b in apartment_balances}
            
            # Get all apartments for the building
            apartments = Apartment.objects.filter(building_id=building_id)
            
            apartments_summary = []
            for apartment in apartments:
                # Get the latest payment for this apartment
                latest_payment = Payment.objects.filter(
                    apartment=apartment
                ).order_by('-date', '-id').first()
                
                # Use balance from service (which handles historical filtering)
                current_balance = float(balance_dict.get(apartment.id, 0))
                
                # Calculate monthly due using the service
                try:
                    calculator = CommonExpenseCalculator(building_id, month)
                    shares = calculator.calculate_shares()
                    apartment_share = shares.get(apartment.id, {})
                    # Monthly due = total_amount (δαπάνες) + reserve_fund_amount (αποθεματικό)
                    # ΔΕΝ χρησιμοποιούμε total_due που είναι αρνητικό
                    monthly_due = float(apartment_share.get('total_amount', 0)) + float(apartment_share.get('reserve_fund_amount', 0))
                except Exception:
                    monthly_due = 0.0
                
                apartment_data = {
                    'id': apartment.id,
                    'number': apartment.number,
                    'owner_name': apartment.owner_name,
                    'tenant_name': apartment.tenant_name,
                    'current_balance': current_balance,
                    'monthly_due': monthly_due,
                    'building_id': apartment.building.id,
                    'building_name': apartment.building.name,
                    'participation_mills': apartment.participation_mills,
                    'heating_mills': apartment.heating_mills,
                    'elevator_mills': apartment.elevator_mills,
                    'latest_payment_date': latest_payment.date.isoformat() if latest_payment else None,
                    'latest_payment_amount': float(latest_payment.amount) if latest_payment else None,
                }
                apartments_summary.append(apartment_data)
            
            return Response(apartments_summary)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def apartment_obligations(self, request):
        """Λήψη αναλυτικών οφειλών ανά διαμέρισμα"""
        building_id = request.query_params.get('building_id')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .services import FinancialDashboardService
            from apartments.models import Apartment
            from decimal import Decimal
            
            # Get apartments for this building
            apartments = Apartment.objects.filter(building_id=building_id)
            
            # Calculate obligations for each apartment
            apartment_obligations = []
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            apartments_count = apartments.count()
            
            for apartment in apartments:
                # Initialize apartment data
                apartment_data = {
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'owner_name': apartment.owner_name or 'Άγνωστος',
                    'participation_mills': apartment.participation_mills or 0,
                    'current_balance': float(apartment.current_balance or Decimal('0.00')),
                    'total_obligations': 0.0,
                    'total_payments': 0.0,
                    'net_obligation': 0.0,
                    'expense_breakdown': [],
                    'payment_breakdown': []
                }
                
                # Calculate obligations from expenses
                expenses = Expense.objects.filter(building_id=building_id)
                for expense in expenses:
                    share_amount = 0.0
                    
                    if expense.distribution_type == 'by_participation_mills':
                        # Distribution by participation mills
                        mills = apartment.participation_mills or 0
                        if total_mills > 0:
                            share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                        else:
                            share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    elif expense.distribution_type == 'equal_share':
                        # Equal distribution
                        share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                        # Fallback to participation mills for now
                        mills = apartment.participation_mills or 0
                        if total_mills > 0:
                            share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                        else:
                            share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    apartment_data['total_obligations'] += share_amount
                    apartment_data['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': float(expense.amount),
                        'share_amount': share_amount,
                        'distribution_type': expense.distribution_type,
                        'date': expense.date.isoformat(),
                        'month': expense.date.strftime('%Y-%m'),
                        'month_display': expense.date.strftime('%B %Y'),
                        'mills': apartment.participation_mills or 0,
                        'total_mills': total_mills
                    })
                
                # Calculate payments
                payments = Payment.objects.filter(apartment=apartment)
                for payment in payments:
                    payment_amount = float(payment.amount)
                    apartment_data['total_payments'] += payment_amount
                    apartment_data['payment_breakdown'].append({
                        'id': payment.id,
                        'amount': payment_amount,
                        'date': payment.date.isoformat(),
                        'method': payment.method,
                        'method_display': payment.get_method_display(),
                        'payment_type': payment.payment_type,
                        'payment_type_display': payment.get_payment_type_display(),
                        'reference_number': payment.reference_number,
                        'notes': payment.notes,
                        'payer_name': payment.payer_name or 'Άγνωστος'
                    })
                
                # Calculate net obligation
                apartment_data['net_obligation'] = apartment_data['total_obligations'] - apartment_data['total_payments']
                
                apartment_obligations.append(apartment_data)
            
            return Response({
                'apartments': apartment_obligations,
                'summary': {
                    'total_obligations': sum(apt['total_obligations'] for apt in apartment_obligations),
                    'total_payments': sum(apt['total_payments'] for apt in apartment_obligations),
                    'total_net_obligations': sum(max(0, apt['net_obligation']) for apt in apartment_obligations),
                    'apartments_with_obligations': len([apt for apt in apartment_obligations if apt['net_obligation'] > 0])
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error calculating apartment obligations: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Λήψη αναλυτικών ισοζυγίων διαμερισμάτων με ιστορικό οφειλών"""
        building_id = request.query_params.get('building_id')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apartments.models import Apartment
            from decimal import Decimal
            from django.db.models import Sum, Q
            from datetime import datetime, date
            
            # Get building and apartments
            from buildings.models import Building
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id)
            
            # Calculate balances for each apartment
            apartment_balances = []
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            apartments_count = apartments.count()
            
            for apartment in apartments:
                # Initialize apartment data
                apartment_data = {
                    'apartment_id': apartment.id,
                    'apartment_number': apartment.number,
                    'owner_name': apartment.owner_name or 'Άγνωστος',
                    'participation_mills': apartment.participation_mills or 0,
                    'current_balance': float(apartment.current_balance or Decimal('0.00')),
                    'previous_balance': 0.0,  # Will be calculated
                    'expense_share': 0.0,     # Current month obligations
                    'total_obligations': 0.0, # Historical + current
                    'total_payments': 0.0,    # Historical + current
                    'net_obligation': 0.0,    # Total obligations - total payments
                    'status': 'Ενεργό',
                    'expense_breakdown': [],
                    'payment_breakdown': []
                }
                
                # Calculate historical obligations from all expenses
                expenses = Expense.objects.filter(building_id=building_id)
                for expense in expenses:
                    share_amount = 0.0
                    
                    if expense.distribution_type == 'by_participation_mills':
                        # Distribution by participation mills
                        mills = apartment.participation_mills or 0
                        if total_mills > 0:
                            share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                        else:
                            share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    elif expense.distribution_type == 'equal_share':
                        # Equal distribution
                        share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                        # Fallback to participation mills for now
                        mills = apartment.participation_mills or 0
                        if total_mills > 0:
                            share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                        else:
                            share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                    
                    apartment_data['total_obligations'] += share_amount
                    apartment_data['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': float(expense.amount),
                        'share_amount': share_amount,
                        'distribution_type': expense.distribution_type,
                        'date': expense.date.isoformat(),
                        'month': expense.date.strftime('%Y-%m'),
                        'month_display': expense.date.strftime('%B %Y'),
                        'mills': apartment.participation_mills or 0,
                        'total_mills': total_mills
                    })
                
                # Calculate historical payments
                payments = Payment.objects.filter(apartment=apartment)
                for payment in payments:
                    payment_amount = float(payment.amount)
                    apartment_data['total_payments'] += payment_amount
                    apartment_data['payment_breakdown'].append({
                        'id': payment.id,
                        'amount': payment_amount,
                        'date': payment.date.isoformat(),
                        'method': payment.method,
                        'method_display': payment.get_method_display(),
                        'payment_type': payment.payment_type,
                        'payment_type_display': payment.get_payment_type_display(),
                        'reference_number': payment.reference_number,
                        'notes': payment.notes,
                        'payer_name': payment.payer_name or 'Άγνωστος'
                    })
                
                # Calculate net obligation
                apartment_data['net_obligation'] = apartment_data['total_obligations'] - apartment_data['total_payments']
                
                # Calculate previous balance (before current month)
                if month:
                    try:
                        # Parse month to get start of month
                        year, mon = map(int, month.split('-'))
                        month_start = date(year, mon, 1)
                        
                        # Calculate obligations before this month
                        previous_expenses = expenses.filter(date__lt=month_start)
                        previous_obligations = 0.0
                        
                        for expense in previous_expenses:
                            share_amount = 0.0
                            
                            if expense.distribution_type == 'by_participation_mills':
                                mills = apartment.participation_mills or 0
                                if total_mills > 0:
                                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                                else:
                                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            elif expense.distribution_type == 'equal_share':
                                share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                                mills = apartment.participation_mills or 0
                                if total_mills > 0:
                                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                                else:
                                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            previous_obligations += share_amount
                        
                        # Calculate payments before this month
                        previous_payments = payments.filter(date__lt=month_start)
                        previous_payments_total = sum(float(p.amount) for p in previous_payments)
                        
                        apartment_data['previous_balance'] = previous_obligations - previous_payments_total
                        
                        # Current month expense share
                        current_month_expenses = expenses.filter(date__gte=month_start)
                        current_month_share = 0.0
                        
                        for expense in current_month_expenses:
                            share_amount = 0.0
                            
                            if expense.distribution_type == 'by_participation_mills':
                                mills = apartment.participation_mills or 0
                                if total_mills > 0:
                                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                                else:
                                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            elif expense.distribution_type == 'equal_share':
                                share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                                mills = apartment.participation_mills or 0
                                if total_mills > 0:
                                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                                else:
                                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
                            
                            current_month_share += share_amount
                        
                        # Add management fees and reserve fund contributions to current month obligations
                        management_fee_share = float(building.management_fee_per_apartment or 0)
                        
                        # Calculate reserve fund contribution based on participation mills
                        reserve_contribution_share = 0.0
                        if building.reserve_fund_goal and building.reserve_fund_duration_months and total_mills > 0:
                            monthly_reserve_total = round(float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months), 2)
                            reserve_contribution_share = round((monthly_reserve_total / total_mills) * (apartment.participation_mills or 0), 2)
                        
                        apartment_data['expense_share'] = round(current_month_share + management_fee_share + reserve_contribution_share, 2)
                        
                        # Add current month obligations to net_obligation
                        current_month_obligations = round(current_month_share + management_fee_share + reserve_contribution_share, 2)
                        apartment_data['net_obligation'] += current_month_obligations
                        
                    except Exception as e:
                        print(f"Error parsing month {month}: {e}")
                        apartment_data['previous_balance'] = apartment_data['net_obligation']
                        apartment_data['expense_share'] = 0.0
                else:
                    # No month specified, use total obligations as previous balance
                    apartment_data['previous_balance'] = apartment_data['net_obligation']
                    apartment_data['expense_share'] = 0.0
                
                # Determine status based on new rules:
                # 1. "Ενήμερο": net_obligation <= 0 (δεν υπάρχει οφειλή)
                # 2. "Οφειλή": net_obligation > 0 (υπάρχει οφειλή)
                # 3. "Κρίσιμο": οφειλή > 2 μήνες
                
                from datetime import datetime, date
                current_date = datetime.now().date()
                
                # Check if debt is older than 2 months
                is_debt_older_than_2_months = False
                if apartment_data['net_obligation'] > 0 and month:
                    try:
                        # Parse the month to get the debt date
                        year, mon = map(int, month.split('-'))
                        debt_date = date(year, mon, 1)
                        
                        # Calculate months difference
                        months_diff = (current_date.year - debt_date.year) * 12 + (current_date.month - debt_date.month)
                        is_debt_older_than_2_months = months_diff > 2
                    except:
                        # If month parsing fails, assume debt is not older than 2 months
                        is_debt_older_than_2_months = False
                
                if apartment_data['net_obligation'] <= 0:
                    # Fully paid or has credit
                    apartment_data['status'] = 'Ενήμερο'
                elif is_debt_older_than_2_months:
                    # Debt older than 2 months
                    apartment_data['status'] = 'Κρίσιμο'
                else:
                    # Has debt (net_obligation > 0)
                    apartment_data['status'] = 'Οφειλή'
                
                apartment_balances.append(apartment_data)
            
            # Calculate summary statistics
            total_obligations = sum(apt['total_obligations'] for apt in apartment_balances)
            total_payments = sum(apt['total_payments'] for apt in apartment_balances)
            total_net_obligations = sum(max(0, apt['net_obligation']) for apt in apartment_balances)
            
            # Count apartments by status
            active_count = len([apt for apt in apartment_balances if apt['status'] == 'Ενήμερο'])
            debt_count = len([apt for apt in apartment_balances if apt['status'] == 'Οφειλή'])
            critical_count = len([apt for apt in apartment_balances if apt['status'] == 'Κρίσιμο'])
            credit_count = len([apt for apt in apartment_balances if apt['status'] == 'Πιστωτικό'])
            
            # Determine the actual month of the data
            actual_month = None
            if apartment_balances and apartment_balances[0]['expense_breakdown']:
                # Get the most recent expense month
                all_months = []
                for apt in apartment_balances:
                    for expense in apt['expense_breakdown']:
                        if 'month' in expense:
                            all_months.append(expense['month'])
                
                if all_months:
                    # Sort months and get the most recent
                    all_months.sort()
                    actual_month = all_months[-1]
            
            return Response({
                'apartments': apartment_balances,
                'summary': {
                    'total_obligations': total_obligations,
                    'total_payments': total_payments,
                    'total_net_obligations': total_net_obligations,
                    'active_count': active_count,
                    'debt_count': debt_count,
                    'critical_count': critical_count,
                    'credit_count': credit_count,
                    'total_apartments': len(apartment_balances),
                    'data_month': actual_month,  # Add the actual month of the data
                    'requested_month': month  # Add the requested month for comparison
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error calculating apartment balances: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def apartment_transaction_history(self, request):
        """Λήψη ιστορικού κινήσεων διαμερίσματος (χρεώσεις και πληρωμές) ανά μήνα"""
        building_id = request.query_params.get('building_id')
        apartment_id = request.query_params.get('apartment_id')
        months_back = int(request.query_params.get('months_back', 6))
        
        if not building_id or not apartment_id:
            return Response(
                {'error': 'Building ID and Apartment ID are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apartments.models import Apartment
            from decimal import Decimal
            from datetime import datetime, date, timedelta
            from calendar import monthrange
            
            # Get apartment
            apartment = Apartment.objects.get(id=apartment_id, building_id=building_id)
            
            # Calculate date range (last N months)
            today = date.today()
            end_date = today
            start_date = today - timedelta(days=30 * months_back)
            
            # Get all transactions for this apartment in the date range
            # Group by reference_id to avoid duplicates from different transaction types
            transactions = Transaction.objects.filter(
                apartment=apartment,
                date__date__gte=start_date,
                date__date__lte=end_date
            ).order_by('-date')
            
            # Remove duplicate transactions with same reference_id
            seen_references = set()
            unique_transactions = []
            for transaction in transactions:
                if transaction.reference_id:
                    if transaction.reference_id in seen_references:
                        continue
                    seen_references.add(transaction.reference_id)
                unique_transactions.append(transaction)
            
            # Group transactions by month
            monthly_data = {}
            
            for transaction in unique_transactions:
                # Get month key (YYYY-MM format)
                month_key = transaction.date.strftime('%Y-%m')
                
                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'month': month_key,
                        'month_display': transaction.date.strftime('%B %Y'),
                        'charges': [],
                        'payments': [],
                        'total_charges': 0.0,
                        'total_payments': 0.0,
                        'net_amount': 0.0
                    }
                
                # Determine if it's a charge or payment
                is_charge = transaction.type in [
                    'expense_created', 
                    'common_expense_charge', 
                    'interest_charge', 
                    'penalty_charge'
                ]
                
                transaction_data = {
                    'id': transaction.id,
                    'date': transaction.date.isoformat(),
                    'amount': float(transaction.amount),
                    'type': transaction.type,
                    'type_display': transaction.get_type_display(),
                    'description': transaction.description,
                    'balance_before': float(transaction.balance_before or 0),
                    'balance_after': float(transaction.balance_after or 0),
                    'reference_id': transaction.reference_id,
                    'reference_type': transaction.reference_type,
                    'notes': transaction.notes
                }
                
                if is_charge:
                    monthly_data[month_key]['charges'].append(transaction_data)
                    monthly_data[month_key]['total_charges'] += float(transaction.amount)
                    monthly_data[month_key]['net_amount'] -= float(transaction.amount)
                else:
                    monthly_data[month_key]['payments'].append(transaction_data)
                    monthly_data[month_key]['total_payments'] += float(transaction.amount)
                    monthly_data[month_key]['net_amount'] += float(transaction.amount)
            
            # Convert to list and sort by month (newest first)
            monthly_list = list(monthly_data.values())
            monthly_list.sort(key=lambda x: x['month'], reverse=True)
            
            # Add empty months for the last N months
            complete_monthly_list = []
            for i in range(months_back):
                target_date = today - timedelta(days=30 * i)
                month_key = target_date.strftime('%Y-%m')
                
                # Find if we have data for this month
                month_data = next((m for m in monthly_list if m['month'] == month_key), None)
                
                if month_data:
                    complete_monthly_list.append(month_data)
                else:
                    # Add empty month
                    complete_monthly_list.append({
                        'month': month_key,
                        'month_display': target_date.strftime('%B %Y'),
                        'charges': [],
                        'payments': [],
                        'total_charges': 0.0,
                        'total_payments': 0.0,
                        'net_amount': 0.0
                    })
            
            return Response({
                'apartment': {
                    'id': apartment.id,
                    'number': apartment.number,
                    'owner_name': apartment.owner_name or 'Άγνωστος',
                    'current_balance': float(apartment.current_balance or 0)
                },
                'months': complete_monthly_list,
                'summary': {
                    'total_charges': sum(m['total_charges'] for m in complete_monthly_list),
                    'total_payments': sum(m['total_payments'] for m in complete_monthly_list),
                    'net_amount': sum(m['net_amount'] for m in complete_monthly_list),
                    'months_with_activity': len([m for m in complete_monthly_list if m['charges'] or m['payments']])
                }
            })
            
        except Apartment.DoesNotExist:
            return Response(
                {'error': 'Apartment not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error retrieving transaction history: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommonExpenseViewSet(viewsets.ViewSet):
    """ViewSet για τη διαχείριση κοινοχρήστων"""
    permission_classes = [FinancialWritePermission]
    
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Υπολογισμός κοινοχρήστων"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            include_reserve_fund = data.get('include_reserve_fund', True)  # Προεπιλογή True
            month_filter = data.get('month_filter')  # "YYYY-MM" format
            
            print(f"🔍 calculate: building_id: {building_id}, month_filter: {month_filter}")
            
            if not building_id:
                raise ValueError('building_id is required')
            
            # Pass month_filter to CommonExpenseCalculator for proper expense filtering
            calculator = CommonExpenseCalculator(int(building_id), month_filter)
            result = {
                'shares': calculator.calculate_shares(include_reserve_fund=include_reserve_fund),
                'total_expenses': float(calculator.get_total_expenses()),
                'apartments_count': calculator.get_apartments_count(),
                'include_reserve_fund': include_reserve_fund,
                'month_filter': month_filter,
            }
            
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def calculate_advanced(self, request):
        """Προηγμένος υπολογισμός κοινοχρήστων σύμφωνα με το TODO αρχείο"""
        try:
            data = request.data
            print(f"🔍 calculate_advanced: Received data: {data}")
            print(f"🔍 calculate_advanced: Data type: {type(data)}")
            
            # Handle both JSON and form data
            if hasattr(data, 'getlist'):
                # Form data (QueryDict)
                building_id = data.get('building_id') or data.get('building')
                period_start_date = data.get('period_start_date')
                period_end_date = data.get('period_end_date')
                month_filter = data.get('month_filter')
                reserve_fund_monthly_total = data.get('reserve_fund_monthly_total')
            else:
                # JSON data
                building_id = data.get('building_id') or data.get('building')
                period_start_date = data.get('period_start_date')
                period_end_date = data.get('period_end_date')
                month_filter = data.get('month_filter')
                reserve_fund_monthly_total = data.get('reserve_fund_monthly_total')
            
            print(f"🔍 calculate_advanced: building_id: {building_id}")
            print(f"🔍 calculate_advanced: period_start_date: {period_start_date}")
            print(f"🔍 calculate_advanced: period_end_date: {period_end_date}")
            print(f"🔍 calculate_advanced: month_filter: {month_filter}")
            
            if not building_id:
                raise ValueError('building_id is required')
            
            # Convert building_id to int if it's a string
            try:
                building_id = int(building_id)
            except (ValueError, TypeError):
                raise ValueError(f'Invalid building_id: {building_id}')
            
            # If month_filter is provided, use it to set period dates
            if month_filter and not (period_start_date and period_end_date):
                from datetime import datetime, date, timedelta
                try:
                    year, month = month_filter.split('-')
                    year, month = int(year), int(month)
                    
                    # Create start and end dates for the month
                    start_date = date(year, month, 1)
                    if month == 12:
                        end_date = date(year + 1, 1, 1) - timedelta(days=1)
                    else:
                        end_date = date(year, month + 1, 1) - timedelta(days=1)
                    
                    period_start_date = start_date.strftime('%Y-%m-%d')
                    period_end_date = end_date.strftime('%Y-%m-%d')
                    
                    print(f"🔄 calculate_advanced: Using month_filter to set dates: {period_start_date} to {period_end_date}")
                except (ValueError, IndexError) as e:
                    print(f"⚠️ calculate_advanced: Invalid month_filter format: {month_filter}, error: {e}")
            
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date=period_start_date,
                period_end_date=period_end_date,
                reserve_fund_monthly_total=reserve_fund_monthly_total
            )
            
            result = calculator.calculate_advanced_shares()
            print(f"🔍 calculate_advanced: Calculation successful, result keys: {list(result.keys())}")
            
            return Response(result)
        except ValueError as e:
            print(f"❌ calculate_advanced: ValueError: {e}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"❌ calculate_advanced: Exception: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Internal server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def quick_calculate_current(self, request):
        """Άμεσος υπολογισμός κοινοχρήστων για τον τρέχοντα μήνα.

        Δημιουργεί (ή επαναχρησιμοποιεί) αυτόματα την τρέχουσα μηνιαία περίοδο
        και επιστρέφει τα μερίδια χωρίς να απαιτείται ορισμός παραμέτρων περιόδου.
        """
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            if not building_id:
                return Response({'error': 'building_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Ensure int type
            try:
                building_id = int(building_id)
            except (ValueError, TypeError):
                return Response({'error': 'invalid building_id'}, status=status.HTTP_400_BAD_REQUEST)

            # Create or get current month period and calculate shares
            automation_service = CommonExpenseAutomationService(building_id)
            period = automation_service.create_period_automatically(period_type='monthly')
            calc_result = automation_service.calculate_shares_for_period(period)

            response_payload = {
                'success': True,
                'message': f'Ο υπολογισμός κοινοχρήστων ολοκληρώθηκε για την περίοδο {period.period_name}',
                'period': period.period_name,
            }
            response_payload.update(calc_result)

            return Response(response_payload)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def issue(self, request):
        """Έκδοση κοινοχρήστων"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_data = data.get('period_data', {})
            shares = data.get('shares', {})
            
            if not building_id:
                raise ValueError('building_id is required')
            
            # Δημιουργία περιόδου κοινοχρήστων
            period = CommonExpensePeriod.objects.create(
                building_id=building_id,
                period_name=period_data.get('name', f'Κοινοχρήστα {datetime.now().strftime("%m/%Y")}'),
                start_date=period_data.get('start_date'),
                end_date=period_data.get('end_date')
            )
            
            # Δημιουργία μεριδίων για κάθε διαμέρισμα
            apartment_shares = []
            for apartment_id, share_data in shares.items():
                apartment = Apartment.objects.get(id=apartment_id)
                previous_balance = apartment.current_balance or Decimal('0.00')
                total_amount = Decimal(str(share_data.get('total_amount', 0)))
                # Χρέωση αυξάνει οφειλή => πιο αρνητικό υπόλοιπο
                total_due = previous_balance - total_amount
                
                share = ApartmentShare.objects.create(
                    period=period,
                    apartment=apartment,
                    total_amount=total_amount,
                    previous_balance=previous_balance,
                    total_due=total_due,
                    breakdown=share_data.get('breakdown', {})
                )
                apartment_shares.append(share)
                
                # Δημιουργία κίνησης ταμείου
                Transaction.objects.create(
                    building_id=building_id,
                    date=datetime.now(),
                    type='common_expense_charge',
                    description=f'Χρέωση κοινοχρήστων - {period.period_name}',
                    apartment=apartment,
                    apartment_number=apartment.number,
                    amount=-total_amount,
                    balance_before=previous_balance,
                    balance_after=total_due,
                    reference_id=str(period.id),
                    reference_type='common_expense_period'
                )
                
                # Ενημέρωση υπολοίπου διαμερίσματος
                apartment.current_balance = total_due
                apartment.save()
            
            # Σημείωση: Οι δαπάνες θεωρούνται αυτόματα εκδομένες
            # Δεν χρειάζεται πλέον μαρκάρισμα ως εκδοθείσες
            
            return Response({
                'success': True,
                'message': f'Τα κοινοχρήστα εκδόθηκαν επιτυχώς για την περίοδο {period.period_name}',
                'period_id': period.id,
                'apartments_count': len(apartment_shares),
                'total_amount': sum(share.total_amount for share in apartment_shares)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def create_period_automatically(self, request):
        """Αυτόματη δημιουργία περιόδου κοινοχρήστων"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_type = data.get('period_type', 'monthly')
            start_date = data.get('start_date')
            
            if not building_id:
                raise ValueError('building_id is required')
            
            automation_service = CommonExpenseAutomationService(building_id)
            period = automation_service.create_period_automatically(period_type, start_date)
            
            return Response({
                'success': True,
                'message': f'Η περίοδος {period.period_name} δημιουργήθηκε επιτυχώς',
                'period': {
                    'id': period.id,
                    'name': period.period_name,
                    'start_date': period.start_date,
                    'end_date': period.end_date,
                    'is_active': period.is_active
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def collect_expenses_automatically(self, request):
        """Αυτόματη συλλογή δαπανών για περίοδο"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_id = data.get('period_id')
            
            if not building_id:
                raise ValueError('building_id is required')
            if not period_id:
                raise ValueError('period_id is required')
            
            period = CommonExpensePeriod.objects.get(id=period_id, building_id=building_id)
            automation_service = CommonExpenseAutomationService(building_id)
            expenses = automation_service.collect_expenses_for_period(period)
            
            return Response({
                'success': True,
                'message': f'Βρέθηκαν {len(expenses)} δαπάνες για την περίοδο {period.period_name}',
                'expenses': [
                    {
                        'id': exp.id,
                        'title': exp.title,
                        'amount': float(exp.amount),
                        'date': exp.date,
                        'category': exp.category,
                        'supplier': exp.supplier.name if exp.supplier else None
                    }
                    for exp in expenses
                ],
                'total_amount': float(sum(exp.amount for exp in expenses)),
                'expenses_count': len(expenses)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def calculate_automatically(self, request):
        """Αυτόματος υπολογισμός μεριδίων για περίοδο"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_id = data.get('period_id')
            
            if not building_id:
                raise ValueError('building_id is required')
            if not period_id:
                raise ValueError('period_id is required')
            
            period = CommonExpensePeriod.objects.get(id=period_id, building_id=building_id)
            automation_service = CommonExpenseAutomationService(building_id)
            result = automation_service.calculate_shares_for_period(period)
            
            return Response({
                'success': True,
                'message': f'Υπολογίστηκαν μερίδια για την περίοδο {period.period_name}',
                'calculation': result
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def issue_automatically(self, request):
        """Αυτόματη έκδοση λογαριασμών για περίοδο"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_id = data.get('period_id')
            
            if not building_id:
                raise ValueError('building_id is required')
            if not period_id:
                raise ValueError('period_id is required')
            
            period = CommonExpensePeriod.objects.get(id=period_id, building_id=building_id)
            automation_service = CommonExpenseAutomationService(building_id)
            result = automation_service.issue_period_automatically(period)
            
            return Response(result)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def auto_process_period(self, request):
        """Πλήρης αυτοματοποιημένη επεξεργασία περιόδου"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_type = data.get('period_type', 'monthly')
            start_date = data.get('start_date')
            
            if not building_id:
                raise ValueError('building_id is required')
            
            automation_service = CommonExpenseAutomationService(building_id)
            result = automation_service.auto_process_period(period_type, start_date)
            
            return Response(result)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def period_statistics(self, request):
        """Στατιστικά για περίοδο κοινοχρήστων"""
        try:
            building_id = request.query_params.get('building_id')
            period_id = request.query_params.get('period_id')
            
            if not building_id:
                raise ValueError('building_id is required')
            if not period_id:
                raise ValueError('period_id is required')
            
            period = CommonExpensePeriod.objects.get(id=period_id, building_id=building_id)
            automation_service = CommonExpenseAutomationService(building_id)
            statistics = automation_service.get_period_statistics(period)
            
            return Response({
                'success': True,
                'statistics': statistics
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def period_templates(self, request):
        """Λήψη διαθέσιμων templates περιόδων"""
        templates = [
            {
                'value': 'monthly',
                'label': 'Μηνιαία',
                'description': 'Κοινοχρήστα ανά μήνα'
            },
            {
                'value': 'quarterly',
                'label': 'Τριμηνιαία',
                'description': 'Κοινοχρήστα ανά τρίμηνο'
            },
            {
                'value': 'semester',
                'label': 'Εξαμηνιαία',
                'description': 'Κοινοχρήστα ανά εξάμηνο'
            },
            {
                'value': 'yearly',
                'label': 'Ετήσια',
                'description': 'Κοινοχρήστα ανά έτος'
            }
        ]
        
        return Response({
            'success': True,
            'templates': templates
        })


class MeterReadingViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση μετρήσεων"""
    
    queryset = MeterReading.objects.all()
    serializer_class = MeterReadingSerializer
    permission_classes = [FinancialWritePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['apartment', 'meter_type', 'reading_date']
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = self.queryset
        building_id = self.request.query_params.get('building_id')
        month = self.request.query_params.get('month')
        
        if building_id:
            queryset = queryset.filter(apartment__building_id=building_id)
        
        # Φιλτράρισμα ανά μήνα
        if month:
            try:
                # Parse month parameter (format: YYYY-MM)
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)
                
                # Create date range for the month
                from datetime import date
                start_date = date(year, month_num, 1)
                if month_num == 12:
                    end_date = date(year + 1, 1, 1)
                else:
                    end_date = date(year, month_num + 1, 1)
                
                queryset = queryset.filter(reading_date__gte=start_date, reading_date__lt=end_date)
            except (ValueError, TypeError):
                # If month parameter is invalid, ignore it
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Λήψη διαθέσιμων τύπων μετρητών"""
        types = [{'value': choice[0], 'label': choice[1]} for choice in MeterReading.METER_TYPES]
        return Response(types)
    
    @action(detail=False, methods=['get'])
    def building_consumption(self, request):
        """Λήψη κατανάλωσης ανά κτίριο"""
        building_id = request.query_params.get('building_id')
        meter_type = request.query_params.get('meter_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset()
        
        if meter_type:
            queryset = queryset.filter(meter_type=meter_type)
        if date_from:
            queryset = queryset.filter(reading_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(reading_date__lte=date_to)
        
        # Ομαδοποίηση ανά διαμέρισμα και τύπο μετρητή
        consumption_data = {}
        for reading in queryset:
            apartment_key = f"{reading.apartment.number}"
            meter_key = reading.meter_type
            
            if apartment_key not in consumption_data:
                consumption_data[apartment_key] = {}
            if meter_key not in consumption_data[apartment_key]:
                consumption_data[apartment_key][meter_key] = []
            
            consumption_data[apartment_key][meter_key].append({
                'date': reading.reading_date,
                'value': reading.value
            })
        
        return Response(consumption_data)
    
    @action(detail=False, methods=['get'])
    def apartment_history(self, request):
        """Λήψη ιστορικού μετρήσεων διαμερίσματος"""
        apartment_id = request.query_params.get('apartment_id')
        meter_type = request.query_params.get('meter_type')
        limit = int(request.query_params.get('limit', 12))
        
        if not apartment_id:
            return Response(
                {'error': 'Apartment ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.queryset.filter(apartment_id=apartment_id)
        
        if meter_type:
            queryset = queryset.filter(meter_type=meter_type)
        
        queryset = queryset.order_by('-reading_date')[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Μαζική εισαγωγή μετρήσεων"""
        try:
            readings_data = request.data.get('readings', [])
            created_readings = []
            
            for reading_data in readings_data:
                serializer = self.get_serializer(data=reading_data)
                if serializer.is_valid():
                    reading = serializer.save()
                    created_readings.append(reading)
                else:
                    return Response(
                        {'error': f'Σφάλμα σε μετρήση: {serializer.errors}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            return Response({
                'success': True,
                'message': f'Δημιουργήθηκαν {len(created_readings)} μετρήσεις',
                'created_count': len(created_readings)
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Λήψη στατιστικών μετρήσεων"""
        building_id = request.query_params.get('building_id')
        meter_type = request.query_params.get('meter_type')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset()
        
        if meter_type:
            queryset = queryset.filter(meter_type=meter_type)
        
        # Υπολογισμός στατιστικών
        total_readings = queryset.count()
        avg_consumption = queryset.aggregate(avg=models.Avg('value'))['avg'] or 0
        max_consumption = queryset.aggregate(max=models.Max('value'))['max'] or 0
        min_consumption = queryset.aggregate(min=models.Min('value'))['min'] or 0
        
        # Κατανάλωση ανά διαμέρισμα
        apartment_consumption = {}
        for reading in queryset:
            apartment_key = reading.apartment.number
            if apartment_key not in apartment_consumption:
                apartment_consumption[apartment_key] = 0
            apartment_consumption[apartment_key] += reading.value
        
        return Response({
            'total_readings': total_readings,
            'average_consumption': avg_consumption,
            'max_consumption': max_consumption,
            'min_consumption': min_consumption,
            'apartment_consumption': apartment_consumption
        })


class ReportViewSet(viewsets.ViewSet):
    """ViewSet για τη διαχείριση αναφορών και exports"""
    permission_classes = [ReportPermission]
    
    @action(detail=False, methods=['get'])
    def transaction_history(self, request):
        """Αναφορά ιστορικού κινήσεων"""
        building_id = request.query_params.get('building_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        transaction_type = request.query_params.get('type')
        month = request.query_params.get('month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Αν δοθεί month parameter, υπολογίζουμε τα date_from και date_to
        if month and not (date_from or date_to):
            try:
                year, month_num = month.split('-')
                year = int(year)
                month_num = int(month_num)
                
                from datetime import date
                date_from = date(year, month_num, 1).isoformat()
                if month_num == 12:
                    date_to = date(year + 1, 1, 1).isoformat()
                else:
                    date_to = date(year, month_num + 1, 1).isoformat()
            except (ValueError, TypeError):
                pass
        
        try:
            service = ReportService(int(building_id))
            report_data = service.generate_transaction_history_report(
                start_date=date_from,
                end_date=date_to,
                transaction_type=transaction_type
            )
            
            return Response(report_data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Αναφορά υπολοίπων διαμερισμάτων"""
        building_id = request.query_params.get('building_id')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = ReportService(int(building_id))
            report_data = service.generate_apartment_balance_report()
            
            return Response(report_data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Αναφορά οικονομικού συνόψη"""
        building_id = request.query_params.get('building_id')
        period = request.query_params.get('period', 'month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = ReportService(int(building_id))
            report_data = service.generate_financial_summary_report(
                period=period
            )
            
            return Response(report_data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def cash_flow(self, request):
        """Αναφορά ταμειακών ροών"""
        building_id = request.query_params.get('building_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = ReportService(int(building_id))
            days_param = request.query_params.get('days')
            days = int(days_param) if days_param and days_param.isdigit() else 30
            report_data = service.generate_cash_flow_data(days=days)
            
            return Response(report_data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Export σε Excel"""
        report_type = request.query_params.get('type')
        building_id = request.query_params.get('building_id')
        
        if not building_id or not report_type:
            return Response(
                {'error': 'Report type and Building ID are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = ReportService(int(building_id))
            excel_file = service.export_to_excel(
                report_type=report_type
            )
            
            return Response({
                'success': True,
                'file_url': excel_file,
                'message': 'Η αναφορά εξήχθη επιτυχώς'
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Export σε PDF"""
        report_type = request.query_params.get('type')
        building_id = request.query_params.get('building_id')
        
        if not building_id or not report_type:
            return Response(
                {'error': 'Report type and Building ID are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = ReportService(int(building_id))
            pdf_file = service.generate_pdf_report(
                report_type=report_type
            )
            
            return Response({
                'success': True,
                'file_url': pdf_file,
                'message': 'Η αναφορά εξήχθη επιτυχώς'
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ApartmentTransactionViewSet(viewsets.ViewSet):
    """ViewSet για το ιστορικό συναλλαγών διαμερίσματος"""
    
    def list(self, request, apartment_id=None):
        """Λήψη ιστορικού συναλλαγών για συγκεκριμένο διαμέρισμα από URL parameter"""
        if not apartment_id:
            # Fallback to query parameter if not in URL
            apartment_id = request.query_params.get('apartment_id')
            if not apartment_id:
                return Response(
                    {'error': 'Apartment ID is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            apartment = Apartment.objects.get(id=apartment_id)
            return self._get_apartment_transactions(apartment)
        except Apartment.DoesNotExist:
            return Response(
                {'error': 'Το διαμέρισμα δεν βρέθηκε'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, pk=None):
        """Λήψη ιστορικού συναλλαγών για συγκεκριμένο διαμέρισμα"""
        try:
            apartment = Apartment.objects.get(id=pk)
            return self._get_apartment_transactions(apartment)
        except Apartment.DoesNotExist:
            return Response(
                {'error': 'Το διαμέρισμα δεν βρέθηκε'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_apartment_transactions(self, apartment):
        """Helper method to get apartment transaction history"""
        # Λήψη όλων των πληρωμών
        payments = Payment.objects.filter(apartment=apartment).order_by('date', 'id')
        
        # Λήψη όλων των transactions (χρεώσεων)
        # Εξαιρούμε transactions που προήλθαν από πληρωμές για να μην εμφανίζονται διπλά
        transactions = Transaction.objects.filter(apartment=apartment).exclude(reference_type='payment').order_by('date', 'id')
        
        # Συνδυασμός και ταξινόμηση
        transaction_history = []
        running_balance = Decimal('0.00')
        
        # Συλλογή όλων των συναλλαγών
        all_items = []
        
        for payment in payments:
            all_items.append({
                'type': 'payment',
                'date': payment.date,
                'amount': payment.amount,
                'description': f'Είσπραξη - {payment.get_method_display()}',
                'method': payment.method,
                'id': payment.id,
                'created_at': payment.created_at
            })
        
        for transaction in transactions:
            all_items.append({
                'type': 'charge',
                'date': transaction.date,
                'amount': -transaction.amount,  # Negative for charges
                'description': transaction.description or 'Χρέωση',
                'method': None,
                'id': transaction.id,
                'created_at': transaction.created_at
            })
        
        # Ταξινόμηση κατά ημερομηνία και δημιουργία
        # Ensure proper datetime comparison by converting dates to datetime objects
        from datetime import datetime, date
        
        def get_sort_key(item):
            # Convert date to datetime if needed for comparison
            item_date = item['date']
            if isinstance(item_date, date) and not isinstance(item_date, datetime):
                # Convert date to datetime (start of day)
                item_date = datetime.combine(item_date, datetime.min.time())
            elif isinstance(item_date, datetime):
                # Ensure timezone-naive for comparison
                item_date = item_date.replace(tzinfo=None) if item_date.tzinfo else item_date
            
            # Convert created_at to timezone-naive datetime if needed
            created_at = item['created_at']
            if isinstance(created_at, datetime) and created_at.tzinfo:
                created_at = created_at.replace(tzinfo=None)
            
            return (item_date, created_at)
        
        all_items.sort(key=get_sort_key)
        
        # Υπολογισμός προοδευτικού υπολοίπου
        for item in all_items:
            running_balance += Decimal(str(item['amount']))
            item['balance_after'] = float(running_balance)
        
        return Response(all_items)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health_check(request):
    """
    System Health Check API
    
    Επιστρέφει συνολική κατάσταση υγείας του συστήματος
    """
    try:
        # Εκτέλεση ελέγχου υγείας
        health_results = run_system_health_check()
        
        return Response({
            'status': 'success',
            'data': health_results,
            'message': f'System health check completed. Status: {health_results["overall_health"]}'
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error during system health check: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_fix_system_issues(request):
    """
    Auto Fix System Issues API
    
    Εκτελεί αυτόματη διόρθωση προβλημάτων συστήματος
    """
    try:
        # Εκτέλεση αυτόματης διόρθωσης
        fix_results = run_auto_fix()
        
        return Response({
            'status': 'success',
            'data': fix_results,
            'message': f'Auto fix completed. Fixed {fix_results["summary"]["improvement"]} issues'
        })
        
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Error during auto fix: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SystemHealthCheckView(APIView):
    """
    🔍 API endpoint για έλεγχο υγείας του οικονομικού συστήματος
    
    Επιστρέφει αναφορά για την κατάσταση του συστήματος
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """GET request για έλεγχο υγείας"""
        try:
            from .management.commands.system_health_check import SystemHealthChecker
            
            # Δημιουργία custom stdout για capture του output
            import io
            import sys
            
            class StringIO:
                def __init__(self):
                    self.buffer = io.StringIO()
                
                def write(self, text):
                    self.buffer.write(text)
                
                def getvalue(self):
                    return self.buffer.getvalue()
            
            # Εκτέλεση ελέγχου
            stdout_capture = StringIO()
            checker = SystemHealthChecker(
                detailed=False, 
                auto_fix=False,
                stdout=stdout_capture
            )
            results = checker.run_all_checks()
            
            # Προσθήκη του output στο results
            results['output'] = stdout_capture.getvalue()
            
            # Προσθήκη επιπλέον πληροφοριών
            results['status'] = 'healthy' if results['summary']['failed'] == 0 else 'issues_found'
            results['success_rate'] = (results['summary']['passed'] / results['summary']['total_checks']) * 100 if results['summary']['total_checks'] > 0 else 0
            
            return Response({
                'status': 'success',
                'data': results
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Σφάλμα κατά τον έλεγχο: {str(e)}'
            }, status=500)
    
    def post(self, request):
        """POST request για έλεγχο υγείας με επιλογές"""
        try:
            from .management.commands.system_health_check import SystemHealthChecker
            
            # Λήψη παραμέτρων
            detailed = request.data.get('detailed', False)
            auto_fix = request.data.get('auto_fix', False)
            
            # Δημιουργία custom stdout για capture του output
            import io
            
            class StringIO:
                def __init__(self):
                    self.buffer = io.StringIO()
                
                def write(self, text):
                    self.buffer.write(text)
                
                def getvalue(self):
                    return self.buffer.getvalue()
            
            # Εκτέλεση ελέγχου
            stdout_capture = StringIO()
            checker = SystemHealthChecker(
                detailed=detailed, 
                auto_fix=auto_fix,
                stdout=stdout_capture
            )
            results = checker.run_all_checks()
            
            # Προσθήκη του output στο results
            results['output'] = stdout_capture.getvalue()
            
            # Προσθήκη επιπλέον πληροφοριών
            results['status'] = 'healthy' if results['summary']['failed'] == 0 else 'issues_found'
            results['success_rate'] = (results['summary']['passed'] / results['summary']['total_checks']) * 100 if results['summary']['total_checks'] > 0 else 0
            
            return Response({
                'status': 'success',
                'data': results
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Σφάλμα κατά τον έλεγχο: {str(e)}'
            }, status=500)

@api_view(['GET'])
@permission_classes([FinancialReadPermission])
def financial_overview(request):
    """
    API endpoint για την συνοπτική εικόνα οικονομικής διαχείρισης
    
    Επιστρέφει δεδομένα για:
    - Συνολικές εισπράξεις
    - Δαπάνες διαχείρισης
    - Δαπάνες πολυκατοικίας
    - Καλυψη αποθεματικου
    - Πλεόνασμα
    """
    try:
        building_id = request.query_params.get('building_id')
        selected_month = request.query_params.get('selected_month')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import necessary services
        from .services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
        from django_tenants.utils import schema_context
        
        with schema_context('demo'):
            # Get building
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return Response(
                    {'error': 'Building not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Calculate total income (payments)
            if selected_month:
                # Filter by specific month
                year, month = selected_month.split('-')
                total_income = Payment.objects.filter(
                    apartment__building=building,
                    date__year=year,
                    date__month=month
                ).aggregate(total=models.Sum('amount'))['total'] or 0
            else:
                # Current month
                now = datetime.now()
                total_income = Payment.objects.filter(
                    apartment__building=building,
                    date__year=now.year,
                    date__month=now.month
                ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            # Calculate management expenses
            if selected_month:
                year, month = selected_month.split('-')
                management_expenses = Expense.objects.filter(
                    building=building,
                    date__year=year,
                    date__month=month,
                    category='management_fees'
                ).aggregate(total=models.Sum('amount'))['total'] or 0
            else:
                now = datetime.now()
                management_expenses = Expense.objects.filter(
                    building=building,
                    date__year=now.year,
                    date__month=now.month,
                    category='management_fees'
                ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            # Calculate building expenses (non-management)
            if selected_month:
                year, month = selected_month.split('-')
                building_expenses = Expense.objects.filter(
                    building=building,
                    date__year=year,
                    date__month=month
                ).exclude(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
            else:
                now = datetime.now()
                building_expenses = Expense.objects.filter(
                    building=building,
                    date__year=now.year,
                    date__month=now.month
                ).exclude(category='management_fees').aggregate(total=models.Sum('amount'))['total'] or 0
            
            # Calculate reserve fund target (monthly target)
            # Calculate based on goal and duration
            if building.reserve_fund_goal and building.reserve_fund_duration_months:
                reserve_fund_target = float(building.reserve_fund_goal) / building.reserve_fund_duration_months
            else:
                reserve_fund_target = float(building.reserve_contribution_per_apartment or 0) * building.apartments_count
            
            # Calculate current reserve fund (accumulated)
            reserve_fund_current = float(building.current_reserve or 0)
            
            # Calculate surplus
            total_expenses = management_expenses + building_expenses
            surplus = total_income - total_expenses
            
            # Ensure surplus is not negative for display purposes
            surplus = max(0, surplus)
            
            return Response({
                'status': 'success',
                'data': {
                    'total_income': float(total_income),
                    'management_expenses': float(management_expenses),
                    'building_expenses': float(building_expenses),
                    'reserve_fund_target': float(reserve_fund_target),
                    'reserve_fund_current': float(reserve_fund_current),
                    'surplus': float(surplus),
                    'period': selected_month or f"{datetime.now().year}-{datetime.now().month:02d}"
                }
            })
            
    except Exception as e:
        return Response({
            'status': 'error',
            'message': f'Σφάλμα κατά την ανάκτηση δεδομένων: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FinancialReceiptViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση αποδείξεων εισπράξεων"""
    
    queryset = FinancialReceipt.objects.all()
    serializer_class = FinancialReceiptSerializer
    permission_classes = [PaymentPermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['payment', 'receipt_type', 'receipt_date', 'payer_type']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας απόδειξης"""
        receipt = serializer.save(created_by=self.request.user)
        FinancialAuditLog.log_receipt_action(
            user=self.request.user,
            action='CREATE',
            receipt=receipt,
            request=self.request
        )
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης απόδειξης"""
        receipt = serializer.save()
        FinancialAuditLog.log_receipt_action(
            user=self.request.user,
            action='UPDATE',
            receipt=receipt,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής απόδειξης"""
        FinancialAuditLog.log_receipt_action(
            user=self.request.user,
            action='DELETE',
            receipt=instance,
            request=self.request
        )
        instance.delete()
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(payment__apartment__building_id=building_id)
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def by_payment(self, request):
        """Λήψη αποδείξεων για συγκεκριμένη πληρωμή"""
        payment_id = request.query_params.get('payment_id')
        if not payment_id:
            return Response(
                {'error': 'Payment ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        receipts = self.get_queryset().filter(payment_id=payment_id)
        serializer = self.get_serializer(receipts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def receipt_types(self, request):
        """Λήψη διαθέσιμων τύπων αποδείξεων"""
        receipt_types = [{'value': choice[0], 'label': choice[1]} for choice in FinancialReceipt.RECEIPT_TYPES]
        return Response(receipt_types)
