from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters import rest_framework as filters
from django_filters import DateFilter
from datetime import datetime, date, time, timedelta
import io
import json
from decimal import Decimal
import mimetypes
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.utils import timezone
from django.http import FileResponse
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView


def get_query_params(request):
    """
    Helper function to get query parameters from both DRF and Django requests
    """
    return getattr(request, 'query_params', request.GET)

from .models import Expense, Transaction, Payment, MeterReading, Supplier, CommonExpensePeriod, ApartmentShare, FinancialReceipt, MonthlyBalance
from .serializers import (
    ExpenseSerializer, TransactionSerializer, PaymentSerializer,
    MeterReadingSerializer, SupplierSerializer,
    FinancialSummarySerializer, FinancialReceiptSerializer, MonthlyBalanceSerializer
)
from .services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator, FinancialDashboardService, PaymentProcessor, FileUploadService, InvoiceParser
from buildings.models import Building
from buildings.mixins import BuildingContextMixin, OptionalBuildingContextMixin  # NEW: Import mixin
from apartments.models import Apartment
from .services import ReportService
from .building_suggestion import suggest_building_from_invoice
from .permissions import (
    ExpensePermission, PaymentPermission, TransactionPermission,
    FinancialReadPermission, FinancialWritePermission, ReportPermission
)
from core.permissions import IsManager, IsRelatedToBuilding
from .audit import FinancialAuditLog
from .services import CommonExpenseAutomationService
from django.db import models
try:
    from system_health_validator import run_system_health_check
except ImportError:
    run_system_health_check = None
try:
    from auto_fix_system_issues import run_auto_fix
except ImportError:
    run_auto_fix = None


class ExpenseFilter(filters.FilterSet):
    """Custom filter for Expense model with date range support"""
    date__gte = DateFilter(field_name='date', lookup_expr='gte')
    date__lte = DateFilter(field_name='date', lookup_expr='lte')
    category__not_in = filters.CharFilter(method='filter_category_not_in')

    def filter_category_not_in(self, queryset, name, value):
        """Filter expenses that are NOT in the specified categories"""
        if value:
            categories = [cat.strip() for cat in value.split(',') if cat.strip()]
            return queryset.exclude(category__in=categories)
        return queryset

    class Meta:
        model = Expense
        fields = ['building', 'category', 'date', 'distribution_type', 'supplier', 'date__gte', 'date__lte', 'category__not_in']


class SupplierViewSet(OptionalBuildingContextMixin, viewsets.ModelViewSet):
    """
    ViewSet για τη διαχείριση προμηθευτών.

    REFACTORED: Χρησιμοποιεί OptionalBuildingContextMixin για automatic building filtering.
    Building είναι optional γιατί superusers μπορούν να δουν όλους τους προμηθευτές.
    """

    queryset = Supplier.objects.select_related('building').all()
    serializer_class = SupplierSerializer
    permission_classes = [FinancialWritePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['building', 'category', 'is_active']

    # BuildingContextMixin configuration
    building_required = False  # Optional για superusers
    building_field_name = 'building'
    auto_filter_by_building = True

    def perform_create(self, serializer):
        """
        Καταγραφή δημιουργίας προμηθευτή.
        Building auto-set από BuildingContextMixin.perform_create().
        """
        # Note: Building is auto-set by mixin
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

    # get_queryset() inherited from BuildingContextMixin - auto-filters by building

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Λήψη διαθέσιμων κατηγοριών προμηθευτών"""
        categories = [{'value': choice[0], 'label': choice[1]} for choice in Supplier.SUPPLIER_CATEGORIES]
        return Response(categories)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """
        Λήψη προμηθευτών ανά κατηγορία.

        REFACTORED: Χρησιμοποιεί get_building_context() αντί για ad-hoc building_id.
        """
        building = self.get_building_context()  # NEW: Use mixin
        category = request.query_params.get('category')

        # Building validation handled by mixin
        queryset = self.get_queryset().filter(is_active=True)
        if category:
            queryset = queryset.filter(category=category)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ExpenseViewSet(BuildingContextMixin, viewsets.ModelViewSet):
    """
    ViewSet για τη διαχείριση δαπανών με RBAC permissions.

    REFACTORED: Χρησιμοποιεί BuildingContextMixin για automatic building context management.
    - Auto-filtering by building
    - Auto-set building on create
    - Building context available via get_building_context()
    """

    queryset = Expense.objects.select_related('building', 'supplier').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, ExpensePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = ExpenseFilter

    # BuildingContextMixin configuration
    building_required = True  # Expenses ALWAYS need a building
    building_field_name = 'building'
    auto_filter_by_building = True

    def get_permissions(self):
        """
        Εφαρμογή διαφορετικών permissions ανά action:
        - Create/Update/Delete: Μόνο Managers
        - Read: Managers και Residents (με building-level filtering)
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsRelatedToBuilding()]

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

        # Προσθήκη στο ημερολόγιο αν ζητηθεί
        if expense.add_to_calendar:
            self._add_expense_to_calendar(expense)

    def _add_expense_to_calendar(self, expense):
        """Προσθήκη δαπάνης στο ημερολόγιο ως TodoItem"""
        try:
            from todo_management.models import TodoCategory, TodoItem
            from django.contrib.auth import get_user_model
            from django.utils import timezone
            from datetime import datetime

            User = get_user_model()
            actor = self.request.user if self.request.user.is_authenticated else User.objects.filter(is_superuser=True).first()

            # Δημιουργία ή λήψη κατηγορίας για δαπάνες
            category, _ = TodoCategory.objects.get_or_create(
                building_id=expense.building.id,
                name="Λειτουργικές Δαπάνες",
                defaults={
                    "icon": "trending-up",
                    "color": "blue",
                    "description": "Αυτόματα TODOs από λειτουργικές δαπάνες",
                },
            )

            # Προσδιορισμός ημερομηνίας λήξης
            if expense.due_date:
                due_dt = timezone.make_aware(datetime.combine(expense.due_date, datetime.min.time()))
            else:
                # Αν δεν υπάρχει due_date, χρησιμοποιούμε την ημερομηνία της δαπάνης
                due_dt = timezone.make_aware(datetime.combine(expense.date, datetime.min.time()))

            # Δημιουργία TodoItem
            TodoItem.objects.create(
                title=f"Πληρωμή: {expense.title}",
                description=f"Δαπάνη €{expense.amount} - {expense.get_category_display()}",
                category=category,
                building=expense.building,
                apartment=None,
                priority="medium",
                status="pending",
                due_date=due_dt,
                created_by=actor,
                tags=["expense", f"expense:{expense.id}", expense.category]
            )
        except Exception as e:
            # Log το σφάλμα αλλά μην σταματήσεις τη δημιουργία της δαπάνης
            print(f"⚠️ Σφάλμα προσθήκης δαπάνης στο ημερολόγιο: {e}")

        # Αυτόματη χρέωση διαμερισμάτων αν η δαπάνη είναι εκδοθείσα
        # Σημείωση: Όλες οι δαπάνες θεωρούνται πλέον εκδοθείσες
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
                        # Get current balance before creating transaction
                        current_balance = apartment.current_balance or Decimal('0.00')
                        new_balance = current_balance - expense_share

                        # Δημιουργία transaction
                        Transaction.objects.create(
                            building=expense.building,
                            date=datetime.now(),
                            type='expense_issued',
                            description=f"Αυτόματη χρέωση: {expense.title} - {apartment.number}",
                            apartment_number=apartment.number,
                            apartment=apartment,
                            amount=-expense_share,
                            balance_before=current_balance,
                            balance_after=new_balance,
                            reference_id=str(expense.id),
                            reference_type='expense',
                            created_by=self.request.user.username if self.request.user else 'System'
                        )

                        # Ενημέρωση υπόλοιπου διαμερίσματος using BalanceCalculationService
                        from .balance_service import BalanceCalculationService
                        BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)
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

    def perform_destroy(self, instance):
        """Handle expense deletion with maintenance synchronization"""
        # Check if this expense is linked to scheduled maintenance
        try:
            linked_maintenances = instance.scheduled_maintenance_tasks.all()
            for maintenance in linked_maintenances:
                # Clear the link but don't delete the maintenance
                maintenance.linked_expense = None
                maintenance.save(update_fields=['linked_expense'])
        except Exception as e:
            # Log error but don't fail the deletion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update linked maintenance for expense {instance.id}: {e}")

        # Log the deletion
        try:
            FinancialAuditLog.log_expense_action(
                user=self.request.user,
                action='DELETE',
                expense=instance,
                request=self.request
            )
        except Exception as e:
            # Log error but don't fail the deletion if audit logging fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to log expense deletion for expense {instance.id}: {e}")

        # Proceed with normal deletion
        super().perform_destroy(instance)

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
        # Use values() to avoid apartment_id foreign key issues
        related_transactions_data = Transaction.objects.filter(
            building_id=building.id,
            reference_type='expense',
            reference_id=str(expense_id)
        ).values('id', 'apartment_number', 'amount')

        print(f"🗑️ Διαγραφή δαπάνης {expense_id}: Βρέθηκαν {len(related_transactions_data)} σχετικές συναλλαγές")

        # Ενημέρωση υπολοίπων διαμερισμάτων πριν τη διαγραφή των συναλλαγών
        for transaction_data in related_transactions_data:
            # Use apartment_number instead of apartment foreign key to avoid schema issues
            if transaction_data['apartment_number']:
                from apartments.models import Apartment
                try:
                    apartment = Apartment.objects.get(
                        building=building,
                        number=transaction_data['apartment_number']
                    )
                    old_balance = apartment.current_balance or Decimal('0.00')

                    # Αφαιρούμε την χρέωση (προσθέτουμε το ποσό γιατί οι χρεώσεις είναι αρνητικές)
                    # Note: After transactions are deleted, we'll recalculate using BalanceCalculationService
                    new_balance = old_balance - transaction_data['amount']

                    print(f"   🏠 Διαμέρισμα {apartment.number}: {old_balance}€ → {new_balance}€ (θα επανυπολογιστεί)")
                except Apartment.DoesNotExist:
                    print(f"   ⚠️ Διαμέρισμα {transaction_data['apartment_number']} δεν βρέθηκε")

        # Διαγραφή των σχετικών συναλλαγών
        deleted_count = len(related_transactions_data)
        affected_apartments = []
        if deleted_count > 0:
            # Track affected apartments for balance recalculation
            for transaction_data in related_transactions_data:
                if transaction_data['apartment_number']:
                    try:
                        apartment = Apartment.objects.get(
                            building=building,
                            number=transaction_data['apartment_number']
                        )
                        affected_apartments.append(apartment)
                    except Apartment.DoesNotExist:
                        pass

            Transaction.objects.filter(
                building_id=building.id,
                reference_type='expense',
                reference_id=str(expense_id)
            ).delete()
        print(f"   ✅ Διαγράφηκαν {deleted_count} συναλλαγές")

        # Recalculate balances for affected apartments using BalanceCalculationService
        if affected_apartments:
            from .balance_service import BalanceCalculationService
            for apartment in affected_apartments:
                BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)
            print(f"   ✅ Επανυπολογίστηκαν τα υπόλοιπα για {len(affected_apartments)} διαμερίσματα")

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
        query_params = get_query_params(self.request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

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
        """Λήψη ανέκδοτων δαπανών - DEPRECATED: Όλες οι δαπάνες θεωρούνται εκδοθείσες"""
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

        # Όλες οι δαπάνες θεωρούνται πλέον εκδοθείσες
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

    @action(detail=False, methods=['get'])
    def category_payer_defaults(self, request):
        """
        Λήψη προεπιλεγμένης ευθύνης πληρωμής για κάθε κατηγορία δαπάνης.
        Βασισμένο στην ελληνική νομοθεσία για διαχωρισμό ενοίκων/ιδιοκτητών.

        Returns:
            {
                'category_key': 'owner'|'resident'|'shared',
                ...
            }
        """
        return Response(Expense.EXPENSE_CATEGORY_DEFAULTS)

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

    @action(detail=False, methods=['post'])
    def backfill_management_fees(self, request):
        """Δημιουργεί management fees για προηγούμενους μήνες"""
        from datetime import date
        from calendar import monthrange

        building_id = request.data.get('building_id')
        start_month = request.data.get('start_month')  # Format: 'YYYY-MM'
        end_month = request.data.get('end_month')  # Optional, default: current month

        if not building_id or not start_month:
            return Response(
                {'error': 'building_id and start_month are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not building.management_fee_per_apartment or building.management_fee_per_apartment <= 0:
            return Response(
                {'error': 'No management fee configured for this building'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse dates
        try:
            start_year, start_mon = map(int, start_month.split('-'))
            start_date = date(start_year, start_mon, 1)
        except (ValueError, AttributeError):
            return Response(
                {'error': 'Invalid start_month format. Use YYYY-MM'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if end_month:
            try:
                end_year, end_mon = map(int, end_month.split('-'))
                end_date = date(end_year, end_mon, 1)
            except (ValueError, AttributeError):
                return Response(
                    {'error': 'Invalid end_month format. Use YYYY-MM'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            today = date.today()
            end_date = date(today.year, today.month, 1)

        # ✅ ΔΙΟΡΘΩΣΗ: Αφαίρεση περιορισμού financial_system_start_date
        # Το σύστημα πλέον λειτουργεί χωρίς αυτόν τον περιορισμό

        # Calculate total amount
        apartments_count = Apartment.objects.filter(building=building).count()
        total_amount = building.management_fee_per_apartment * apartments_count

        created_count = 0
        skipped_count = 0
        current_date = start_date

        while current_date <= end_date:
            # Check if already exists
            existing = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=current_date.year,
                date__month=current_date.month
            ).exists()

            if existing:
                skipped_count += 1
            else:
                # ✅ ΔΙΟΡΘΩΣΗ: Χρήση ΠΡΩΤΗΣ μέρας του μήνα (όχι τελευταίας)
                # Αυτό εξασφαλίζει σωστή μεταφορά στις previous obligations
                expense_date = current_date  # Ήδη 1η του μήνα

                Expense.objects.create(
                    building=building,
                    title=f'Διαχειριστικά Έξοδα {current_date.strftime("%B %Y")}',
                    amount=total_amount,
                    date=expense_date,  # ✅ Πρώτη του μήνα
                    due_date=expense_date,  # ✅ Πρώτη του μήνα
                    category='management_fees',
                    expense_type='management_fee',  # ✅ Προστέθηκε
                    description=f'Διαχειριστικά Έξοδα {current_date.strftime("%B %Y")}',
                    distribution_type='equal_share',
                    payer_responsibility='resident',
                    approved=True
                )
                created_count += 1

            # Next month
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)

        return Response({
            'success': True,
            'building': building.name,
            'created': created_count,
            'skipped': skipped_count,
            'start_month': start_month,
            'end_month': end_month or 'current'
        })

    @action(detail=False, methods=['post'])
    def cleanup_orphan_management_fees(self, request):
        """
        Διαγράφει "ορφανά" management fees - δηλαδή αυτά που δεν έχουν transactions.

        Ορφανά management fees δημιουργούνται όταν:
        - Το expense δημιουργήθηκε αλλά το signal απέτυχε
        - Το expense δημιουργήθηκε πριν την ενεργοποίηση των signals
        - Υπάρχει bug στη δημιουργία transactions

        ΣΗΜΕΙΩΣΗ: ΔΕΝ διαγράφει management fees που έχουν ήδη transactions!
        """
        building_id = request.data.get('building_id')

        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Βρες όλα τα management fees για το κτίριο
        all_mgmt_fees = Expense.objects.filter(
            building=building,
            category='management_fees'
        )

        orphan_fees = []
        safe_fees = []

        # Έλεγχος για κάθε management fee αν έχει transactions
        for fee in all_mgmt_fees:
            has_transactions = Transaction.objects.filter(
                reference_type='expense',
                reference_id=str(fee.id)
            ).exists()

            if has_transactions:
                safe_fees.append(fee)
            else:
                orphan_fees.append(fee)

        # Διαγραφή μόνο των ορφανών
        deleted_count = 0
        deleted_details = []

        for fee in orphan_fees:
            deleted_details.append({
                'id': fee.id,
                'date': str(fee.date),
                'amount': float(fee.amount),
                'title': fee.title
            })
            fee.delete()
            deleted_count += 1

        return Response({
            'success': True,
            'building': building.name,
            'total_management_fees': all_mgmt_fees.count(),
            'safe_fees_count': len(safe_fees),
            'orphan_fees_deleted': deleted_count,
            'deleted_details': deleted_details,
            'message': f'Διαγράφηκαν {deleted_count} ορφανά management fees. '
                      f'Διατηρήθηκαν {len(safe_fees)} management fees που έχουν transactions.'
        })

    @action(detail=False, methods=['post'])
    def reset_management_fees(self, request):
        """
        Διαγράφει ΟΛΑ τα management fees και τα ξαναδημιουργεί με σωστή ημερομηνία.

        UPDATED 2025-10-10: Now uses MonthlyChargeService for Transaction-based system.

        Διαγράφει:
        - OLD: Expense records με category='management_fees'
        - NEW: Transaction records με type='management_fee_charge'

        Επαναδημιουργεί:
        - Transaction-based management fees μέσω MonthlyChargeService

        ΠΡΟΣΟΧΗ: Αυτό είναι destructive operation! Χρησιμοποιήστε μόνο για διόρθωση.
        """
        from datetime import date
        from .monthly_charge_service import MonthlyChargeService
        from .utils.date_helpers import get_month_first_day

        building_id = request.data.get('building_id')
        start_month = request.data.get('start_month')  # Optional: YYYY-MM, default: system start

        if not building_id:
            return Response(
                {'error': 'building_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building = Building.objects.get(id=building_id)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        deleted_expenses_count = 0
        deleted_old_transactions_count = 0
        deleted_new_transactions_count = 0

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # STEP 1: Delete OLD Expense-based management fees
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        all_mgmt_fees = Expense.objects.filter(
            building=building,
            category='management_fees'
        )

        for fee in all_mgmt_fees:
            # Διαγραφή transactions linked to this expense
            txns = Transaction.objects.filter(
                reference_type='expense',
                reference_id=str(fee.id)
            )
            deleted_old_transactions_count += txns.count()
            txns.delete()

            # Διαγραφή expense
            fee.delete()
            deleted_expenses_count += 1

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # STEP 2: Delete NEW Transaction-based management fees
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        mgmt_fee_transactions = Transaction.objects.filter(
            building=building,
            type='management_fee_charge'
        )
        deleted_new_transactions_count = mgmt_fee_transactions.count()
        mgmt_fee_transactions.delete()

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # STEP 3: Recreate using NEW MonthlyChargeService system
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if not building.management_fee_per_apartment or building.management_fee_per_apartment <= 0:
            return Response({
                'success': True,
                'deleted_expenses': deleted_expenses_count,
                'deleted_old_transactions': deleted_old_transactions_count,
                'deleted_new_transactions': deleted_new_transactions_count,
                'recreated_months': 0,
                'recreated_transactions': 0,
                'message': 'Διαγράφηκαν management fees αλλά δεν επαναδημιουργήθηκαν (δεν υπάρχει ρυθμισμένη αμοιβή)'
            })

        # Προσδιορισμός ημερομηνίας έναρξης
        if start_month:
            try:
                year, mon = map(int, start_month.split('-'))
                start_date = get_month_first_day(year, mon)
            except (ValueError, AttributeError):
                start_date = building.financial_system_start_date or date.today().replace(day=1)
        else:
            start_date = building.financial_system_start_date or date.today().replace(day=1)

        # End date = current month (inclusive)
        today = date.today()
        end_date = get_month_first_day(today.year, today.month)

        # ✅ Use MonthlyChargeService to recreate charges
        try:
            results = MonthlyChargeService.create_charges_for_building(
                building.id,
                start_date,
                end_date
            )

            # Count successful creations
            recreated_months = len(results)
            recreated_transactions = sum(r.get('transactions_created', 0) for r in results)

            # Επαναϋπολογισμός υπολοίπων
            from .balance_service import BalanceCalculationService
            for apartment in Apartment.objects.filter(building=building):
                BalanceCalculationService.update_apartment_balance(apartment)

            return Response({
                'success': True,
                'deleted_expenses': deleted_expenses_count,
                'deleted_old_transactions': deleted_old_transactions_count,
                'deleted_new_transactions': deleted_new_transactions_count,
                'recreated_months': recreated_months,
                'recreated_transactions': recreated_transactions,
                'message': (
                    f'✅ Διαγράφηκαν {deleted_expenses_count} expense-based management fees '
                    f'και {deleted_old_transactions_count + deleted_new_transactions_count} transactions. '
                    f'Επαναδημιουργήθηκαν {recreated_months} μήνες με {recreated_transactions} '
                    f'transaction-based charges (νέο σύστημα).'
                )
            })

        except Exception as e:
            # Log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error recreating management fees: {e}", exc_info=True)

            return Response(
                {
                    'error': f'Σφάλμα κατά την επαναδημιουργία: {str(e)}',
                    'deleted_expenses': deleted_expenses_count,
                    'deleted_transactions': deleted_old_transactions_count + deleted_new_transactions_count
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TransactionViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση κινήσεων ταμείου"""

    queryset = Transaction.objects.select_related('building', 'apartment').all()
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
        query_params = get_query_params(self.request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

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

    queryset = Payment.objects.select_related('apartment', 'apartment__building').all()
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

        # Get previous balance for transaction record
        apartment = payment.apartment
        previous_balance = apartment.current_balance or 0
        new_balance = previous_balance + payment.amount

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
            balance_after=new_balance,
            reference_id=str(payment.id),
            reference_type='payment',
            notes=payment.notes,
            created_by=str(self.request.user) if self.request.user.is_authenticated else 'System'
        )

        # Ενημέρωση υπολοίπου διαμερίσματος using BalanceCalculationService
        from .balance_service import BalanceCalculationService
        BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)

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

                # Διαγραφή του transaction που δημιουργήθηκε
                from .models import Transaction
                Transaction.objects.filter(
                    reference_id=str(payment.id),
                    reference_type='payment'
                ).delete()

                # Επαναφορά υπολοίπου διαμερίσματος using BalanceCalculationService
                from .balance_service import BalanceCalculationService
                BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)

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
        query_params = get_query_params(self.request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

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
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Λήψη οικονομικού συνόψη"""
        # Handle both DRF (query_params) and regular Django (GET) requests
        query_params = get_query_params(request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

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

    @action(detail=False, methods=['post'], url_path='recalculate-months')
    def recalculate_months(self, request):
        """Επανυπολογισμός MonthlyBalance από επιλεγμένο μήνα έως τον τρέχοντα."""
        data = request.data if hasattr(request, 'data') else request.POST
        building_id = data.get('building_id') or data.get('building')
        start_month = data.get('start_month') or data.get('month')
        end_month = data.get('end_month')

        if not building_id:
            return Response(
                {'error': 'Building ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building_id_int = int(building_id)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Invalid building ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            building = Building.objects.get(id=building_id_int)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Building not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        def parse_month(value: str | None) -> tuple[int, int] | None:
            if not value or not isinstance(value, str):
                return None
            try:
                year, month = map(int, value.split('-'))
                if month < 1 or month > 12:
                    return None
                return year, month
            except Exception:
                return None

        today = timezone.now().date()
        start_tuple = parse_month(start_month) or (today.year, today.month)
        end_tuple = parse_month(end_month) or (today.year, today.month)

        start_year, start_mon = start_tuple
        end_year, end_mon = end_tuple

        if (start_year, start_mon) > (end_year, end_mon):
            return Response(
                {'error': 'start_month must be <= end_month'},
                status=status.HTTP_400_BAD_REQUEST
            )

        months_recalculated = (end_year - start_year) * 12 + (end_mon - start_mon) + 1

        try:
            from .monthly_balance_service import MonthlyBalanceService
            service = MonthlyBalanceService(building)
            service.recalculate_all_months(
                start_year=start_year,
                start_month=start_mon,
                end_year=end_year,
                end_month=end_mon
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to recalculate monthly balances: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'status': 'ok',
            'building_id': building_id_int,
            'start_month': f'{start_year:04d}-{start_mon:02d}',
            'end_month': f'{end_year:04d}-{end_mon:02d}',
            'months_recalculated': months_recalculated
        })

    @action(detail=False, methods=['get'], url_path='improved-summary')
    def improved_summary(self, request):
        """Λήψη βελτιωμένου οικονομικού συνόψη με καλύτερη ορολογία"""
        # Handle both DRF (query_params) and regular Django (GET) requests
        query_params = get_query_params(request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

        if not building_id:
            return Response(
                {'error': 'Building ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from datetime import datetime
            from dateutil.relativedelta import relativedelta

            service = FinancialDashboardService(int(building_id))

            # Current month reference date
            if month:
                current_date = datetime.strptime(month + '-01', '%Y-%m-%d')
            else:
                current_date = datetime.now()

            # Previous month helpers
            previous_date = current_date - relativedelta(months=1)
            previous_month_str = previous_date.strftime('%Y-%m')

            # Summaries
            summary = service.get_summary(month)
            previous_summary = service.get_summary(previous_month_str)

            # Compute values expected by frontend
            total_expenses_this_month = float(summary.get('total_expenses_month', 0) or 0)
            total_payments_this_month = float(summary.get('total_payments_month', 0) or 0)
            total_management_cost = float(summary.get('total_management_cost', 0) or 0)
            reserve_fund_contribution = float(summary.get('reserve_fund_contribution', 0) or 0)

            current_invoice_total = total_expenses_this_month + total_management_cost + reserve_fund_contribution
            previous_month_expenses = float(previous_summary.get('total_expenses_month', 0) or 0)

            previous_balances = float(summary.get('previous_obligations', 0) or 0)
            grand_total = current_invoice_total + previous_balances

            total_paid_all = float(summary.get('total_payments', 0) or 0)  # may be 0 if not provided
            total_obligations_for_coverage = grand_total if grand_total else abs(float(summary.get('total_balance', 0) or 0))

            improved_data = {
                # Previous month expenses (operational) and names
                'previous_month_expenses': previous_month_expenses,
                'previous_month_name': previous_date.strftime('%B %Y'),

                # Current month charges
                'management_fees': total_management_cost,
                'reserve_fund_contribution': reserve_fund_contribution,
                'current_month_name': current_date.strftime('%B %Y'),

                # Invoice totals
                'invoice_total': current_invoice_total,

                # Total obligations section
                'current_invoice': current_invoice_total,
                'previous_balances': previous_balances,
                'grand_total': grand_total,

                # Coverage calculations
                'current_invoice_paid': total_payments_this_month,
                'current_invoice_total': current_invoice_total,
                'current_invoice_coverage_percentage': (total_payments_this_month / max(current_invoice_total, 1)) * 100,

                'total_paid': total_paid_all,
                'total_obligations': total_obligations_for_coverage,
                'total_coverage_percentage': (total_paid_all / max(total_obligations_for_coverage, 1)) * 100,

                # Reserve fund info
                'current_reserve': float(summary.get('current_reserve', 0) or 0),
                'reserve_target': float(summary.get('reserve_fund_goal', 0) or 0),
                'reserve_monthly_contribution': float(summary.get('reserve_fund_monthly_target', 0) or 0),
                'reserve_progress_percentage': (
                    (float(summary.get('current_reserve', 0) or 0) / max(float(summary.get('reserve_fund_goal', 0) or 0), 1)) * 100
                ),

                # Building info
                'apartment_count': int(summary.get('apartments_count', 0) or 0),
                'has_monthly_activity': bool(summary.get('has_monthly_activity', False)),
            }

            return Response(improved_data)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



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

                # Use the previous_balance from the service (which correctly calculates historical obligations)
                previous_balance = 0.0
                if month:
                    # Get the previous_balance from the service's apartment_balances
                    apt_balance_data = next((b for b in apartment_balances if b['id'] == apartment.id), None)
                    if apt_balance_data:
                        previous_balance = float(apt_balance_data.get('previous_balance', 0))
                else:
                    # If no month specified, use the apartment's current_balance as previous_balance
                    previous_balance = float(apartment.current_balance or 0)

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
                    'apartment_number': apartment.number,  # Add alias for frontend compatibility
                    'owner_name': apartment.owner_name,
                    'tenant_name': apartment.tenant_name,
                    'current_balance': current_balance,
                    'previous_balance': previous_balance,  # Add previous_balance field
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
                            share_amount = float((expense.amount * Decimal(str(mills)) / Decimal(str(total_mills))).quantize(Decimal('0.01')))
                        else:
                            share_amount = float((expense.amount / Decimal(str(apartments_count))).quantize(Decimal('0.01')))

                    elif expense.distribution_type == 'equal_share':
                        # Equal distribution
                        share_amount = float((expense.amount / Decimal(str(apartments_count))).quantize(Decimal('0.01')))

                    elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                        # Fallback to participation mills for now
                        mills = apartment.participation_mills or 0
                        if total_mills > 0:
                            share_amount = float((expense.amount * Decimal(str(mills)) / Decimal(str(total_mills))).quantize(Decimal('0.01')))
                        else:
                            share_amount = float((expense.amount / Decimal(str(apartments_count))).quantize(Decimal('0.01')))

                    apartment_data['total_obligations'] += share_amount
                    payer = expense.payer_responsibility or Expense.get_default_payer_for_category(expense.category) or 'resident'

                    apartment_data['expense_breakdown'].append({
                        'expense_id': expense.id,
                        'expense_title': expense.title,
                        'expense_amount': float(expense.amount),
                        'share_amount': share_amount,
                        'distribution_type': expense.distribution_type,
                        'payer_responsibility': payer,
                        'date': expense.date.isoformat(),
                        'month': expense.date.strftime('%Y-%m'),
                        'month_display': expense.date.strftime('%B %Y'),
                        'mills': apartment.participation_mills or 0,
                        'total_mills': total_mills
                    })

                # ΔΙΟΡΘΩΣΗ: Προσθήκη δυναμικού υπολογισμού αποθεματικού
                from buildings.models import Building
                building = Building.objects.get(id=building_id)

                # Υπολογισμός αποθεματικού αν υπάρχει στόχος και διάρκεια
                if (building.reserve_fund_goal and
                    building.reserve_fund_duration_months and
                    building.reserve_fund_start_date):

                    monthly_reserve_target = building.reserve_fund_goal / building.reserve_fund_duration_months

                    # Έλεγχος αν ο μήνας είναι εντός της περιόδου συλλογής αποθεματικού
                    if month:
                        try:
                            from datetime import date
                            year, mon = map(int, month.split('-'))
                            month_start = date(year, mon, 1)

                            # Έλεγχος αν ο μήνας είναι εντός της περιόδου συλλογής
                            if (month_start >= building.reserve_fund_start_date and
                                (not building.reserve_fund_target_date or month_start <= building.reserve_fund_target_date)):

                                # Υπολογισμός μεριδίου αποθεματικού
                                mills = apartment.participation_mills or 0
                                if total_mills > 0:
                                    reserve_share = float((monthly_reserve_target * Decimal(str(mills)) / Decimal(str(total_mills))).quantize(Decimal('0.01')))

                                    apartment_data['total_obligations'] += reserve_share
                                    apartment_data['expense_breakdown'].append({
                                        'expense_id': f'reserve_fund_{month}',
                                        'expense_title': 'Εισφορά Αποθεματικού',
                                        'expense_amount': float(monthly_reserve_target),
                                        'share_amount': reserve_share,
                                        'distribution_type': 'reserve_fund',
                                        'payer_responsibility': 'owner',
                                        'date': month_start.isoformat(),
                                        'month': month,
                                        'month_display': month_start.strftime('%B %Y'),
                                        'mills': mills,
                                        'total_mills': total_mills
                                    })
                        except Exception as e:
                            print(f"Error calculating reserve fund for month {month}: {e}")
                    else:
                        # Για current view, υπολογίζουμε αποθεματικό για όλους τους μήνες της περιόδου
                        from datetime import date, timedelta
                        today = date.today()
                        start_date = building.reserve_fund_start_date
                        end_date = building.reserve_fund_target_date or today

                        current_date = start_date
                        while current_date <= min(end_date, today):
                            # Υπολογισμός μεριδίου αποθεματικού για τον μήνα
                            mills = apartment.participation_mills or 0
                            if total_mills > 0:
                                reserve_share = float((monthly_reserve_target * Decimal(str(mills)) / Decimal(str(total_mills))).quantize(Decimal('0.01')))

                                apartment_data['total_obligations'] += reserve_share
                                apartment_data['expense_breakdown'].append({
                                    'expense_id': f'reserve_fund_{current_date.strftime("%Y-%m")}',
                                    'expense_title': 'Εισφορά Αποθεματικού',
                                    'expense_amount': float(monthly_reserve_target),
                                    'share_amount': reserve_share,
                                    'distribution_type': 'reserve_fund',
                                    'payer_responsibility': 'owner',
                                    'date': current_date.isoformat(),
                                    'month': current_date.strftime('%Y-%m'),
                                    'month_display': current_date.strftime('%B %Y'),
                                    'mills': mills,
                                    'total_mills': total_mills
                                })

                            # Επόμενος μήνας
                            if current_date.month == 12:
                                current_date = date(current_date.year + 1, 1, 1)
                            else:
                                current_date = date(current_date.year, current_date.month + 1, 1)

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
            # ΔΙΟΡΘΩΣΗ: Χρησιμοποιούμε το FinancialDashboardService που έχει τη σωστή λογική
            from .services import FinancialDashboardService

            service = FinancialDashboardService(building_id=building_id)
            apartment_balances = service.get_apartment_balances(month=month)

            # Υπολογισμός summary statistics από τα δεδομένα του service
            total_obligations = sum(float(apt.get('current_balance', 0)) for apt in apartment_balances if float(apt.get('current_balance', 0)) > 0)
            # ΔΙΟΡΘΩΣΗ: Χρήση του month_payments για στατιστικά μήνα (αντί για total_payments που είναι all-time)
            total_payments = sum(float(apt.get('month_payments', 0)) for apt in apartment_balances)
            total_net_obligations = sum(float(apt.get('net_obligation', 0)) for apt in apartment_balances if float(apt.get('net_obligation', 0)) > 0)

            # Count apartments by status
            active_count = len([apt for apt in apartment_balances if apt['status'] == 'Ενεργό'])
            debt_count = len([apt for apt in apartment_balances if apt['status'] in ['Οφειλή', 'Κρίσιμο']])
            critical_count = len([apt for apt in apartment_balances if apt['status'] == 'Κρίσιμο'])
            credit_count = len([apt for apt in apartment_balances if apt['status'] == 'Πιστωτικό'])

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
                    'data_month': month,  # Add the actual month of the data
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
            from datetime import date, timedelta

            # Get apartment
            apartment = Apartment.objects.get(id=apartment_id, building_id=building_id)

            # Calculate date range (last N months)
            today = date.today()
            end_date = today + timedelta(days=30)  # Include future transactions
            start_date = today - timedelta(days=30 * months_back)

            # Get all transactions for this apartment in the date range
            transactions = Transaction.objects.filter(
                apartment=apartment,
                date__date__gte=start_date,
                date__date__lte=end_date
            ).order_by('-date')

            # ΔΙΟΡΘΩΣΗ: Αφαίρεση διπλοτύπων πληρωμών
            # Όταν καταχωρείται πληρωμή, δημιουργούνται 2 transactions:
            # - payment_received και common_expense_payment
            # Κρατάμε μόνο το common_expense_payment για καλύτερη περιγραφή
            unique_transactions = []
            seen_payments = set()  # Track (date, amount) pairs to avoid duplicates

            for transaction in transactions:
                # Check if this is a duplicate payment transaction
                if transaction.type in ['payment_received', 'common_expense_payment']:
                    payment_key = (transaction.date.date(), transaction.amount)

                    if payment_key in seen_payments:
                        # Skip duplicate, prefer common_expense_payment over payment_received
                        if transaction.type == 'payment_received':
                            continue
                        else:
                            # Remove the previous payment_received if we now have common_expense_payment
                            unique_transactions = [t for t in unique_transactions
                                                 if not (t.date.date() == payment_key[0]
                                                        and t.amount == payment_key[1]
                                                        and t.type == 'payment_received')]

                    seen_payments.add(payment_key)

                unique_transactions.append(transaction)

            # Group transactions by month
            monthly_data = {}

            from django.utils import timezone

            for transaction in unique_transactions:
                # Get local date for grouping
                # Convert to local time to handle timezone shifts correctly
                # e.g. 2025-11-30 22:00 UTC -> 2025-12-01 00:00 Athens
                local_date = timezone.localtime(transaction.date)

                # Get month key (YYYY-MM format)
                month_key = local_date.strftime('%Y-%m')

                if month_key not in monthly_data:
                    monthly_data[month_key] = {
                        'month': month_key,
                        'month_display': local_date.strftime('%B %Y'),
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
                    # 🔧 FIX 2025-11-20: net_amount είναι χρέος - χρεώσεις το αυξάνουν
                    monthly_data[month_key]['net_amount'] += float(transaction.amount)
                else:
                    monthly_data[month_key]['payments'].append(transaction_data)
                    monthly_data[month_key]['total_payments'] += float(transaction.amount)
                    # 🔧 FIX 2025-11-20: net_amount είναι χρέος - πληρωμές το μειώνουν
                    monthly_data[month_key]['net_amount'] -= float(transaction.amount)

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

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Λήψη aggregated overview για όλα τα κτίρια του χρήστη
        Endpoint: /api/financial/dashboard/overview/
        Query params:
        - building_id (optional): Φιλτράρισμα για συγκεκριμένο κτίριο
        """
        try:
            from django.db.models import Sum, Count, Q
            from datetime import datetime, timedelta
            from announcements.models import Announcement
            from votes.models import Vote
            from maintenance.models import MaintenanceTicket

            # Get user's buildings
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Get building_id filter from query params
            building_id = request.query_params.get('building_id')

            # Get all buildings accessible to user (using same logic as BuildingViewSet)
            if user.is_superuser or user.is_staff:
                buildings = Building.objects.all()
            else:
                # Check if user is a manager
                is_manager = hasattr(user, "is_manager") and user.is_manager
                if is_manager:
                    buildings = Building.objects.filter(manager_id=user.id)
                else:
                    # User is a resident - get buildings via BuildingMembership
                    from buildings.models import BuildingMembership
                    # Use 'memberships' related_name instead of default 'buildingmembership'
                    buildings = Building.objects.filter(memberships__resident=user).distinct()

            buildings = buildings.distinct()

            # Apply building_id filter if provided
            if building_id:
                try:
                    building_id = int(building_id)
                    buildings = buildings.filter(id=building_id)
                    if not buildings.exists():
                        return Response(
                            {'error': 'Building not found or access denied'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid building_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if not buildings.exists():
                return Response({
                    'buildings_count': 0,
                    'apartments_count': 0,
                    'total_balance': 0,
                    'pending_obligations': 0,
                    'announcements_count': 0,
                    'votes_count': 0,
                    'requests_count': 0,
                    'urgent_items': 0,
                    'financial_summary': None,
                    'recent_activity': [],
                    'buildings': []
                })

            # Aggregate metrics
            buildings_count = buildings.count()
            apartments_count = Apartment.objects.filter(building__in=buildings).count()

            # Financial metrics - aggregate from all buildings
            total_balance = 0
            pending_obligations = 0
            pending_expenses = 0
            total_month_payments = 0.0

            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-03: Χρήση τρέχοντος μήνα για consistent data με Financial Page
            # Η Financial Page χρησιμοποιεί net_obligation (previous + current - payments)
            # Το Dashboard πρέπει να χρησιμοποιεί τα ίδια δεδομένα
            current_month = datetime.now().strftime('%Y-%m')

            buildings_data = []
            for building in buildings:
                try:
                    service = FinancialDashboardService(building.id)
                    summary = service.get_summary(month=current_month)  # Με μήνα για consistent data

                    building_balance = float(summary.get('current_reserve', 0) or 0)
                    building_pending = float(summary.get('pending_expenses', 0) or 0)

                    total_balance += building_balance
                    pending_expenses += building_pending

                    # Get apartment balances with current month for net_obligation calculation
                    apt_balances = service.get_apartment_balances(month=current_month)

                    # 📝 Χρήση net_obligation αντί για current_balance για consistency με Financial Page
                    # net_obligation = previous_balance + expense_share - month_payments
                    # Θετικό net_obligation = Οφειλή
                    building_obligations = sum(
                        float(apt.get('net_obligation', 0))
                        for apt in apt_balances
                        if float(apt.get('net_obligation', 0)) > 0  # Θετικά net_obligation = Οφειλές
                    )
                    pending_obligations += building_obligations

                    # Συνολικές πληρωμές τρέχοντος μήνα (για σωστό collection rate)
                    # month_payments είναι το ποσό πληρωμών του μήνα που αφαιρείται από το net_obligation.
                    building_month_payments = sum(
                        float(apt.get('month_payments', 0) or 0)
                        for apt in apt_balances
                    )
                    total_month_payments += building_month_payments

                    buildings_data.append({
                        'id': building.id,
                        'name': building.name,
                        'address': building.address,
                        'apartments_count': building.apartments.count(),
                        'balance': building_balance,
                        'pending_obligations': building_obligations,
                        'health_score': self._calculate_building_health(building, summary, apt_balances)
                    })

                except Exception as e:
                    print(f"Error processing building {building.id}: {str(e)}")
                    buildings_data.append({
                        'id': building.id,
                        'name': building.name,
                        'address': building.address,
                        'apartments_count': building.apartments.count(),
                        'balance': 0,
                        'pending_obligations': 0,
                        'health_score': 50
                    })

            # Get announcements count - 📝 ΔΙΟΡΘΩΣΗ 2025-12-05: Εξαίρεση ληγμένων ανακοινώσεων
            today = datetime.now().date()
            announcements_count = Announcement.objects.filter(
                building__in=buildings,
                is_active=True,
                published=True
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)  # Μόνο ανακοινώσεις που δεν έχουν λήξει
            ).count()

            # Get active votes count
            votes_count = Vote.objects.filter(
                building__in=buildings,
                is_active=True,
                start_date__lte=today,
                end_date__gte=today
            ).count()

            # Get maintenance requests count
            try:
                requests_count = MaintenanceTicket.objects.filter(
                    building__in=buildings
                ).count()
                urgent_requests = MaintenanceTicket.objects.filter(
                    building__in=buildings,
                    priority__in=['high', 'urgent']
                ).count()
            except Exception:
                requests_count = 0
                urgent_requests = 0

            # Calculate urgent items - 📝 ΔΙΟΡΘΩΣΗ 2025-12-05: Προσθήκη urgent ανακοινώσεων που δεν έχουν λήξει
            urgent_announcements = Announcement.objects.filter(
                building__in=buildings,
                is_active=True,
                published=True,
                is_urgent=True
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)
            ).count()
            urgent_items = urgent_requests + votes_count + urgent_announcements

            # Get recent activity (announcements + votes)
            # 📝 ΔΙΟΡΘΩΣΗ 2025-12-05: Εξαίρεση ληγμένων ανακοινώσεων/ψηφοφοριών
            recent_announcements = Announcement.objects.filter(
                building__in=buildings,
                is_active=True,
                published=True
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)  # Μόνο μη-ληγμένες
            ).order_by('-created_at')[:5]

            recent_votes = Vote.objects.filter(
                building__in=buildings,
                is_active=True
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)  # Μόνο μη-ληγμένες
            ).order_by('-created_at')[:5]

            recent_activity = []
            for announcement in recent_announcements:
                recent_activity.append({
                    'type': 'announcement',
                    'id': announcement.id,
                    'title': announcement.title,
                    'date': announcement.created_at.isoformat(),
                    'is_urgent': announcement.is_urgent,
                    'building_id': announcement.building_id
                })

            for vote in recent_votes:
                recent_activity.append({
                    'type': 'vote',
                    'id': vote.id,
                    'title': vote.title,
                    'date': vote.created_at.isoformat(),
                    'is_urgent': vote.is_urgent,
                    'building_id': vote.building_id
                })

            # Sort by date
            recent_activity.sort(key=lambda x: x['date'], reverse=True)
            recent_activity = recent_activity[:10]

            return Response({
                'buildings_count': buildings_count,
                'apartments_count': apartments_count,
                'total_balance': total_balance,
                'pending_obligations': pending_obligations,
                'pending_expenses': pending_expenses,
                'announcements_count': announcements_count,
                'votes_count': votes_count,
                'requests_count': requests_count,
                'urgent_items': urgent_items,
                'financial_summary': {
                    'total_reserve': total_balance,
                    'total_pending_expenses': pending_expenses,
                    'total_pending_obligations': pending_obligations,
                    'collection_rate': (
                        # Collection rate = πληρωμές / (πληρωμές + ανεξόφλητες οφειλές)
                        # Αυτό δίνει σωστό αποτέλεσμα π.χ. 60/(60+540)=10%.
                        (min(100.0, (total_month_payments / (total_month_payments + pending_obligations)) * 100)
                         if (total_month_payments + pending_obligations) > 0
                         else 100.0)
                    )
                },
                'recent_activity': recent_activity,
                'buildings': buildings_data
            })

        except Exception as e:
            print(f"Error in dashboard overview: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Error retrieving dashboard overview: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _calculate_building_health(self, building, summary, apt_balances):
        """Calculate a health score (0-100) for a building based on various metrics"""
        try:
            score = 100

            # Deduct points for negative apartment balances
            negative_count = len([apt for apt in apt_balances if float(apt.get('current_balance', 0)) < 0])
            total_apts = len(apt_balances)
            if total_apts > 0:
                debt_ratio = negative_count / total_apts
                score -= (debt_ratio * 30)  # Max 30 points deduction

            # Deduct points for pending expenses
            pending_expenses = float(summary.get('pending_expenses', 0) or 0)
            if pending_expenses > 1000:
                score -= min(20, pending_expenses / 100)  # Max 20 points deduction

            # Deduct points for low reserve
            current_reserve = float(summary.get('current_reserve', 0) or 0)
            if current_reserve < 0:
                score -= 20
            elif current_reserve < 500:
                score -= 10

            return max(0, min(100, int(score)))
        except Exception:
            return 50  # Default middle score if calculation fails


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
                from datetime import date, timedelta
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

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def issue(self, request):
        """Έκδοση κοινοχρήστων"""
        try:
            data = request.data
            building_id = data.get('building_id') or data.get('building')
            period_data = data.get('period_data', {})
            shares = data.get('shares', {})
            sheet_file = request.FILES.get('sheet_attachment')

            if not building_id:
                raise ValueError('building_id is required')

            if isinstance(period_data, str):
                try:
                    period_data = json.loads(period_data)
                except json.JSONDecodeError:
                    period_data = {}

            if isinstance(shares, str):
                try:
                    shares = json.loads(shares)
                except json.JSONDecodeError:
                    shares = {}

            # Find or create common expense period
            start_date = period_data.get('start_date')
            end_date = period_data.get('end_date')
            period = None
            if start_date and end_date:
                period = CommonExpensePeriod.objects.filter(
                    building_id=building_id,
                    start_date__lte=end_date,
                    end_date__gte=start_date
                ).order_by('start_date').first()

            if not period:
                period = CommonExpensePeriod.objects.create(
                    building_id=building_id,
                    period_name=period_data.get('name', f'Κοινοχρήστα {datetime.now().strftime("%m/%Y")}'),
                    start_date=start_date,
                    end_date=end_date
                )
            elif period_data.get('name') and period.period_name != period_data.get('name'):
                period.period_name = period_data.get('name')
                period.save(update_fields=['period_name'])

            if sheet_file:
                period.sheet_attachment.save(sheet_file.name, sheet_file)

            # Δημιουργία μεριδίων για κάθε διαμέρισμα
            apartment_shares = []
            existing_shares = ApartmentShare.objects.filter(period=period)
            if not existing_shares.exists():
                for apartment_id, share_data in shares.items():
                    apartment = Apartment.objects.get(id=int(apartment_id))
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

                    # Ενημέρωση υπολοίπου διαμερίσματος using BalanceCalculationService
                    from financial.balance_service import BalanceCalculationService
                    BalanceCalculationService.update_apartment_balance(apartment, use_locking=False)

            # Σημείωση: Οι δαπάνες θεωρούνται αυτόματα εκδοθείσες
            # Δεν χρειάζεται πλέον μαρκάρισμα ως εκδοθείσες
            if existing_shares.exists():
                totals = existing_shares.aggregate(total=models.Sum('total_amount'))
                total_amount = totals['total'] or Decimal('0.00')
                apartments_count = existing_shares.count()
            else:
                total_amount = sum(share.total_amount for share in apartment_shares)
                apartments_count = len(apartment_shares)

            return Response({
                'success': True,
                'message': f'Τα κοινοχρήστα εκδόθηκαν επιτυχώς για την περίοδο {period.period_name}',
                'period_id': period.id,
                'apartments_count': apartments_count,
                'total_amount': total_amount
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

    @action(detail=False, methods=['get'], permission_classes=[FinancialReadPermission])
    def sheet(self, request):
        """Λήψη φύλλου κοινοχρήστων για συγκεκριμένο μήνα ή περίοδο."""
        try:
            building_id = request.query_params.get('building_id') or request.query_params.get('building')
            period_id = request.query_params.get('period_id')
            month_str = request.query_params.get('month')
            sheet_format = (request.query_params.get('format') or 'pdf').lower()

            if not building_id:
                return Response({'error': 'building_id is required'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                building_id_int = int(building_id)
            except (TypeError, ValueError):
                return Response({'error': 'invalid building_id'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                building = Building.objects.get(id=building_id_int)
            except Building.DoesNotExist:
                return Response({'error': 'Building not found'}, status=status.HTTP_404_NOT_FOUND)

            permission = FinancialReadPermission()
            if not permission.can_user_access_building(request.user, building):
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

            period = None
            range_start = None
            range_end = None
            range_end_inclusive = False

            if period_id:
                period = CommonExpensePeriod.objects.filter(id=period_id, building_id=building_id_int).first()
                if not period:
                    return Response({'error': 'Period not found'}, status=status.HTTP_404_NOT_FOUND)
                range_start = period.start_date
                range_end = period.end_date
                range_end_inclusive = True
            else:
                if not month_str:
                    return Response({'error': 'month or period_id is required'}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    month_date = datetime.strptime(month_str, '%Y-%m').date()
                except ValueError:
                    return Response({'error': 'Invalid month format. Use YYYY-MM'}, status=status.HTTP_400_BAD_REQUEST)
                range_start = date(month_date.year, month_date.month, 1)
                if month_date.month == 12:
                    range_end = date(month_date.year + 1, 1, 1)
                else:
                    range_end = date(month_date.year, month_date.month + 1, 1)
                period = CommonExpensePeriod.objects.filter(
                    building_id=building_id_int,
                    start_date__lt=range_end,
                    end_date__gte=range_start
                ).order_by('-start_date').first()

            sheet_path = None
            if period and period.sheet_attachment:
                sheet_path = period.sheet_attachment.name or str(period.sheet_attachment)
            elif range_start and range_end:
                expense_with_sheet = (
                    Expense.objects.filter(
                        building_id=building_id_int,
                        date__gte=range_start,
                        date__lt=range_end,
                        attachment__isnull=False
                    )
                    .exclude(attachment="")
                    .order_by('-date')
                    .first()
                )
                if expense_with_sheet and expense_with_sheet.attachment:
                    sheet_path = expense_with_sheet.attachment.name or str(expense_with_sheet.attachment)

            if not sheet_path:
                auto_generate = str(request.query_params.get('auto_generate', 'true')).lower() in ('true', '1', 'yes')
                if not auto_generate:
                    return Response({'error': 'Sheet not found'}, status=status.HTTP_404_NOT_FOUND)

                if range_start and range_end:
                    expenses_qs = Expense.objects.filter(
                        building_id=building_id_int,
                        date__gte=range_start,
                        **({'date__lte': range_end} if range_end_inclusive else {'date__lt': range_end}),
                    ).order_by('date')
                else:
                    expenses_qs = Expense.objects.none()

                share_rows = []
                if period:
                    shares_qs = (
                        ApartmentShare.objects.filter(period=period)
                        .select_related('apartment')
                        .order_by('apartment__number')
                    )
                else:
                    shares_qs = ApartmentShare.objects.none()

                if shares_qs.exists():
                    for share in shares_qs:
                        apartment = share.apartment
                        owner_name = apartment.owner_name or apartment.tenant_name or ''
                        share_rows.append({
                            'apartment': apartment.number,
                            'owner': owner_name,
                            'mills': apartment.participation_mills or 0,
                            'previous_balance': share.previous_balance,
                            'total_amount': share.total_amount,
                            'total_due': share.total_due,
                        })
                elif month_str:
                    from .services import CommonExpenseCalculator
                    calculator = CommonExpenseCalculator(building_id_int, month_str)
                    calculated = calculator.calculate_shares()
                    for share_data in calculated.values():
                        total_amount = Decimal(str(share_data.get('total_amount', 0)))
                        reserve_amount = Decimal(str(share_data.get('reserve_fund_amount', 0)))
                        share_rows.append({
                            'apartment': share_data.get('apartment_number') or share_data.get('identifier') or '',
                            'owner': share_data.get('owner_name') or '',
                            'mills': share_data.get('participation_mills') or 0,
                            'previous_balance': share_data.get('previous_balance') or Decimal('0.00'),
                            'total_amount': total_amount + reserve_amount,
                            'total_due': share_data.get('total_due') or Decimal('0.00'),
                        })

                if not share_rows and not expenses_qs.exists():
                    return Response({'error': 'Sheet not found'}, status=status.HTTP_404_NOT_FOUND)

                def format_currency(amount):
                    try:
                        value = Decimal(str(amount))
                    except Exception:
                        value = Decimal('0.00')
                    return f"{value:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

                if sheet_format == 'csv':
                    output = io.StringIO()
                    output.write(f"Κτίριο,{building.name}\n")
                    if period:
                        output.write(f"Περίοδος,{period.period_name}\n")
                    elif month_str:
                        output.write(f"Περίοδος,{month_str}\n")
                    output.write("\n")
                    if expenses_qs.exists():
                        output.write("Δαπάνες\n")
                        output.write("Ημερομηνία,Περιγραφή,Ποσό\n")
                        for expense in expenses_qs:
                            description = expense.title or expense.category or ''
                            output.write(f"{expense.date},{description},{expense.amount}\n")
                        output.write("\n")
                    output.write("Κατανομή Διαμερισμάτων\n")
                    output.write("Διαμέρισμα,Ιδιοκτήτης,Χιλιοστά,Προηγούμενο Υπόλοιπο,Χρέωση Μήνα,Σύνολο Οφειλής\n")
                    for row in share_rows:
                        output.write(
                            f"{row['apartment']},{row['owner']},{row['mills']},{row['previous_balance']},{row['total_amount']},{row['total_due']}\n"
                        )
                    output.seek(0)
                    filename = f"common-expenses-{month_str or 'period'}.csv"
                    response = FileResponse(
                        io.BytesIO(output.getvalue().encode('utf-8')),
                        content_type='text/csv; charset=utf-8'
                    )
                    response['Content-Disposition'] = f'attachment; filename="{filename}"'
                    return response

                try:
                    from reportlab.lib.pagesizes import A4
                    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
                    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                    from reportlab.lib import colors
                except Exception:
                    return Response({'error': 'Sheet not found'}, status=status.HTTP_404_NOT_FOUND)

                buffer = io.BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=A4)
                elements = []

                styles = getSampleStyleSheet()
                title_style = ParagraphStyle(
                    'Title',
                    parent=styles['Heading1'],
                    fontSize=16,
                    spaceAfter=10,
                    alignment=1
                )

                period_label = period.period_name if period else (month_str or '')
                elements.append(Paragraph("Φύλλο Κοινοχρήστων", title_style))
                elements.append(Paragraph(f"{building.name} - {period_label}", styles['Normal']))
                elements.append(Spacer(1, 12))

                if expenses_qs.exists():
                    elements.append(Paragraph("Ανάλυση Δαπανών", styles['Heading3']))
                    expense_rows = [["Ημερομηνία", "Περιγραφή", "Ποσό"]]
                    for expense in expenses_qs:
                        description = expense.title or expense.category or ''
                        expense_rows.append([
                            expense.date.strftime('%d/%m/%Y'),
                            description,
                            format_currency(expense.amount),
                        ])
                    expense_table = Table(expense_rows, colWidths=[80, 320, 100])
                    expense_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                    ]))
                    elements.append(expense_table)
                    elements.append(Spacer(1, 14))

                elements.append(Paragraph("Κατανομή Διαμερισμάτων", styles['Heading3']))
                share_table_rows = [[
                    "Διαμ.",
                    "Ιδιοκτήτης",
                    "Χιλ.",
                    "Προηγ. Υπόλ.",
                    "Χρέωση Μήνα",
                    "Σύνολο"
                ]]
                for row in share_rows:
                    share_table_rows.append([
                        str(row['apartment']),
                        row['owner'],
                        str(row['mills']),
                        format_currency(row['previous_balance']),
                        format_currency(row['total_amount']),
                        format_currency(row['total_due']),
                    ])

                share_table = Table(share_table_rows, colWidths=[50, 160, 50, 90, 90, 90])
                share_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                    ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                ]))
                elements.append(share_table)

                doc.build(elements)
                buffer.seek(0)

                filename = f"common-expenses-{month_str or 'period'}.pdf"
                response = FileResponse(buffer, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="{filename}"'
                return response

            if sheet_path.startswith('http://') or sheet_path.startswith('https://'):
                return redirect(sheet_path)

            try:
                file_obj = default_storage.open(sheet_path, 'rb')
            except Exception:
                try:
                    return redirect(default_storage.url(sheet_path))
                except Exception:
                    return Response({'error': 'Sheet not available'}, status=status.HTTP_404_NOT_FOUND)

            filename = sheet_path.split('/')[-1]
            content_type, _ = mimetypes.guess_type(filename)
            response = FileResponse(file_obj, content_type=content_type or 'application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[FinancialReadPermission],
        url_path='missing-notifications'
    )
    def missing_notifications(self, request):
        """Έλεγχος αν έχουν σταλεί κοινοχρήστα προηγούμενου μήνα μέσα στον τρέχοντα."""
        try:
            today = timezone.localdate()
            current_month_start = today.replace(day=1)
            if current_month_start.month == 1:
                prev_month_start = date(current_month_start.year - 1, 12, 1)
            else:
                prev_month_start = date(current_month_start.year, current_month_start.month - 1, 1)

            current_month_start_dt = timezone.make_aware(
                datetime.combine(current_month_start, time.min),
                timezone.get_current_timezone()
            )

            permission = FinancialReadPermission()
            buildings = Building.objects.all().order_by('name')
            accessible_buildings = [
                building for building in buildings
                if permission.can_user_access_building(request.user, building)
            ]

            if not accessible_buildings:
                return Response({
                    'reference_month': prev_month_start.strftime('%Y-%m'),
                    'current_month_start': current_month_start.isoformat(),
                    'missing_count': 0,
                    'missing_buildings': [],
                })

            building_ids = [building.id for building in accessible_buildings]
            periods = CommonExpensePeriod.objects.filter(
                building_id__in=building_ids,
                start_date__lt=current_month_start,
                end_date__gte=prev_month_start,
            ).select_related('building').order_by('building_id', '-start_date')

            period_by_building = {}
            for period in periods:
                if period.building_id not in period_by_building:
                    period_by_building[period.building_id] = period

            missing = []
            for building in accessible_buildings:
                period = period_by_building.get(building.id)
                if not period:
                    missing.append({
                        'building_id': building.id,
                        'building_name': building.name,
                        'period_id': None,
                        'period_name': None,
                        'notifications_sent_at': None,
                        'reason': 'no_period',
                    })
                    continue

                sent_at = period.notifications_sent_at
                if sent_at and timezone.is_naive(sent_at):
                    sent_at = timezone.make_aware(sent_at, timezone.get_current_timezone())

                if not sent_at or sent_at < current_month_start_dt:
                    missing.append({
                        'building_id': building.id,
                        'building_name': building.name,
                        'period_id': period.id,
                        'period_name': period.period_name,
                        'notifications_sent_at': sent_at.isoformat() if sent_at else None,
                        'reason': 'not_sent_this_month',
                    })

            return Response({
                'reference_month': prev_month_start.strftime('%Y-%m'),
                'current_month_start': current_month_start.isoformat(),
                'missing_count': len(missing),
                'missing_buildings': missing,
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

    queryset = MeterReading.objects.select_related('apartment', 'apartment__building').all()
    serializer_class = MeterReadingSerializer
    permission_classes = [FinancialWritePermission]
    filter_backends = [filters.DjangoFilterBackend]
    filterset_fields = ['apartment', 'meter_type', 'reading_date']

    def get_queryset(self):
        """Φιλτράρισμα ανά building και μήνα"""
        queryset = self.queryset
        query_params = get_query_params(self.request)
        building_id = query_params.get('building_id')
        month = query_params.get('month')

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

    @action(detail=False, methods=['get'])
    def apartment_payments(self, request):
        """Λήψη ιστορικού πληρωμών για ένα διαμέρισμα"""
        apartment_id = request.query_params.get('apartment_id')
        building_id = request.query_params.get('building_id')
        limit = int(request.query_params.get('limit', 100))

        if not apartment_id:
            return Response(
                {'error': 'apartment_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get all payments for this apartment
            from financial.models import Payment
            payments = Payment.objects.filter(
                apartment_id=apartment_id
            ).order_by('-date')[:limit]

            # Serialize the payments
            payment_data = []
            for payment in payments:
                payment_data.append({
                    'id': payment.id,
                    'amount': float(payment.amount),
                    'date': payment.date.isoformat(),
                    'method': payment.method,
                    'payment_type': payment.payment_type,
                    'reference_number': payment.reference_number,
                    'notes': payment.notes,
                    'payer_name': payment.payer_name,
                    'previous_obligations_amount': float(payment.previous_obligations_amount) if payment.previous_obligations_amount else 0,
                    'reserve_fund_amount': float(payment.reserve_fund_amount) if payment.reserve_fund_amount else 0,
                })

            return Response(payment_data)

        except Exception as e:
            return Response(
                {'error': f'Error retrieving payment history: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health_check(request):
    """
    System Health Check API

    Επιστρέφει συνολική κατάσταση υγείας του συστήματος
    """
    try:
        # Εκτέλεση ελέγχου υγείας
        if run_system_health_check is None:
            return Response(
                {'error': 'System health validator not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

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
        if run_auto_fix is None:
            return Response(
                {'error': 'Auto fix system issues not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

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

    queryset = FinancialReceipt.objects.select_related('payment', 'payment__apartment', 'payment__apartment__building').all()
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


class MonthlyBalanceViewSet(viewsets.ModelViewSet):
    """ViewSet για τα μηνιαία υπολοιπα (Υβριδικό Σύστημα)"""

    queryset = MonthlyBalance.objects.all()
    serializer_class = MonthlyBalanceSerializer
    permission_classes = [IsAuthenticated]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.format_kwarg = None

    def get_queryset(self):
        """Φιλτράρισμα ανά κτίριο"""
        queryset = super().get_queryset()
        building_id = self.request.query_params.get('building_id')

        if building_id:
            queryset = queryset.filter(building_id=building_id)

        return queryset.order_by('-year', '-month')

    @action(detail=False, methods=['get'])
    def by_building(self, request):
        """Λήψη μηνιαίων υπολοίπων ανά κτίριο"""
        building_id = request.query_params.get('building_id')

        if not building_id:
            return Response(
                {'error': 'Building ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            balances = MonthlyBalance.objects.filter(
                building_id=building_id
            ).select_related('building').order_by('-year', '-month')

            serializer = self.get_serializer(balances, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def create_month(self, request):
        """Δημιουργία νέου μηνιαίου υπολοίπου"""
        building_id = request.data.get('building_id')
        year = request.data.get('year')
        month = request.data.get('month')

        if not all([building_id, year, month]):
            return Response(
                {'error': 'Building ID, year, and month are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from buildings.models import Building
            from decimal import Decimal
            from datetime import date
            from django.db.models import Sum

            building = Building.objects.get(id=building_id)

            # 🔧 ΔΙΟΡΘΩΣΗ 2025-10-10: Υπολογισμός πραγματικών τιμών αντί για 0.00

            # Υπολογισμός ημερομηνιών περιόδου
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, month + 1, 1)

            # 1. Total expenses του μήνα
            total_expenses = Expense.objects.filter(
                building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            # 2. Total payments του μήνα
            total_payments = Payment.objects.filter(
                apartment__building=building,
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            # 3. Management fees του μήνα (από Expense records)
            management_fees = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__gte=month_start,
                date__lt=month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            # 4. Previous obligations (από προηγούμενο μήνα)
            prev_month = month - 1
            prev_year = year
            if prev_month == 0:
                prev_month = 12
                prev_year -= 1

            prev_balance = MonthlyBalance.objects.filter(
                building=building,
                year=prev_year,
                month=prev_month
            ).first()

            if prev_balance:
                previous_obligations = prev_balance.carry_forward
            else:
                # Fallback: Raw calculation
                expenses_before = Expense.objects.filter(
                    building=building,
                    date__lt=month_start
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                payments_before = Payment.objects.filter(
                    apartment__building=building,
                    date__lt=month_start
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

                previous_obligations = expenses_before - payments_before

            # 5. Υπολογισμός carry_forward
            total_obligations = total_expenses + previous_obligations
            net_result = total_payments - total_obligations
            carry_forward = -net_result if net_result < 0 else Decimal('0.00')

            # Δημιουργία νέου μηνιαίου υπολοίπου με υπολογισμένες τιμές
            balance = MonthlyBalance.objects.create(
                building=building,
                year=year,
                month=month,
                total_expenses=total_expenses,
                total_payments=total_payments,
                previous_obligations=previous_obligations,
                reserve_fund_amount=Decimal('0.00'),  # TODO: Calculate from reserve fund expenses
                management_fees=management_fees,
                carry_forward=carry_forward,
                annual_carry_forward=Decimal('0.00'),
                balance_year=year,
                main_balance_carry_forward=Decimal('0.00'),
                reserve_balance_carry_forward=Decimal('0.00'),
                management_balance_carry_forward=Decimal('0.00'),
            )

            serializer = self.get_serializer(balance)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Building.DoesNotExist:
            return Response(
                {'error': 'Το κτίριο δεν βρέθηκε'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def close_month(self, request):
        """Κλείσιμο μηνιαίου υπολοίπου"""
        building_id = request.data.get('building_id')
        year = request.data.get('year')
        month = request.data.get('month')

        if not all([building_id, year, month]):
            return Response(
                {'error': 'Building ID, year, and month are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            balance = MonthlyBalance.objects.get(
                building_id=building_id,
                year=year,
                month=month
            )

            # Κλείσιμο μήνα
            balance.close_month()

            serializer = self.get_serializer(balance)
            return Response(serializer.data)
        except MonthlyBalance.DoesNotExist:
            return Response(
                {'error': 'Το μηνιαίο υπόλοιπο δεν βρέθηκε'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def hybrid_balance_summary(self, request):
        """Σύνοψη υβριδικού συστήματος υπολοίπων"""
        building_id = request.query_params.get('building_id')
        year = request.query_params.get('year')

        if not building_id:
            return Response(
                {'error': 'Building ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from decimal import Decimal

            queryset = MonthlyBalance.objects.filter(building_id=building_id)
            if year:
                queryset = queryset.filter(year=year)

            balances = queryset.order_by('year', 'month')

            # Υπολογισμός συνολικών υπολοίπων
            total_main_balance = sum(b.main_balance_carry_forward for b in balances)
            total_reserve_balance = sum(b.reserve_balance_carry_forward for b in balances)
            total_management_balance = sum(b.management_balance_carry_forward for b in balances)

            # Τελευταίο μηνιαίο υπόλοιπο
            last_balance = balances.last()

            summary = {
                'building_id': int(building_id),
                'year': int(year) if year else None,
                'total_main_balance': float(total_main_balance),
                'total_reserve_balance': float(total_reserve_balance),
                'total_management_balance': float(total_management_balance),
                'last_balance': self.get_serializer(last_balance).data if last_balance else None,
                'balances_count': balances.count(),
                'hybrid_system_active': True
            }

            return Response(summary)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# My Apartment Endpoint - Για ενοίκους
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_apartment_data(request):
    """
    GET /api/financial/my-apartment/

    Επιστρέφει τα οικονομικά δεδομένα του διαμερίσματος του τρέχοντος χρήστη.
    Ο χρήστης πρέπει να είναι ιδιοκτήτης ή ένοικος του διαμερίσματος.

    Query Parameters:
        - month: Optional, format 'YYYY-MM' για συγκεκριμένο μήνα
        - months_back: Optional, αριθμός μηνών ιστορικού (default: 12)

    Returns:
        - apartment: Στοιχεία διαμερίσματος
        - building: Στοιχεία κτιρίου
        - current_balance: Τρέχουσα οφειλή
        - payment_history: Ιστορικό πληρωμών
        - transaction_history: Ιστορικό κινήσεων
        - summary: Σύνοψη οικονομικών
    """
    import logging
    from datetime import date, timedelta
    from buildings.models import BuildingMembership
    from apartments.models import Apartment

    logger = logging.getLogger(__name__)
    user = request.user

    month = request.query_params.get('month')
    months_back = int(request.query_params.get('months_back', 12))

    logger.info(f"[my_apartment_data] Request from user: {user.email}")

    try:
        # Βρες τα διαμερίσματα του χρήστη μέσω BuildingMembership
        memberships = BuildingMembership.objects.filter(resident=user).select_related('building')

        if not memberships.exists():
            # Fallback: Ψάξε αν ο χρήστης είναι owner ή tenant σε κάποιο διαμέρισμα
            apartments = Apartment.objects.filter(
                models.Q(owner_user=user) | models.Q(tenant_user=user)
            ).select_related('building')

            if not apartments.exists():
                return Response({
                    'error': 'Δεν βρέθηκε διαμέρισμα για αυτόν τον χρήστη',
                    'apartments': [],
                    'has_apartment': False
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # Βρες τα διαμερίσματα από τα memberships
            building_ids = memberships.values_list('building_id', flat=True)
            apartments = Apartment.objects.filter(
                building_id__in=building_ids
            ).filter(
                models.Q(owner_user=user) | models.Q(tenant_user=user)
            ).select_related('building')

            # Αν δεν βρέθηκε με owner/tenant, πάρε όλα τα διαμερίσματα του κτιρίου
            # (για περιπτώσεις που ο χρήστης δεν έχει συνδεθεί με συγκεκριμένο διαμέρισμα)
            if not apartments.exists():
                # Επέστρεψε το πρώτο κτίριο του membership χωρίς διαμέρισμα
                first_membership = memberships.first()
                return Response({
                    'has_apartment': False,
                    'building': {
                        'id': first_membership.building.id,
                        'name': first_membership.building.name,
                        'address': first_membership.building.address,
                    },
                    'message': 'Δεν έχετε συνδεθεί με συγκεκριμένο διαμέρισμα. Επικοινωνήστε με τον διαχειριστή.',
                    'apartments': []
                })

        # Επεξεργασία δεδομένων για κάθε διαμέρισμα
        apartments_data = []

        for apartment in apartments:
            building = apartment.building

            # Λήψη οικονομικών δεδομένων
            service = FinancialDashboardService(building_id=building.id)

            # Πληρωμές του διαμερίσματος
            payments = Payment.objects.filter(
                apartment=apartment
            ).order_by('-date')[:months_back * 3]  # Περισσότερες πληρωμές για ιστορικό

            # Κινήσεις (expenses) του διαμερίσματος
            today = date.today()
            start_date = today - timedelta(days=30 * months_back)

            transactions = Transaction.objects.filter(
                apartment=apartment,
                date__gte=start_date
            ).order_by('-date')

            # Δαπάνες (expenses) που αφορούν το διαμέρισμα
            expense_shares = ApartmentShare.objects.filter(
                apartment=apartment,
                period__start_date__gte=start_date
            ).select_related('period').order_by('-period__start_date')

            # Χρεώσεις από transactions (project installments, expenses κλπ)
            # Αυτά περιλαμβάνουν δόσεις έργων που δεν έχουν ApartmentShare
            charge_transactions = Transaction.objects.filter(
                apartment=apartment,
                date__gte=start_date,
                type__in=['expense_created', 'installment_charge', 'charge', 'expense']
            ).order_by('-date')

            # Υπολογισμός τρέχουσας οφειλής
            current_balance = float(apartment.current_balance or 0)

            # Σύνοψη - υπολογισμός χρεώσεων από transactions (πιο ακριβές)
            total_paid = sum(float(p.amount) for p in payments)
            # Υπολογισμός total_expenses από transactions αντί για ApartmentShare
            total_expenses_from_transactions = sum(
                float(t.amount) for t in charge_transactions
            )
            # Συνδυάζουμε: ApartmentShare + transactions που δεν έχουν αντίστοιχο ApartmentShare
            total_expenses_from_shares = sum(float(es.total_amount) for es in expense_shares)
            total_expenses = max(total_expenses_from_transactions, total_expenses_from_shares)

            apartment_data = {
                'id': apartment.id,
                'number': apartment.number,
                'floor': apartment.floor,
                'owner_name': apartment.owner_name,
                'owner_email': apartment.owner_email,
                'tenant_name': apartment.tenant_name,
                'tenant_email': apartment.tenant_email,
                'is_rented': apartment.is_rented,
                'square_meters': apartment.square_meters,
                'participation_mills': apartment.participation_mills,
                'current_balance': current_balance,
                'building': {
                    'id': building.id,
                    'name': building.name,
                    'address': building.address,
                },
                'payment_history': [
                    {
                        'id': p.id,
                        'date': p.date.isoformat() if p.date else None,
                        'amount': float(p.amount),
                        'payment_method': p.method,
                        'notes': p.notes,
                        'receipt_number': p.reference_number,
                    }
                    for p in payments
                ],
                'expense_history': [
                    # Χρεώσεις από transactions (project installments, expenses κλπ)
                    *[
                        {
                            'id': t.id,
                            'date': t.date.isoformat() if t.date else None,
                            'title': t.description or 'Χρέωση',
                            'category': 'project' if 'Δόση' in (t.description or '') or 'Προκαταβολή' in (t.description or '') else 'expense',
                            'total_amount': float(t.amount),
                            'your_share': float(t.amount),
                            'payer_responsibility': 'owner',
                        }
                        for t in charge_transactions
                    ],
                    # Χρεώσεις από ApartmentShare (κοινόχρηστα)
                    *[
                        {
                            'id': es.id + 100000,  # Offset για αποφυγή σύγκρουσης ID
                            'date': es.period.start_date.isoformat() if es.period.start_date else None,
                            'title': es.period.period_name,
                            'category': 'common_expenses',
                            'total_amount': float(es.total_amount),
                            'your_share': float(es.total_amount),
                            'payer_responsibility': 'owner',
                        }
                        for es in expense_shares
                    ],
                ],
                'transaction_history': [
                    {
                        'id': t.id,
                        'date': t.date.isoformat() if t.date else None,
                        'type': t.type,
                        'amount': float(t.amount),
                        'description': t.description,
                        'balance_after': float(t.balance_after) if t.balance_after else None,
                    }
                    for t in transactions
                ],
                'summary': {
                    'current_balance': current_balance,
                    'total_paid': total_paid,
                    'total_expenses': total_expenses,
                    'status': 'Οφειλή' if current_balance > 0 else ('Πιστωτικό' if current_balance < 0 else 'Εξοφλημένο'),
                }
            }

            apartments_data.append(apartment_data)

        return Response({
            'has_apartment': True,
            'apartments': apartments_data,
            'apartments_count': len(apartments_data),
            'user': {
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            }
        })

    except Exception as e:
        logger.error(f"[my_apartment_data] Error: {e}", exc_info=True)
        return Response({
            'error': f'Σφάλμα κατά την ανάκτηση δεδομένων: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Admin Database Cleanup - Ολοκληρωμένη διαχείριση εκκαθάρισης
# =============================================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def database_cleanup(request):
    """
    🔧 Admin Database Cleanup API

    Ολοκληρωμένο endpoint για εκκαθάριση βάσης δεδομένων με:
    - Preview mode (dry-run)
    - Multiple cleanup operations
    - Detailed logging
    - Balance recalculation

    GET: Scan database and preview cleanup operations
    POST: Execute cleanup with confirmation

    Request Body (POST):
        - operation: string - Τύπος cleanup ('orphan_transactions', 'reset_balances', 'clean_test_data')
        - confirm: string - Πρέπει να είναι 'CONFIRM_DELETE' για εκτέλεση
        - search_term: string - Optional, για orphan_transactions
        - building_id: int - Optional, φιλτράρισμα ανά κτίριο

    Permissions:
        - Μόνο superuser ή admin
    """
    import logging
    from decimal import Decimal
    from django.db import transaction as db_transaction
    from .balance_service import BalanceCalculationService

    logger = logging.getLogger(__name__)
    user = request.user

    # ============================================
    # SECURITY CHECK: Μόνο admin
    # ============================================
    if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin'):
        return Response({
            'error': 'Δεν έχετε δικαιώματα πρόσβασης. Απαιτείται ρόλος Admin.',
            'required_role': 'admin'
        }, status=status.HTTP_403_FORBIDDEN)

    # ============================================
    # GET: Scan and Preview
    # ============================================
    if request.method == 'GET':
        try:
            scan_results = _scan_database_for_cleanup()
            return Response({
                'status': 'preview',
                'message': '⚠️ Σάρωση βάσης δεδομένων για εκκαθάριση',
                'scan_results': scan_results,
                'warnings': [
                    '🔴 ΠΡΟΣΟΧΗ: Η εκκαθάριση είναι ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ!',
                    '💾 Συνιστάται να κάνετε BACKUP πριν συνεχίσετε',
                    '⏱️ Η διαδικασία μπορεί να διαρκέσει αρκετά λεπτά'
                ],
                'available_operations': [
                    {
                        'id': 'orphan_transactions',
                        'name': 'Ορφανά Transactions',
                        'description': 'Διαγραφή transactions από διαγραμμένα έργα/δαπάνες',
                        'danger_level': 'high',
                        'affects': 'Υπόλοιπα διαμερισμάτων'
                    },
                    {
                        'id': 'future_expenses',
                        'name': 'Μελλοντικές Δαπάνες',
                        'description': 'Διαγραφή δαπανών με ημερομηνία μετά το τέλος του τρέχοντος μήνα (management fees, αποθεματικό κλπ)',
                        'danger_level': 'medium',
                        'affects': 'Αποθεματικό, υπολογισμοί'
                    },
                    {
                        'id': 'recalculate_balances',
                        'name': 'Επανυπολογισμός Υπολοίπων',
                        'description': 'Επανυπολογισμός όλων των υπολοίπων διαμερισμάτων',
                        'danger_level': 'medium',
                        'affects': 'Υπόλοιπα διαμερισμάτων'
                    },
                    {
                        'id': 'clean_test_data',
                        'name': 'Καθαρισμός Test Data',
                        'description': 'Διαγραφή demo/test δεδομένων',
                        'danger_level': 'critical',
                        'affects': 'Πολλαπλά δεδομένα'
                    }
                ]
            })
        except Exception as e:
            logger.error(f"[CLEANUP] Scan error: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'error': f'Σφάλμα κατά τη σάρωση: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ============================================
    # POST: Execute Cleanup
    # ============================================
    operation = request.data.get('operation')
    confirm = request.data.get('confirm')
    search_term = request.data.get('search_term', '')
    building_id = request.data.get('building_id')

    # Validation
    if not operation:
        return Response({
            'status': 'error',
            'error': 'Πρέπει να επιλέξετε operation'
        }, status=status.HTTP_400_BAD_REQUEST)

    if confirm != 'CONFIRM_DELETE':
        return Response({
            'status': 'error',
            'error': 'Για να εκτελεστεί η εκκαθάριση, πρέπει να στείλετε confirm: "CONFIRM_DELETE"',
            'required_confirm': 'CONFIRM_DELETE'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        logger.warning(f"[CLEANUP] User {user.email} executing {operation}")

        if operation == 'orphan_transactions':
            result = _cleanup_orphan_transactions(user, search_term, building_id)
        elif operation == 'future_expenses':
            result = _cleanup_future_expenses(user, building_id)
        elif operation == 'recalculate_balances':
            result = _recalculate_all_balances(user, building_id)
        elif operation == 'clean_test_data':
            result = _clean_test_data(user)
        else:
            return Response({
                'status': 'error',
                'error': f'Άγνωστο operation: {operation}'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)

    except Exception as e:
        logger.error(f"[CLEANUP] Execution error: {e}", exc_info=True)
        return Response({
            'status': 'error',
            'error': f'Σφάλμα κατά την εκτέλεση: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _scan_database_for_cleanup():
    """Σαρώνει τη βάση για θέματα που χρειάζονται cleanup"""
    from decimal import Decimal
    from datetime import date
    from .utils.date_helpers import get_next_month_start

    today = date.today()

    results = {
        'orphan_transactions': {
            'count': 0,
            'total_amount': 0,
            'items': []
        },
        'future_expenses': {
            'count': 0,
            'total_amount': 0,
            'items': []
        },
        'balance_mismatches': {
            'count': 0,
            'items': []
        },
        'test_data': {
            'count': 0,
            'items': []
        }
    }

    # 1. Scan for orphan transactions (from deleted projects)
    # Look for transactions that mention project-related terms but have no linked project
    orphan_keywords = ['Στεγανοποίηση', 'Δόση', 'Προκαταβολή', 'Έργο']

    for keyword in orphan_keywords:
        txs = Transaction.objects.filter(description__icontains=keyword)
        for t in txs[:10]:  # Limit preview
            results['orphan_transactions']['items'].append({
                'id': t.id,
                'description': t.description[:80],
                'amount': float(t.amount),
                'date': t.date.isoformat() if t.date else None,
                'apartment': t.apartment_number,
                'building': t.building.name if t.building else None
            })
        results['orphan_transactions']['count'] += txs.count()
        results['orphan_transactions']['total_amount'] += float(
            txs.aggregate(total=models.Sum('amount'))['total'] or 0
        )

    # 2. Scan for future expenses (management fees, reserve fund etc. with future dates)
    # 📝 ΠΡΟΣΘΗΚΗ 2025-12-05: Σάρωση μελλοντικών δαπανών που προκαλούν σύγχυση
    next_month_start = get_next_month_start(today)
    future_expenses = Expense.objects.filter(date__gte=next_month_start).select_related('building')

    for exp in future_expenses[:15]:  # Limit preview
        results['future_expenses']['items'].append({
            'id': exp.id,
            'title': exp.title[:50] if exp.title else f'{exp.category}',
            'amount': float(exp.amount),
            'date': exp.date.isoformat() if exp.date else None,
            'category': exp.category,
            'building': exp.building.name if exp.building else None
        })

    results['future_expenses']['count'] = future_expenses.count()
    results['future_expenses']['total_amount'] = float(
        future_expenses.aggregate(total=models.Sum('amount'))['total'] or 0
    )

    # 3. Scan for balance mismatches
    # 📝 ΔΙΟΡΘΩΣΗ 2025-12-05: Σύγκριση stored vs calculated balance
    from .balance_service import BalanceCalculationService

    apartments = Apartment.objects.select_related('building').all()
    for apt in apartments:
        stored_balance = float(apt.current_balance or 0)

        # Υπολογισμός πραγματικού υπολοίπου από transactions
        calculated_balance = BalanceCalculationService.calculate_current_balance(apt)
        calculated_balance_float = float(calculated_balance or 0)

        # Έλεγχος απόκλισης (>1 cent διαφορά)
        difference = abs(stored_balance - calculated_balance_float)
        if difference > 0.01:
            results['balance_mismatches']['items'].append({
                'apartment_id': apt.id,
                'number': apt.number,
                'building': apt.building.name if apt.building else None,
                'stored_balance': stored_balance,
                'calculated_balance': calculated_balance_float,
                'difference': round(difference, 2)
            })
            results['balance_mismatches']['count'] += 1

    # 4. Scan for test data patterns
    test_patterns = ['Demo', 'Test', 'Sample']
    # This would need to be customized based on actual test data patterns

    return results


def _cleanup_orphan_transactions(user, search_term, building_id):
    """Διαγραφή ορφανών transactions"""
    import logging
    from decimal import Decimal
    from .balance_service import BalanceCalculationService

    logger = logging.getLogger(__name__)

    # Build query
    if search_term:
        orphan_txs = Transaction.objects.filter(description__icontains=search_term)
    else:
        # Default: look for project-related orphans
        orphan_txs = Transaction.objects.filter(
            models.Q(description__icontains='Στεγανοποίηση') |
            models.Q(description__icontains='Δόση') |
            models.Q(description__icontains='Προκαταβολή')
        )

    if building_id:
        orphan_txs = orphan_txs.filter(building_id=building_id)

    # Collect affected apartments
    affected_apartments = set()
    total_amount = Decimal('0.00')

    for t in orphan_txs:
        total_amount += t.amount
        if t.apartment:
            affected_apartments.add(t.apartment)

    deleted_count = orphan_txs.count()

    if deleted_count == 0:
        return {
            'status': 'success',
            'message': 'Δεν βρέθηκαν ορφανά transactions',
            'deleted_count': 0
        }

    # Delete
    orphan_txs.delete()
    logger.warning(f"[CLEANUP] Deleted {deleted_count} orphan transactions by {user.email}")

    # Recalculate balances
    balance_updates = []
    for apt in affected_apartments:
        old_balance = float(apt.current_balance or 0)
        BalanceCalculationService.update_apartment_balance(apt, use_locking=False)
        apt.refresh_from_db()
        new_balance = float(apt.current_balance or 0)

        balance_updates.append({
            'apartment_number': apt.number,
            'old_balance': old_balance,
            'new_balance': new_balance
        })

    return {
        'status': 'success',
        'operation': 'orphan_transactions',
        'message': f'✅ Διαγράφηκαν {deleted_count} ορφανά transactions',
        'deleted_count': deleted_count,
        'total_amount_removed': float(total_amount),
        'balance_updates': balance_updates,
        'executed_by': user.email
    }


def _cleanup_future_expenses(user, building_id=None):
    """
    Διαγραφή δαπανών με ημερομηνία μετά το τέλος του τρέχοντος μήνα

    📝 ΠΡΟΣΘΗΚΗ 2025-12-05: Οι μελλοντικές δαπάνες (management fees, αποθεματικό κλπ)
    που δημιουργήθηκαν αυτόματα προκαλούσαν σύγχυση στον υπολογισμό του αποθεματικού
    """
    import logging
    from datetime import date
    from django.db.models import Sum
    from .utils.date_helpers import get_next_month_start

    logger = logging.getLogger(__name__)
    today = date.today()
    next_month_start = get_next_month_start(today)

    # Build query for future expenses
    future_expenses = Expense.objects.filter(date__gte=next_month_start)

    if building_id:
        future_expenses = future_expenses.filter(building_id=building_id)

    # Get stats before deletion
    stats_by_category = future_expenses.values('category').annotate(
        count=models.Count('id'),
        total=Sum('amount')
    )

    deleted_count = future_expenses.count()
    total_amount = float(future_expenses.aggregate(total=Sum('amount'))['total'] or 0)

    if deleted_count == 0:
        return {
            'status': 'success',
            'message': '✅ Δεν βρέθηκαν μελλοντικές δαπάνες για διαγραφή',
            'deleted_count': 0
        }

    # Log categories
    category_breakdown = []
    for stat in stats_by_category:
        category_breakdown.append({
            'category': stat['category'],
            'count': stat['count'],
            'amount': float(stat['total'] or 0)
        })
        logger.info(f"[CLEANUP] Category {stat['category']}: {stat['count']} expenses, €{stat['total']}")

    # Delete
    future_expenses.delete()
    logger.warning(
        f"[CLEANUP] Deleted {deleted_count} future expenses "
        f"(total €{total_amount:.2f}) by {user.email}"
    )

    return {
        'status': 'success',
        'operation': 'future_expenses',
        'message': f'✅ Διαγράφηκαν {deleted_count} μελλοντικές δαπάνες',
        'deleted_count': deleted_count,
        'total_amount_removed': total_amount,
        'category_breakdown': category_breakdown,
        'executed_by': user.email
    }


def _recalculate_all_balances(user, building_id):
    """Επανυπολογισμός όλων των υπολοίπων"""
    import logging
    from .balance_service import BalanceCalculationService

    logger = logging.getLogger(__name__)

    apartments = Apartment.objects.select_related('building').all()
    if building_id:
        apartments = apartments.filter(building_id=building_id)

    updates = []
    for apt in apartments:
        old_balance = float(apt.current_balance or 0)
        BalanceCalculationService.update_apartment_balance(apt, use_locking=False)
        apt.refresh_from_db()
        new_balance = float(apt.current_balance or 0)

        if abs(old_balance - new_balance) > 0.01:
            updates.append({
                'apartment_number': apt.number,
                'building': apt.building.name if apt.building else None,
                'old_balance': old_balance,
                'new_balance': new_balance,
                'difference': new_balance - old_balance
            })

    logger.info(f"[CLEANUP] Recalculated {apartments.count()} apartment balances by {user.email}")

    return {
        'status': 'success',
        'operation': 'recalculate_balances',
        'message': f'✅ Επανυπολογίστηκαν {apartments.count()} υπόλοιπα διαμερισμάτων',
        'total_apartments': apartments.count(),
        'changed_balances': len(updates),
        'updates': updates,
        'executed_by': user.email
    }


def _clean_test_data(user):
    """Καθαρισμός test data - ΠΡΟΣΟΧΗ: Πολύ επικίνδυνο!"""
    import logging

    logger = logging.getLogger(__name__)
    logger.critical(f"[CLEANUP] clean_test_data requested by {user.email} - NOT IMPLEMENTED for safety")

    return {
        'status': 'warning',
        'operation': 'clean_test_data',
        'message': '⚠️ Αυτή η λειτουργία δεν είναι διαθέσιμη για λόγους ασφαλείας',
        'reason': 'Για πλήρη εκκαθάριση test data, επικοινωνήστε με τον διαχειριστή συστήματος'
    }


# Legacy endpoint for backwards compatibility
@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def cleanup_orphan_transactions(request):
    """
    Legacy endpoint - redirects to database_cleanup
    """
    if request.method == 'GET':
        # Redirect to new endpoint
        return Response({
            'status': 'redirect',
            'message': 'Χρησιμοποιήστε το νέο endpoint /api/financial/admin/database-cleanup/',
            'new_endpoint': '/api/financial/admin/database-cleanup/'
        })

    # For POST/DELETE, use legacy behavior
    search_term = request.query_params.get('search', request.data.get('search_term', 'Στεγανοποίηση'))
    building_id = request.query_params.get('building_id', request.data.get('building_id'))

    return _cleanup_orphan_transactions(request.user, search_term, building_id)


class ScanInvoiceView(APIView):
    """
    API endpoint για ανάλυση παραστατικών με Google Gemini AI.
    Αποδέχεται εικόνα ή PDF παραστατικού και επιστρέφει εξαγόμενα δεδομένα.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Ανάλυση παραστατικού από εικόνα.

        Expected input:
        - file: Image file (multipart/form-data)

        Returns:
        {
            "amount": decimal or null,
            "date": "YYYY-MM-DD" or null,
            "supplier": string or null,
            "category": string or null,
            "description": string or null
        }
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Validate file presence
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'Δεν βρέθηκε αρχείο. Παρακαλώ επιλέξτε εικόνα ή PDF παραστατικού.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            file = request.FILES['file']

            # Validate file type (images or PDF)
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
            if file.content_type not in allowed_types:
                return Response(
                    {'error': f'Μη υποστηριζόμενος τύπος αρχείου: {file.content_type}. Επιτρέπονται: {", ".join(allowed_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file size (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if file.size > max_size:
                return Response(
                    {'error': f'Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: {max_size // (1024*1024)}MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse invoice using InvoiceParser
            try:
                parser = InvoiceParser()
                parsed_data = parser.parse_invoice(file)

                # Best-effort: suggest building based on extracted service address fields.
                try:
                    parsed_data["building_suggestion"] = suggest_building_from_invoice(parsed_data)
                except Exception as suggestion_error:
                    logger.warning(
                        f"Building suggestion failed (non-fatal): {suggestion_error}",
                        exc_info=True,
                    )
                    parsed_data["building_suggestion"] = {
                        "status": "unknown",
                        "confidence": None,
                        "building_id": None,
                        "building_name": None,
                        "candidates": [],
                    }

                return Response(parsed_data, status=status.HTTP_200_OK)

            except ValueError as e:
                # API key missing or configuration error
                logger.error(f"InvoiceParser configuration error: {str(e)}")
                return Response(
                    {'error': 'Σφάλμα ρύθμισης συστήματος ανάλυσης. Παρακαλώ επικοινωνήστε με τον διαχειριστή.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except Exception as e:
                # AI parsing failed
                logger.error(f"Invoice parsing failed: {str(e)}", exc_info=True)
                return Response(
                    {'error': f'Αποτυχία ανάλυσης παραστατικού: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Unexpected error in ScanInvoiceView: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Απρόσμενο σφάλμα κατά την επεξεργασία του αιτήματος.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
