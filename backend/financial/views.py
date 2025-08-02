from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta

from .models import Payment, FinancialReceipt, BuildingAccount, FinancialTransaction
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer,
    FinancialReceiptSerializer, BuildingAccountSerializer,
    FinancialTransactionSerializer, FinancialTransactionCreateSerializer
)
from buildings.models import Building


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση πληρωμών κοινοχρήστων
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_type', 'apartment__building']
    search_fields = ['apartment__number', 'apartment__identifier', 'reference_number', 'notes']
    ordering_fields = ['due_date', 'amount', 'created_at', 'payment_date']
    ordering = ['-due_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Φιλτράρισμα ανά κτίριο αν έχει επιλεγεί
        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(apartment__building_id=building_id)
        
        # Φιλτράρισμα ανά διαμέρισμα
        apartment_id = self.request.query_params.get('apartment_id')
        if apartment_id:
            queryset = queryset.filter(apartment_id=apartment_id)
        
        # Φιλτράρισμα ληξιπρόθεσμων
        overdue_only = self.request.query_params.get('overdue_only')
        if overdue_only == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now().date(),
                status__in=['pending', 'partial']
            )
        
        # Φιλτράρισμα ανά χρονικό διάστημα
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(due_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(due_date__lte=end_date)
        
        return queryset.select_related('apartment', 'apartment__building', 'created_by')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PaymentCreateSerializer
        return PaymentSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Στατιστικά πληρωμών"""
        building_id = request.query_params.get('building_id')
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(apartment__building_id=building_id)
        
        today = timezone.now().date()
        
        stats = {
            'total_payments': queryset.count(),
            'total_amount': float(queryset.aggregate(Sum('amount'))['amount__sum'] or 0),
            'total_paid': float(queryset.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0),
            'pending_payments': queryset.filter(status='pending').count(),
            'overdue_payments': queryset.filter(
                due_date__lt=today,
                status__in=['pending', 'partial']
            ).count(),
            'paid_payments': queryset.filter(status='paid').count(),
            'partial_payments': queryset.filter(status='partial').count(),
        }
        
        return Response(stats)

    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Σημείωση πληρωμής ως πληρωμένη"""
        payment = self.get_object()
        amount_paid = request.data.get('amount_paid', payment.amount)
        payment_method = request.data.get('payment_method', '')
        reference_number = request.data.get('reference_number', '')
        
        if amount_paid >= payment.amount:
            payment.status = 'paid'
        else:
            payment.status = 'partial'
        
        payment.amount_paid = amount_paid
        payment.payment_date = timezone.now().date()
        payment.payment_method = payment_method
        payment.reference_number = reference_number
        payment.save()
        
        serializer = self.get_serializer(payment)
        return Response(serializer.data)


class FinancialReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση αποδείξεων εισπράξεων
    """
    queryset = FinancialReceipt.objects.all()
    serializer_class = FinancialReceiptSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['receipt_type', 'payment__apartment__building']
    search_fields = ['reference_number', 'notes', 'payment__apartment__number']
    ordering_fields = ['receipt_date', 'amount', 'created_at']
    ordering = ['-receipt_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(payment__apartment__building_id=building_id)
        
        return queryset.select_related('payment', 'payment__apartment', 'payment__apartment__building', 'created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class BuildingAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση λογαριασμών κτιρίου
    """
    queryset = BuildingAccount.objects.all()
    serializer_class = BuildingAccountSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['account_type', 'building', 'is_active']
    search_fields = ['account_number', 'bank_name', 'description']
    ordering_fields = ['current_balance', 'created_at']
    ordering = ['-current_balance']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        return queryset.select_related('building')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Σύνοψη λογαριασμών"""
        building_id = request.query_params.get('building_id')
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        summary = {
            'total_accounts': queryset.count(),
            'total_balance': float(queryset.aggregate(Sum('current_balance'))['current_balance__sum'] or 0),
            'active_accounts': queryset.filter(is_active=True).count(),
            'account_types': {}
        }
        
        # Στατιστικά ανά τύπο λογαριασμού
        for account_type, _ in BuildingAccount.ACCOUNT_TYPES:
            accounts = queryset.filter(account_type=account_type)
            summary['account_types'][account_type] = {
                'count': accounts.count(),
                'total_balance': float(accounts.aggregate(Sum('current_balance'))['current_balance__sum'] or 0)
            }
        
        return Response(summary)


class FinancialTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet για διαχείριση οικονομικών συναλλαγών
    """
    queryset = FinancialTransaction.objects.all()
    serializer_class = FinancialTransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transaction_type', 'building', 'account', 'category']
    search_fields = ['description', 'reference_number', 'notes']
    ordering_fields = ['transaction_date', 'amount', 'created_at']
    ordering = ['-transaction_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        building_id = self.request.query_params.get('building_id')
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        # Φιλτράρισμα ανά χρονικό διάστημα
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(transaction_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(transaction_date__lte=end_date)
        
        return queryset.select_related('building', 'account', 'created_by')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FinancialTransactionCreateSerializer
        return FinancialTransactionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Στατιστικά συναλλαγών"""
        building_id = request.query_params.get('building_id')
        queryset = self.get_queryset()
        
        if building_id:
            queryset = queryset.filter(building_id=building_id)
        
        # Χρονικό διάστημα (τελευταίος μήνας)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        monthly_transactions = queryset.filter(
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        stats = {
            'total_transactions': queryset.count(),
            'total_income': float(queryset.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0),
            'total_expenses': float(queryset.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0),
            'monthly_income': float(monthly_transactions.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0),
            'monthly_expenses': float(monthly_transactions.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0),
            'net_balance': float(queryset.filter(transaction_type='income').aggregate(Sum('amount'))['amount__sum'] or 0) - 
                          float(queryset.filter(transaction_type='expense').aggregate(Sum('amount'))['amount__sum'] or 0),
        }
        
        return Response(stats)
