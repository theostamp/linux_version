from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Q
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError

from .models import Expense, Transaction, Payment, ExpenseApartment, MeterReading, Supplier, CommonExpensePeriod, ApartmentShare
from .serializers import (
    ExpenseSerializer, TransactionSerializer, PaymentSerializer,
    ExpenseApartmentSerializer, MeterReadingSerializer, SupplierSerializer,
    FinancialSummarySerializer, ApartmentBalanceSerializer,
    CommonExpenseCalculationSerializer
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
    filterset_fields = ['building', 'category', 'is_issued', 'date', 'distribution_type', 'supplier']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας δαπάνης με file upload"""
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
        
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='CREATE',
            expense=expense,
            request=self.request
        )
    
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
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής δαπάνης"""
        # Add back the expense amount to the building's current reserve
        building = instance.building
        building.current_reserve += instance.amount
        building.save()
        
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='DELETE',
            expense=instance,
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
    def pending(self, request):
        """Λήψη ανέκδοτων δαπανών"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(is_issued=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def issued(self, request):
        """Λήψη εκδοθεισών δαπανών"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(is_issued=True)
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
        payment = serializer.save()
        
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
        Transaction.objects.create(
            building=building,
            apartment=apartment,
            apartment_number=apartment.number,
            type='common_expense_payment',
            description=f"Είσπραξη κοινοχρήστων από {apartment.number} - {payment.get_method_display()}",
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
    permission_classes = [FinancialReadPermission]
    
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
    
    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Λήψη υπολοίπων διαμερισμάτων"""
        building_id = request.query_params.get('building_id')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = FinancialDashboardService(int(building_id))
            balances = service.get_apartment_balances()
            serializer = ApartmentBalanceSerializer(balances, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
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
            if not building_id:
                raise ValueError('building_id is required')
            calculator = CommonExpenseCalculator(int(building_id))
            result = {
                'shares': calculator.calculate_shares(),
                'total_expenses': float(calculator.get_total_expenses()),
                'apartments_count': calculator.get_apartments_count(),
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
            else:
                # JSON data
                building_id = data.get('building_id') or data.get('building')
                period_start_date = data.get('period_start_date')
                period_end_date = data.get('period_end_date')
            
            print(f"🔍 calculate_advanced: building_id: {building_id}")
            print(f"🔍 calculate_advanced: period_start_date: {period_start_date}")
            print(f"🔍 calculate_advanced: period_end_date: {period_end_date}")
            
            if not building_id:
                raise ValueError('building_id is required')
            
            # Convert building_id to int if it's a string
            try:
                building_id = int(building_id)
            except (ValueError, TypeError):
                raise ValueError(f'Invalid building_id: {building_id}')
            
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building_id,
                period_start_date=period_start_date,
                period_end_date=period_end_date
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
                total_due = previous_balance + total_amount
                
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
                    amount=total_amount,
                    balance_before=previous_balance,
                    balance_after=total_due,
                    reference_id=str(period.id),
                    reference_type='common_expense_period'
                )
                
                # Ενημέρωση υπολοίπου διαμερίσματος
                apartment.current_balance = total_due
                apartment.save()
            
            # Μαρκάρισμα δαπανών ως εκδοθείσες
            expense_ids = data.get('expense_ids', [])
            if expense_ids:
                Expense.objects.filter(
                    id__in=expense_ids,
                    building_id=building_id,
                    is_issued=False
                ).update(is_issued=True)
            
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
        transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'id')
        
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
