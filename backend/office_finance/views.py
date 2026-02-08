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
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
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


def _office_finance_dashboard_cache_ttl() -> int:
    return int(getattr(settings, 'OFFICE_FINANCE_DASHBOARD_CACHE_TTL', 30) or 30)


def _office_finance_yearly_cache_ttl() -> int:
    return int(getattr(settings, 'OFFICE_FINANCE_YEARLY_CACHE_TTL', 300) or 300)


def _office_finance_dashboard_cache_key(schema_name: str, user_id: int) -> str:
    return f"office-finance:dashboard:v1:{schema_name}:{user_id}"


def _office_finance_yearly_cache_key(schema_name: str, user_id: int, year: int) -> str:
    return f"office-finance:yearly-summary:v1:{schema_name}:{user_id}:{year}"


def _cache_get_safe(key: str):
    try:
        return cache.get(key)
    except Exception as exc:
        logger.warning("Office finance cache get failed for key %s: %s", key, exc)
        return None


def _cache_set_safe(key: str, value, timeout: int) -> None:
    try:
        cache.set(key, value, timeout)
    except Exception as exc:
        logger.warning("Office finance cache set failed for key %s: %s", key, exc)


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
    
    @action(detail=False, methods=['get'])
    def unpaid(self, request):
        """Απλήρωτα έξοδα."""
        data = office_finance_service.get_unpaid_expenses()
        return Response(data)
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Σημείωση εξόδου ως πληρωμένο."""
        from django.utils import timezone
        
        instance = self.get_object()
        instance.is_paid = True
        instance.paid_date = request.data.get('paid_date', timezone.now().date())
        instance.payment_method = request.data.get('payment_method', 'bank_transfer')
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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
            force_refresh = str(request.query_params.get('force_refresh', '')).lower() in {'1', 'true', 'yes'}
            schema_name = connection.schema_name
            cache_ttl = _office_finance_dashboard_cache_ttl()
            cache_key = _office_finance_dashboard_cache_key(schema_name, request.user.id)

            if cache_ttl > 0 and not force_refresh:
                cached_data = _cache_get_safe(cache_key)
                if cached_data is not None:
                    return Response(cached_data, status=status.HTTP_200_OK)

            data = office_finance_service.get_dashboard_data()
            if cache_ttl > 0:
                _cache_set_safe(cache_key, data, cache_ttl)
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
            target_year = int(year) if year else timezone.now().year
            force_refresh = str(request.query_params.get('force_refresh', '')).lower() in {'1', 'true', 'yes'}

            schema_name = connection.schema_name
            cache_ttl = _office_finance_yearly_cache_ttl()
            cache_key = _office_finance_yearly_cache_key(schema_name, request.user.id, target_year)

            if cache_ttl > 0 and not force_refresh:
                cached_data = _cache_get_safe(cache_key)
                if cached_data is not None:
                    return Response(cached_data, status=status.HTTP_200_OK)

            data = office_finance_service.get_yearly_summary(year=target_year)
            if cache_ttl > 0:
                _cache_set_safe(cache_key, data, cache_ttl)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error in OfficeFinanceYearlySummaryView: {e}")
            return Response(
                {'error': 'Σφάλμα κατά την ανάκτηση δεδομένων'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OfficeFinanceWarmCacheView(APIView):
    """
    POST /api/office-finance/warm-cache/

    Queue async warm-up για dashboard και yearly-summary caches.
    """
    permission_classes = [IsAuthenticated, IsOfficeStaff]

    def post(self, request):
        from .tasks import warm_office_finance_cache

        target_year = request.data.get('year')
        year_value = None
        if target_year not in (None, ''):
            try:
                year_value = int(target_year)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Invalid year'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        async_result = warm_office_finance_cache.delay(
            schema_name=connection.schema_name,
            year=year_value,
        )

        return Response(
            {
                'queued': True,
                'task_id': async_result.id,
                'schema_name': connection.schema_name,
                'year': year_value or timezone.now().year,
            },
            status=status.HTTP_202_ACCEPTED,
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
