from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder
from financial.models import Expense
from .permissions import MaintenancePermission
from .serializers import (
    ContractorSerializer, ServiceReceiptSerializer, ScheduledMaintenanceSerializer,
    MaintenanceTicketSerializer, WorkOrderSerializer, PublicScheduledMaintenanceSerializer
)


class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.prefetch_related('receipts', 'scheduled_work').all()
    serializer_class = ContractorSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['service_type', 'status', 'availability']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'rating', 'reliability_score', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def receipts(self, request, pk=None):
        """Λήψη αποδείξεων συνεργείου"""
        contractor = self.get_object()
        receipts = contractor.receipts.select_related('building').all()
        serializer = ServiceReceiptSerializer(receipts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def scheduled_work(self, request, pk=None):
        """Λήψη προγραμματισμένων έργων συνεργείου"""
        contractor = self.get_object()
        scheduled_work = contractor.scheduled_work.select_related('building').all()
        serializer = ScheduledMaintenanceSerializer(scheduled_work, many=True)
        return Response(serializer.data)


class ServiceReceiptViewSet(viewsets.ModelViewSet):
    queryset = ServiceReceipt.objects.select_related('contractor', 'building').all()
    serializer_class = ServiceReceiptSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contractor', 'building', 'payment_status']
    search_fields = ['description', 'invoice_number', 'contractor__name']
    ordering_fields = ['service_date', 'amount', 'created_at']
    ordering = ['-service_date']

    def perform_create(self, serializer):
        receipt = serializer.save(created_by=self.request.user)
        # Auto-link to a monthly expense
        try:
            # Determine category from contractor service_type
            category_map = {
                'cleaning': 'cleaning',
                'elevator': 'elevator_maintenance',
                'heating': 'heating_maintenance',
                'electrical': 'electrical_maintenance',
                'plumbing': 'plumbing_maintenance',
                'security': 'security',
                'landscaping': 'garden_maintenance',
                'maintenance': 'building_maintenance',
                'repair': 'emergency_repair',
                'technical': 'building_maintenance',
            }
            contractor_type = receipt.contractor.service_type if receipt.contractor else 'maintenance'
            category = category_map.get(contractor_type, 'building_maintenance')

            # Use first day of month as expense date
            expense_date = receipt.service_date.replace(day=1)
            amount = receipt.amount

            # Find existing monthly expense for same building, category and month
            existing = Expense.objects.filter(
                building=receipt.building,
                category=category,
                date__year=expense_date.year,
                date__month=expense_date.month,
                expense_type='regular',
            ).first()

            if existing:
                # Aggregate: increase amount and save
                existing.amount = (existing.amount or 0) + amount
                existing.save()
                receipt.linked_expense = existing
                receipt.save(update_fields=['linked_expense'])
            else:
                # Create new expense and link
                new_expense = Expense.objects.create(
                    building=receipt.building,
                    title=f"Δαπάνη: {receipt.contractor.name if receipt.contractor else 'Συνεργείο'} - {receipt.description[:40]}",
                    amount=amount,
                    date=expense_date,
                    category=category,
                    distribution_type='by_participation_mills',
                    notes=f"Συνδεδεμένη με απόδειξη ID {receipt.id}",
                )
                receipt.linked_expense = new_expense
                receipt.save(update_fields=['linked_expense'])
        except Exception as e:
            # Fail silently for linking, do not block receipt creation
            print(f"[ServiceReceiptViewSet] Auto-link expense failed: {e}")

    def _category_for_receipt(self, receipt: ServiceReceipt) -> str:
        category_map = {
            'cleaning': 'cleaning',
            'elevator': 'elevator_maintenance',
            'heating': 'heating_maintenance',
            'electrical': 'electrical_maintenance',
            'plumbing': 'plumbing_maintenance',
            'security': 'security',
            'landscaping': 'garden_maintenance',
            'maintenance': 'building_maintenance',
            'repair': 'emergency_repair',
            'technical': 'building_maintenance',
        }
        contractor_type = receipt.contractor.service_type if receipt.contractor else 'maintenance'
        return category_map.get(contractor_type, 'building_maintenance')

    def _get_or_create_monthly_expense(self, receipt: ServiceReceipt) -> Expense:
        category = self._category_for_receipt(receipt)
        expense_date = receipt.service_date.replace(day=1)
        exp = Expense.objects.filter(
            building=receipt.building,
            category=category,
            date__year=expense_date.year,
            date__month=expense_date.month,
            expense_type='regular',
        ).first()
        if exp:
            return exp
        title = f"Δαπάνη: {(receipt.contractor.name if receipt.contractor else 'Συνεργείο')} - {str(receipt.description)[:40]}"
        return Expense.objects.create(
            building=receipt.building,
            title=title,
            amount=receipt.amount,
            date=expense_date,
            category=category,
            distribution_type='by_participation_mills',
            notes=f"Συνδεδεμένη με απόδειξη ID {receipt.id}",
        )

    def _refresh_expense_amount(self, expense: Expense):
        # Sum amounts of all receipts linked to this expense
        total = ServiceReceipt.objects.filter(linked_expense=expense).aggregate(models.Sum('amount'))['amount__sum'] or 0
        if total and total > 0:
            if expense.amount != total:
                expense.amount = total
                expense.save(update_fields=['amount'])
        else:
            # No receipts reference this expense anymore; safe to delete
            try:
                expense.delete()
            except Exception as e:
                print(f"[ServiceReceiptViewSet] Failed to delete empty expense {expense.id}: {e}")

    def perform_update(self, serializer):
        # Capture old mapping before save
        old_instance: ServiceReceipt = serializer.instance
        old_expense = old_instance.linked_expense
        old_building = old_instance.building
        old_date = old_instance.service_date
        old_contractor = old_instance.contractor
        old_amount = old_instance.amount

        receipt = serializer.save()

        try:
            # Determine target expense based on new receipt data
            target_expense = self._get_or_create_monthly_expense(receipt)
            if receipt.linked_expense_id != target_expense.id:
                receipt.linked_expense = target_expense
                receipt.save(update_fields=['linked_expense'])

            # Refresh amounts for affected expenses
            # If mapping changed (building/month/category) or amount changed, refresh both old and new
            mapping_changed = (
                old_building_id := getattr(old_building, 'id', None)
            ) != getattr(receipt.building, 'id', None) or (
                (old_date or None) != (receipt.service_date or None)
            ) or (
                (old_contractor.service_type if old_contractor else None) != (receipt.contractor.service_type if receipt.contractor else None)
            )
            amount_changed = (old_amount != receipt.amount)

            if mapping_changed and old_expense:
                self._refresh_expense_amount(old_expense)

            # Always refresh current target to reflect any amount changes
            self._refresh_expense_amount(target_expense)
        except Exception as e:
            print(f"[ServiceReceiptViewSet] perform_update linking failed: {e}")

    def perform_destroy(self, instance):
        try:
            old_expense = instance.linked_expense
            instance.delete()
            if old_expense:
                self._refresh_expense_amount(old_expense)
        except Exception as e:
            print(f"[ServiceReceiptViewSet] perform_destroy failed: {e}")


class ScheduledMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = ScheduledMaintenance.objects.select_related('building', 'contractor').all()
    serializer_class = ScheduledMaintenanceSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'contractor', 'priority', 'status']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['scheduled_date', 'priority', 'created_at']
    ordering = ['scheduled_date', 'priority']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Ολοκλήρωση προγραμματισμένης συντήρησης"""
        maintenance = self.get_object()
        maintenance.status = 'completed'
        maintenance.save()
        serializer = self.get_serializer(maintenance)
        return Response(serializer.data)


class MaintenanceTicketViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceTicket.objects.select_related('building', 'apartment', 'contractor').all()
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'apartment', 'category', 'priority', 'status', 'contractor']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'sla_due_at', 'priority']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = 'closed'
        ticket.closed_at = timezone.now()
        ticket.save()
        return Response(self.get_serializer(ticket).data)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related('ticket', 'contractor', 'assigned_to').all()
    serializer_class = WorkOrderSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'contractor', 'assigned_to', 'ticket']
    search_fields = ['notes', 'location', 'ticket__title']
    ordering_fields = ['scheduled_at', 'created_at']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PublicScheduledMaintenanceListView(generics.ListAPIView):
    """Public, read-only list of scheduled maintenance tasks with limited fields."""
    permission_classes = [AllowAny]
    serializer_class = PublicScheduledMaintenanceSerializer
    queryset = ScheduledMaintenance.objects.select_related('building', 'contractor').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'priority', 'status']
    ordering_fields = ['scheduled_date', 'priority']
    ordering = ['scheduled_date']


class PublicMaintenanceCountersView(generics.GenericAPIView):
    """Public counters (read-only) for kiosk."""
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        building = request.query_params.get('building')
        try:
            building_id = int(building) if building is not None else None
        except ValueError:
            building_id = None

        qs_sched = ScheduledMaintenance.objects.all()
        qs_receipts = ServiceReceipt.objects.all()
        qs_contractors = Contractor.objects.all()

        if building_id:
            qs_sched = qs_sched.filter(building_id=building_id)
            qs_receipts = qs_receipts.filter(building_id=building_id)
            # No direct FK to building on Contractor; count all as public metric

        data = {
            'scheduled_total': qs_sched.count(),
            'urgent_total': qs_sched.filter(priority='urgent').count(),
            'pending_receipts': qs_receipts.filter(payment_status='pending').count(),
            'active_contractors': qs_contractors.filter(status='active').count(),
        }
        return Response(data)
