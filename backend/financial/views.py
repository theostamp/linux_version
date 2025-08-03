from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from django.db.models import Q
from datetime import datetime, timedelta
from decimal import Decimal
from django.core.exceptions import ValidationError

from .models import Expense, Transaction, Payment, ExpenseApartment, MeterReading
from .serializers import (
    ExpenseSerializer, TransactionSerializer, PaymentSerializer,
    ExpenseApartmentSerializer, MeterReadingSerializer,
    FinancialSummarySerializer, ApartmentBalanceSerializer,
    CommonExpenseCalculationSerializer
)
from .services import CommonExpenseCalculator, FinancialDashboardService, PaymentProcessor, FileUploadService
from buildings.models import Building
from apartments.models import Apartment
from .services import ReportService
from .permissions import (
    ExpensePermission, PaymentPermission, TransactionPermission,
    FinancialReadPermission, FinancialWritePermission, ReportPermission
)
from .audit import FinancialAuditLog


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση δαπανών"""
    
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [ExpensePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'category', 'is_issued', 'date', 'distribution_type']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας δαπάνης με file upload"""
        expense = serializer.save()
        
        # Χειρισμός file upload αν υπάρχει
        if 'attachment' in self.request.FILES:
            try:
                file = self.request.FILES['attachment']
                file_path = FileUploadService.save_file(file, expense.id)
                expense.attachment = file_path
                expense.save()
            except Exception as e:
                # Αν αποτύχει το file upload, διαγράφουμε την expense
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
        expense = serializer.save()
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='UPDATE',
            expense=expense,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής δαπάνης"""
        FinancialAuditLog.log_expense_action(
            user=self.request.user,
            action='DELETE',
            expense=instance,
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
        """Φιλτράρισμα ανά building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(building_id=building_id)
        return self.queryset
    
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
    """ViewSet για τη διαχείριση πληρωμών"""
    
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [PaymentPermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['apartment', 'method', 'date']
    
    def perform_create(self, serializer):
        """Καταγραφή δημιουργίας πληρωμής"""
        payment = serializer.save()
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='CREATE',
            payment=payment,
            request=self.request
        )
    
    def perform_update(self, serializer):
        """Καταγραφή ενημέρωσης πληρωμής"""
        payment = serializer.save()
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='UPDATE',
            payment=payment,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        """Καταγραφή διαγραφής πληρωμής"""
        FinancialAuditLog.log_payment_action(
            user=self.request.user,
            action='DELETE',
            payment=instance,
            request=self.request
        )
        instance.delete()
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(apartment__building_id=building_id)
        return self.queryset
    
    @action(detail=False, methods=['post'])
    def process_payment(self, request):
        """Επεξεργασία πληρωμής"""
        try:
            payment_data = request.data
            transaction = PaymentProcessor.process_payment(payment_data)
            
            return Response({
                'message': 'Payment processed successfully',
                'transaction_id': transaction.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def methods(self, request):
        """Λήψη διαθέσιμων τρόπων πληρωμής"""
        methods = [{'value': choice[0], 'label': choice[1]} for choice in Payment.PAYMENT_METHODS]
        return Response(methods)


class FinancialDashboardViewSet(viewsets.ViewSet):
    """ViewSet για το οικονομικό dashboard"""
    permission_classes = [FinancialReadPermission]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Λήψη σύνοψης οικονομικών στοιχείων"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = FinancialDashboardService(building_id)
            summary_data = service.get_summary()
            
            serializer = FinancialSummarySerializer(summary_data)
            return Response(serializer.data)
            
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Λήψη κατάστασης οφειλών διαμερισμάτων"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = FinancialDashboardService(building_id)
            balances = service.get_apartment_balances()
            
            return Response(balances)
            
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
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
        """Υπολογισμός μεριδίων κοινοχρήστων"""
        building_id = request.data.get('building_id')
        period = request.data.get('period', '')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            calculator = CommonExpenseCalculator(building_id)
            shares = calculator.calculate_shares()
            
            # Μετατροπή σε λίστα για το serializer
            shares_list = list(shares.values())
            
            return Response({
                'period': period,
                'shares': shares_list,
                'total_expenses': calculator.get_total_expenses(),
                'apartments_count': calculator.get_apartments_count(),
                'pending_expenses': ExpenseSerializer(calculator.expenses, many=True).data
            })
            
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def issue(self, request):
        """Έκδοση κοινοχρήστων"""
        building_id = request.data.get('building_id')
        period = request.data.get('period', '')
        shares = request.data.get('shares', {})
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Ενημέρωση οφειλών διαμερισμάτων
            for share_data in shares:
                apartment_id = share_data.get('apartment_id')
                total_due = share_data.get('total_due', 0)
                
                if apartment_id and total_due is not None:
                    apartment = Apartment.objects.get(id=apartment_id)
                    apartment.current_balance = total_due
                    apartment.save()
            
            # Σήμανση δαπανών ως εκδοθείσες
            expenses = Expense.objects.filter(
                building_id=building_id, 
                is_issued=False
            )
            expenses.update(is_issued=True)
            
            # Δημιουργία εγγραφών κινήσεων
            building = Building.objects.get(id=building_id)
            for share_data in shares:
                apartment_id = share_data.get('apartment_id')
                total_amount = share_data.get('total_amount', 0)
                apartment_number = share_data.get('apartment_number', '')
                
                if apartment_id and total_amount > 0:
                    Transaction.objects.create(
                        building=building,
                        date=datetime.now(),
                        type='common_expense_charge',
                        description=f"Κοινοχρήστων {period} - {apartment_number}",
                        apartment_number=apartment_number,
                        amount=-total_amount,
                        balance_after=share_data.get('total_due', 0)
                    )
            
            return Response({
                'message': 'Common expenses issued successfully',
                'period': period,
                'expenses_count': expenses.count()
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MeterReadingViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση μετρήσεων"""
    
    queryset = MeterReading.objects.all()
    serializer_class = MeterReadingSerializer
    permission_classes = [FinancialWritePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['apartment', 'meter_type', 'reading_date']
    
    def get_queryset(self):
        """Φιλτράρισμα ανά building"""
        building_id = self.request.query_params.get('building_id')
        if building_id:
            return self.queryset.filter(apartment__building_id=building_id)
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Λήψη διαθέσιμων τύπων μετρητών"""
        types = [{'value': choice[0], 'label': choice[1]} for choice in MeterReading.METER_TYPES]
        return Response(types)
    
    @action(detail=False, methods=['get'])
    def building_consumption(self, request):
        """Υπολογισμός συνολικής κατανάλωσης κτιρίου"""
        building_id = request.query_params.get('building_id')
        meter_type = request.query_params.get('meter_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not meter_type:
            return Response(
                {'error': 'Meter type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Μετατροπή ημερομηνιών
        try:
            if date_from:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            if date_to:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Υπολογισμός κατανάλωσης
        consumption_data = MeterReading.calculate_building_consumption(
            building_id, meter_type, date_from, date_to
        )
        
        return Response(consumption_data)
    
    @action(detail=False, methods=['get'])
    def apartment_history(self, request):
        """Ιστορικό μετρήσεων για συγκεκριμένο διαμέρισμα"""
        apartment_id = request.query_params.get('apartment_id')
        meter_type = request.query_params.get('meter_type')
        
        if not apartment_id:
            return Response(
                {'error': 'Apartment ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.queryset.filter(apartment_id=apartment_id)
        
        if meter_type:
            queryset = queryset.filter(meter_type=meter_type)
        
        readings = queryset.order_by('reading_date')
        serializer = self.get_serializer(readings, many=True)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Μαζική εισαγωγή μετρήσεων"""
        building_id = request.data.get('building_id')
        readings_data = request.data.get('readings', [])
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not readings_data:
            return Response(
                {'error': 'Readings data is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_readings = []
        errors = []
        
        for reading_data in readings_data:
            try:
                # Προσθήκη building_id στο reading_data
                reading_data['apartment'] = reading_data.get('apartment_id')
                
                serializer = self.get_serializer(data=reading_data)
                if serializer.is_valid():
                    reading = serializer.save()
                    created_readings.append(reading)
                else:
                    errors.append({
                        'data': reading_data,
                        'errors': serializer.errors
                    })
            except Exception as e:
                errors.append({
                    'data': reading_data,
                    'errors': str(e)
                })
        
        return Response({
            'created_count': len(created_readings),
            'errors': errors,
            'created_readings': MeterReadingSerializer(created_readings, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Στατιστικά μετρήσεων για το κτίριο"""
        building_id = request.query_params.get('building_id')
        meter_type = request.query_params.get('meter_type')
        
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.queryset.filter(apartment__building_id=building_id)
        
        if meter_type:
            queryset = queryset.filter(meter_type=meter_type)
        
        # Βασικά στατιστικά
        total_readings = queryset.count()
        apartments_with_readings = queryset.values('apartment').distinct().count()
        
        # Πρόσφατες μετρήσεις
        recent_readings = queryset.order_by('-reading_date')[:10]
        
        # Υπολογισμός συνολικής κατανάλωσης (αν υπάρχουν τουλάχιστον 2 μετρήσεις ανά διαμέρισμα)
        total_consumption = Decimal('0.00')
        consumption_by_apartment = {}
        
        for apartment in queryset.values('apartment').distinct():
            apartment_id = apartment['apartment']
            apartment_readings = queryset.filter(apartment_id=apartment_id).order_by('reading_date')
            
            if len(apartment_readings) >= 2:
                first_reading = apartment_readings.first()
                last_reading = apartment_readings.last()
                consumption = last_reading.value - first_reading.value
                
                total_consumption += consumption
                consumption_by_apartment[apartment_id] = {
                    'apartment_number': first_reading.apartment.number,
                    'consumption': consumption
                }
        
        return Response({
            'total_readings': total_readings,
            'apartments_with_readings': apartments_with_readings,
            'total_consumption': total_consumption,
            'consumption_by_apartment': consumption_by_apartment,
            'recent_readings': MeterReadingSerializer(recent_readings, many=True).data
        })


class ReportViewSet(viewsets.ViewSet):
    """ViewSet για τη διαχείριση αναφορών και exports"""
    permission_classes = [ReportPermission]
    
    @action(detail=False, methods=['get'])
    def transaction_history(self, request):
        """Αναφορά ιστορικού κινήσεων"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Παράμετροι φιλτραρίσματος
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        transaction_type = request.query_params.get('transaction_type')
        apartment_id = request.query_params.get('apartment_id')
        
        # Μετατροπή ημερομηνιών
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid end_date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Δημιουργία αναφοράς
        report_service = ReportService(building_id)
        transactions = report_service.generate_transaction_history_report(
            start_date=start_date,
            end_date=end_date,
            transaction_type=transaction_type,
            apartment_id=apartment_id
        )
        
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def apartment_balances(self, request):
        """Αναφορά κατάστασης οφειλών"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        apartment_id = request.query_params.get('apartment_id')
        
        report_service = ReportService(building_id)
        balance_data = report_service.generate_apartment_balance_report(apartment_id=apartment_id)
        
        return Response(balance_data)
    
    @action(detail=False, methods=['get'])
    def financial_summary(self, request):
        """Οικονομική σύνοψη"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        period = request.query_params.get('period', 'month')
        
        report_service = ReportService(building_id)
        summary_data = report_service.generate_financial_summary_report(period=period)
        
        return Response(summary_data)
    
    @action(detail=False, methods=['get'])
    def cash_flow(self, request):
        """Δεδομένα ταμειακής ροής"""
        building_id = request.query_params.get('building_id')
        if not building_id:
            return Response(
                {'error': 'Building ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        days = int(request.query_params.get('days', 30))
        
        report_service = ReportService(building_id)
        cash_flow_data = report_service.generate_cash_flow_data(days=days)
        
        return Response(cash_flow_data)
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Εξαγωγή σε Excel"""
        building_id = request.query_params.get('building_id')
        report_type = request.query_params.get('report_type')
        
        if not building_id or not report_type:
            return Response(
                {'error': 'Building ID and report_type are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Παράμετροι φιλτραρίσματος
        kwargs = {}
        for param in ['start_date', 'end_date', 'transaction_type', 'apartment_id', 'period']:
            value = request.query_params.get(param)
            if value:
                kwargs[param] = value
        
        try:
            report_service = ReportService(building_id)
            output, filename = report_service.export_to_excel(report_type, **kwargs)
            
            from django.http import HttpResponse
            response = HttpResponse(
                output.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Export failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Εξαγωγή σε PDF"""
        building_id = request.query_params.get('building_id')
        report_type = request.query_params.get('report_type')
        
        if not building_id or not report_type:
            return Response(
                {'error': 'Building ID and report_type are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Παράμετροι φιλτραρίσματος
        kwargs = {}
        for param in ['start_date', 'end_date', 'transaction_type', 'apartment_id', 'period']:
            value = request.query_params.get(param)
            if value:
                kwargs[param] = value
        
        try:
            report_service = ReportService(building_id)
            output, filename = report_service.generate_pdf_report(report_type, **kwargs)
            
            from django.http import HttpResponse
            response = HttpResponse(
                output.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'PDF generation failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
