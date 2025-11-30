"""
Office Finance API Views

Αυτές οι views είναι διαθέσιμες ΜΟΝΟ για το προσωπικό του γραφείου διαχείρισης:
- manager: Διαχειριστής γραφείου
- staff: Υπάλληλος γραφείου  
- superuser: Διαχειριστής συστήματος

ΔΕΝ είναι διαθέσιμες σε:
- resident: Ένοικος
- internal_manager: Εσωτερικός διαχειριστής πολυκατοικίας
"""

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
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


class IsOfficeStaff(BasePermission):
    """
    Permission class για πρόσβαση στα Οικονομικά Γραφείου.
    
    Επιτρέπει πρόσβαση σε:
    - superuser (πάντα)
    - manager (διαχειριστής γραφείου - πάντα)
    - staff (υπάλληλος) ΜΟΝΟ αν έχει can_access_office_finance = True
    
    ΔΕΝ επιτρέπει πρόσβαση σε:
    - resident (ένοικος)
    - internal_manager (εσωτερικός διαχειριστής)
    - staff χωρίς το αντίστοιχο permission
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user = request.user
        
        # Superusers always have access
        if user.is_superuser:
            return True
        
        # Get user role
        role = getattr(user, 'role', None)
        
        # Managers always have access
        if role == 'manager':
            return True
        
        # Staff need to check permissions
        if role == 'staff':
            # Check if user has staff_permissions with can_access_office_finance
            if hasattr(user, 'staff_permissions'):
                permissions = user.staff_permissions
                if permissions.is_active and permissions.can_access_office_finance:
                    return True
            return False
        
        # All other roles (resident, internal_manager, etc.) - no access
        return False


class OfficeExpenseCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet για κατηγορίες εξόδων γραφείου.
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    queryset = OfficeExpenseCategory.objects.filter(is_active=True)
    serializer_class = OfficeExpenseCategorySerializer
    permission_classes = [IsAuthenticated, IsOfficeStaff]
    
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
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    queryset = OfficeIncomeCategory.objects.filter(is_active=True)
    serializer_class = OfficeIncomeCategorySerializer
    permission_classes = [IsAuthenticated, IsOfficeStaff]
    
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
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    queryset = OfficeExpense.objects.select_related('category', 'created_by')
    serializer_class = OfficeExpenseSerializer
    permission_classes = [IsAuthenticated, IsOfficeStaff]
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
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    queryset = OfficeIncome.objects.select_related('category', 'building', 'created_by')
    serializer_class = OfficeIncomeSerializer
    permission_classes = [IsAuthenticated, IsOfficeStaff]
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
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    permission_classes = [IsAuthenticated, IsOfficeStaff]
    
    def get(self, request):
        try:
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
    Διαθέσιμο μόνο σε: manager, staff, superuser
    """
    permission_classes = [IsAuthenticated, IsOfficeStaff]
    
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
    Διαθέσιμο μόνο σε: manager, superuser (όχι staff)
    """
    permission_classes = [IsAuthenticated, IsOfficeStaff]
    
    def post(self, request):
        try:
            # Επιπλέον έλεγχος - μόνο manager/superuser μπορούν να αρχικοποιήσουν
            user = request.user
            if not user.is_superuser and getattr(user, 'role', None) != 'manager':
                return Response(
                    {'error': 'Μόνο διαχειριστές μπορούν να αρχικοποιήσουν κατηγορίες'},
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

