"""
Office Finance API Views
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import logging

from .models import (
    OfficeExpenseCategory,
    OfficeIncomeCategory,
    OfficeExpense,
    OfficeIncome,
    OfficeFinancialSummary
)
from .serializers import (
    OfficeExpenseCategorySerializer,
    OfficeIncomeCategorySerializer,
    OfficeExpenseSerializer,
    OfficeIncomeSerializer,
    OfficeFinancialSummarySerializer
)
from .services import office_finance_service

logger = logging.getLogger(__name__)


class OfficeExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet για κατηγορίες εξόδων γραφείου.
    """
    queryset = OfficeExpenseCategory.objects.filter(is_active=True)
    serializer_class = OfficeExpenseCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'Δεν μπορείτε να διαγράψετε κατηγορία συστήματος'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Soft delete
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OfficeIncomeCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet για κατηγορίες εσόδων γραφείου.
    """
    queryset = OfficeIncomeCategory.objects.filter(is_active=True)
    serializer_class = OfficeIncomeCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'Δεν μπορείτε να διαγράψετε κατηγορία συστήματος'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OfficeExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet για έξοδα γραφείου.
    """
    queryset = OfficeExpense.objects.select_related('category', 'created_by')
    serializer_class = OfficeExpenseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_paid', 'recurrence', 'payment_method']
    search_fields = ['title', 'description', 'supplier_name']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Φιλτράρισμα ανά ημερομηνία
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if year:
            queryset = queryset.filter(date__year=year)
        if month:
            queryset = queryset.filter(date__month=month)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Έξοδα ομαδοποιημένα ανά κατηγορία."""
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        data = office_finance_service.get_expenses_by_category(
            year=int(year) if year else None,
            month=int(month) if month else None
        )
        return Response(data)


class OfficeIncomeViewSet(viewsets.ModelViewSet):
    """
    ViewSet για έσοδα γραφείου.
    """
    queryset = OfficeIncome.objects.select_related('category', 'building', 'created_by')
    serializer_class = OfficeIncomeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'building', 'status', 'recurrence']
    search_fields = ['title', 'description', 'client_name']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Φιλτράρισμα ανά ημερομηνία
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if year:
            queryset = queryset.filter(date__year=year)
        if month:
            queryset = queryset.filter(date__month=month)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def by_building(self, request):
        """Έσοδα ομαδοποιημένα ανά κτίριο."""
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        data = office_finance_service.get_income_by_building(
            year=int(year) if year else None,
            month=int(month) if month else None
        )
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Εκκρεμή έσοδα."""
        data = office_finance_service.get_pending_incomes()
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        """Σημείωση εσόδου ως εισπραχθέν."""
        from django.utils import timezone
        
        instance = self.get_object()
        instance.status = 'received'
        instance.received_date = request.data.get('received_date', timezone.now().date())
        instance.payment_method = request.data.get('payment_method', 'bank_transfer')
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class OfficeFinanceDashboardView(APIView):
    """
    GET /api/office-finance/dashboard/
    
    Επιστρέφει όλα τα δεδομένα για το dashboard οικονομικών γραφείου.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Έλεγχος ρόλου
            user = request.user
            allowed_roles = ['manager', 'staff', 'superuser']
            
            if not hasattr(user, 'role') or user.role not in allowed_roles:
                return Response(
                    {'error': 'Δεν έχετε δικαίωμα πρόσβασης'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            data = office_finance_service.get_dashboard_data()
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in OfficeFinanceDashboardView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OfficeFinanceYearlySummaryView(APIView):
    """
    GET /api/office-finance/yearly-summary/
    
    Επιστρέφει ετήσια σύνοψη.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            year = request.query_params.get('year')
            data = office_finance_service.get_yearly_summary(
                year=int(year) if year else None
            )
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in OfficeFinanceYearlySummaryView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InitializeDefaultCategoriesView(APIView):
    """
    POST /api/office-finance/init-categories/
    
    Δημιουργεί τις προκαθορισμένες κατηγορίες.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            if not hasattr(user, 'role') or user.role not in ['manager', 'superuser']:
                return Response(
                    {'error': 'Δεν έχετε δικαίωμα'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            office_finance_service.create_default_categories()
            return Response(
                {'message': 'Οι κατηγορίες δημιουργήθηκαν επιτυχώς'},
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Error initializing categories: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

