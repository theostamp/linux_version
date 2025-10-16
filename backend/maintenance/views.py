from rest_framework import viewsets, generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import models
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder, PaymentSchedule, PaymentInstallment, PaymentReceipt
from financial.models import Expense
from .permissions import MaintenancePermission
from core.permissions import IsManager, IsResident, IsRelatedToBuilding
from .serializers import (
    ContractorSerializer, ServiceReceiptSerializer, ScheduledMaintenanceSerializer,
    MaintenanceTicketSerializer, WorkOrderSerializer, PublicScheduledMaintenanceSerializer,
    PaymentScheduleSerializer, PaymentInstallmentSerializer, PaymentReceiptSerializer,
    PaymentReceiptCreateSerializer, PaymentReceiptDetailSerializer, ScheduledMaintenanceWithPaymentsSerializer
)
from io import BytesIO
from django.http import HttpResponse


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

    def get_serializer_class(self):
        # Include payment schedule and aggregates on retrieve to power UI tabs
        if self.action in ['retrieve', 'list']:
            return ScheduledMaintenanceWithPaymentsSerializer
        return super().get_serializer_class()
    
    def perform_create(self, serializer):
        """Handle creation with payment configuration"""
        from maintenance.models import PaymentSchedule
        from django.utils import timezone
        
        # Set created_by from request user
        serializer.save(created_by=self.request.user)
        maintenance = serializer.instance
        
        # Handle payment configuration
        payment_config = self.request.data.get('payment_config')
        if payment_config and payment_config.get('enabled'):
            PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance,
                payment_type=payment_config.get('payment_type', 'lump_sum'),
                total_amount=payment_config.get('total_amount', maintenance.estimated_cost or 0),
                advance_percentage=payment_config.get('advance_percentage', 0),
                installment_count=payment_config.get('installment_count', 1),
                installment_frequency=payment_config.get('installment_frequency', 'monthly'),
                periodic_amount=payment_config.get('periodic_amount', 0),
                periodic_frequency=payment_config.get('periodic_frequency', 'monthly'),
                start_date=payment_config.get('start_date') or timezone.now().date(),
                notes=payment_config.get('notes', ''),
                created_by=self.request.user,
            )
        
        # Auto-create linked expense
        try:
            maintenance.create_or_update_expense()
        except Exception as e:
            # Log error but don't fail the creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create expense for maintenance {maintenance.id}: {e}")
    
    def perform_update(self, serializer):
        """Handle update with payment configuration"""
        from maintenance.models import PaymentSchedule
        from django.utils import timezone
        
        serializer.save()
        maintenance = serializer.instance
        
        # Handle payment configuration
        payment_config = self.request.data.get('payment_config')
        if payment_config:
            if payment_config.get('enabled'):
                # Create or update payment schedule
                schedule, created = PaymentSchedule.objects.get_or_create(
                    scheduled_maintenance=maintenance,
                    defaults={
                        'payment_type': payment_config.get('payment_type', 'lump_sum'),
                        'total_amount': payment_config.get('total_amount', maintenance.estimated_cost or 0),
                        'advance_percentage': payment_config.get('advance_percentage', 0),
                        'installment_count': payment_config.get('installment_count', 1),
                        'installment_frequency': payment_config.get('installment_frequency', 'monthly'),
                        'periodic_amount': payment_config.get('periodic_amount', 0),
                        'periodic_frequency': payment_config.get('periodic_frequency', 'monthly'),
                        'start_date': payment_config.get('start_date') or timezone.now().date(),
                        'notes': payment_config.get('notes', ''),
                        'created_by': self.request.user,
                    }
                )
                
                if not created:
                    # Update existing schedule
                    schedule.payment_type = payment_config.get('payment_type', schedule.payment_type)
                    schedule.total_amount = payment_config.get('total_amount', schedule.total_amount)
                    schedule.advance_percentage = payment_config.get('advance_percentage', schedule.advance_percentage)
                    schedule.installment_count = payment_config.get('installment_count', schedule.installment_count)
                    schedule.installment_frequency = payment_config.get('installment_frequency', schedule.installment_frequency)
                    schedule.periodic_amount = payment_config.get('periodic_amount', schedule.periodic_amount)
                    schedule.periodic_frequency = payment_config.get('periodic_frequency', schedule.periodic_frequency)
                    if payment_config.get('start_date'):
                        schedule.start_date = payment_config.get('start_date')
                    schedule.notes = payment_config.get('notes', schedule.notes)
                    schedule.save()
            else:
                # Delete payment schedule if disabled
                PaymentSchedule.objects.filter(scheduled_maintenance=maintenance).delete()
        
        # Update linked expense
        try:
            maintenance.create_or_update_expense()
        except Exception as e:
            # Log error but don't fail the update
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to update expense for maintenance {maintenance.id}: {e}")
    
    def perform_destroy(self, instance):
        """Handle deletion with linked expense cleanup"""
        try:
            # Delete linked expense before deleting maintenance
            instance.delete_linked_expense()
        except Exception as e:
            # Log error but don't fail the deletion
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to delete linked expense for maintenance {instance.id}: {e}")
        
        # Proceed with normal deletion
        super().perform_destroy(instance)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Ολοκλήρωση προγραμματισμένης συντήρησης"""
        maintenance = self.get_object()
        maintenance.status = 'completed'
        maintenance.save()
        serializer = self.get_serializer(maintenance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_payment_schedule(self, request, pk=None):
        """Δημιουργία χρονοδιαγράμματος πληρωμών για έργο"""
        maintenance = self.get_object()
        data = request.data or {}
        try:
            # Helper function to parse date strings
            def parse_date(date_input):
                from datetime import datetime
                if isinstance(date_input, str):
                    return datetime.strptime(date_input, '%Y-%m-%d').date()
                return date_input
            
            payment_schedule = PaymentSchedule.objects.create(
                scheduled_maintenance=maintenance,
                payment_type=data.get('payment_type', 'lump_sum'),
                total_amount=data.get('total_amount'),
                advance_percentage=data.get('advance_percentage'),
                installment_count=data.get('installment_count'),
                installment_frequency=data.get('installment_frequency'),
                periodic_frequency=data.get('periodic_frequency'),
                periodic_amount=data.get('periodic_amount'),
                start_date=data.get('start_date') or maintenance.scheduled_date,
                notes=data.get('notes', ''),
                created_by=request.user,
            )

            # Auto-generate installments (simple logic mirroring PaymentScheduleViewSet)
            installments_created = []
            if payment_schedule.payment_type == 'lump_sum':
                installments_created.append(PaymentInstallment.objects.create(
                    payment_schedule=payment_schedule,
                    installment_type='full',
                    installment_number=1,
                    amount=payment_schedule.total_amount,
                    due_date=parse_date(payment_schedule.start_date),
                    description=f"Εφάπαξ πληρωμή - {maintenance.title}"
                ))
            elif payment_schedule.payment_type == 'advance_installments':
                # Calculate advance amount manually
                from decimal import Decimal
                advance_percentage = payment_schedule.advance_percentage or Decimal('0')
                total = payment_schedule.total_amount or Decimal('0')
                advance_amount = (total * advance_percentage) / Decimal('100')
                
                installments_created.append(PaymentInstallment.objects.create(
                    payment_schedule=payment_schedule,
                    installment_type='advance',
                    installment_number=0,
                    amount=advance_amount,
                    due_date=parse_date(payment_schedule.start_date),
                    description=f"Προκαταβολή - {maintenance.title}"
                ))
                # Installments
                count = payment_schedule.installment_count or 0
                if count > 0:
                    remaining_amount = total - advance_amount  
                    amount = remaining_amount / Decimal(str(count))
                else:
                    amount = Decimal('0')
                from datetime import timedelta, datetime
                # Ensure start_date is a date object, not string
                if isinstance(payment_schedule.start_date, str):
                    current_due = datetime.strptime(payment_schedule.start_date, '%Y-%m-%d').date()
                else:
                    current_due = payment_schedule.start_date
                for i in range(1, count + 1):
                    # naive monthly/weekly frequency handling
                    freq = (payment_schedule.installment_frequency or 'monthly')
                    if freq == 'monthly':
                        month = current_due.month + 1
                        year = current_due.year + (month - 1) // 12
                        month = (month - 1) % 12 + 1
                        # Keep day consistent when possible
                        from calendar import monthrange
                        day = min(current_due.day, monthrange(year, month)[1])
                        current_due = current_due.replace(year=year, month=month, day=day)
                    elif freq == 'weekly':
                        current_due = current_due + timedelta(weeks=1)
                    elif freq == 'biweekly':
                        current_due = current_due + timedelta(weeks=2)
                    installments_created.append(PaymentInstallment.objects.create(
                        payment_schedule=payment_schedule,
                        installment_type='installment',
                        installment_number=i,
                        amount=amount,
                        due_date=current_due,
                        description=f"Δόση {i}/{count} - {maintenance.title}"
                    ))
            elif payment_schedule.payment_type == 'periodic':
                from datetime import timedelta, datetime
                # Ensure start_date is a date object, not string  
                if isinstance(payment_schedule.start_date, str):
                    current_date = datetime.strptime(payment_schedule.start_date, '%Y-%m-%d').date()
                else:
                    current_date = payment_schedule.start_date
                periodic_amount = payment_schedule.periodic_amount or 0
                for i in range(1, 13):
                    installments_created.append(PaymentInstallment.objects.create(
                        payment_schedule=payment_schedule,
                        installment_type='periodic',
                        installment_number=i,
                        amount=periodic_amount,
                        due_date=current_date,
                        description=f"Περιοδική πληρωμή {i} - {maintenance.title}"
                    ))
                    freq = (payment_schedule.periodic_frequency or 'monthly')
                    if freq == 'monthly':
                        month = current_date.month + 1
                        year = current_date.year + (month - 1) // 12
                        month = (month - 1) % 12 + 1
                        from calendar import monthrange
                        day = min(current_date.day, monthrange(year, month)[1])
                        current_date = current_date.replace(year=year, month=month, day=day)
                    elif freq == 'weekly':
                        current_date = current_date + timedelta(weeks=1)
                    elif freq == 'biweekly':
                        current_date = current_date + timedelta(weeks=2)

            return Response({
                'payment_schedule': PaymentScheduleSerializer(payment_schedule).data,
                'installments': PaymentInstallmentSerializer(installments_created, many=True).data,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            print(f"PaymentSchedule creation error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            print(f"Request data: {data}")
            return Response({'error': str(e), 'details': str(traceback.format_exc())}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """Ιστορικό πληρωμών έργου (δόσεις + αποδείξεις)"""
        maintenance = self.get_object()
        receipts = PaymentReceipt.objects.filter(scheduled_maintenance=maintenance).order_by('-payment_date')
        installments = PaymentInstallment.objects.filter(payment_schedule__scheduled_maintenance=maintenance).order_by('due_date')
        return Response({
            'receipts': PaymentReceiptSerializer(receipts, many=True).data,
            'installments': PaymentInstallmentSerializer(installments, many=True).data,
        })

    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Επεξεργασία πληρωμής δόσης και δημιουργία απόδειξης"""
        maintenance = self.get_object()
        installment_id = request.data.get('installment') or request.data.get('installment_id')
        if not installment_id:
            return Response({'error': 'Απαιτείται installment'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            installment = PaymentInstallment.objects.get(id=installment_id, payment_schedule__scheduled_maintenance=maintenance)
        except PaymentInstallment.DoesNotExist:
            return Response({'error': 'Η δόση δεν βρέθηκε για το συγκεκριμένο έργο'}, status=status.HTTP_404_NOT_FOUND)

        if installment.status == 'paid':
            return Response({'error': 'Η δόση έχει ήδη πληρωθεί'}, status=status.HTTP_400_BAD_REQUEST)

        payment_date = request.data.get('payment_date') or timezone.now().date()
        description = request.data.get('description') or f"Πληρωμή δόσης {installment.installment_number}"
        receipt_type = request.data.get('receipt_type') or 'installment'

        installment.status = 'paid'
        installment.payment_date = payment_date
        installment.paid_amount = installment.amount
        installment.save()

        receipt = PaymentReceipt.objects.create(
            scheduled_maintenance=maintenance,
            installment=installment,
            contractor=maintenance.contractor,
            receipt_type=receipt_type,
            amount=installment.amount,
            payment_date=payment_date,
            description=description,
            status='issued',
            created_by=request.user,
        )

        return Response({
            'installment': PaymentInstallmentSerializer(installment).data,
            'receipt': PaymentReceiptSerializer(receipt).data,
        })


class MaintenanceTicketViewSet(viewsets.ModelViewSet):
    """ViewSet για τη διαχείριση maintenance tickets με RBAC permissions"""
    queryset = MaintenanceTicket.objects.select_related('building', 'apartment', 'contractor').all()
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'apartment', 'category', 'priority', 'status', 'contractor']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'sla_due_at', 'priority']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """
        Εφαρμογή διαφορετικών permissions ανά action:
        - Create/Read: Managers και Residents (με building-level filtering)
        - Update/Delete: Μόνο Managers
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsRelatedToBuilding()]

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


class PaymentScheduleViewSet(viewsets.ModelViewSet):
    queryset = PaymentSchedule.objects.select_related(
        'scheduled_maintenance', 'scheduled_maintenance__building', 
        'scheduled_maintenance__contractor', 'created_by'
    ).prefetch_related('installments').all()
    serializer_class = PaymentScheduleSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['scheduled_maintenance', 'payment_type', 'is_active']
    search_fields = ['scheduled_maintenance__title', 'notes']
    ordering_fields = ['created_at', 'start_date', 'total_amount']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        payment_schedule = serializer.save(created_by=self.request.user)
        # Auto-generate installments based on payment type
        self._generate_installments(payment_schedule)

    def _generate_installments(self, payment_schedule):
        """Generate installments based on payment schedule configuration"""
        if payment_schedule.payment_type == 'lump_sum':
            # Single installment for full amount
            PaymentInstallment.objects.create(
                payment_schedule=payment_schedule,
                installment_type='full',
                installment_number=1,
                amount=payment_schedule.total_amount,
                due_date=payment_schedule.start_date,
                description=f"Εφάπαξ πληρωμή - {payment_schedule.scheduled_maintenance.title}"
            )
        
        elif payment_schedule.payment_type == 'advance_installments':
            # Create advance payment
            advance_amount = payment_schedule.advance_amount
            PaymentInstallment.objects.create(
                payment_schedule=payment_schedule,
                installment_type='advance',
                installment_number=0,
                amount=advance_amount,
                due_date=payment_schedule.start_date,
                description=f"Προκαταβολή - {payment_schedule.scheduled_maintenance.title}"
            )
            
            # Create installments for remaining amount
            remaining_amount = payment_schedule.remaining_amount
            installment_amount = payment_schedule.installment_amount
            
            for i in range(1, payment_schedule.installment_count + 1):
                due_date = payment_schedule.start_date
                if payment_schedule.installment_frequency == 'monthly':
                    due_date = due_date.replace(month=due_date.month + i)
                elif payment_schedule.installment_frequency == 'weekly':
                    due_date = due_date + timezone.timedelta(weeks=i)
                elif payment_schedule.installment_frequency == 'biweekly':
                    due_date = due_date + timezone.timedelta(weeks=i*2)
                
                PaymentInstallment.objects.create(
                    payment_schedule=payment_schedule,
                    installment_type='installment',
                    installment_number=i,
                    amount=installment_amount,
                    due_date=due_date,
                    description=f"Δόση {i}/{payment_schedule.installment_count} - {payment_schedule.scheduled_maintenance.title}"
                )
        
        elif payment_schedule.payment_type == 'periodic':
            # Generate periodic payments based on frequency
            current_date = payment_schedule.start_date
            installment_number = 1
            
            # Generate for next 12 months or until project completion
            while installment_number <= 12:  # Limit to prevent infinite loops
                PaymentInstallment.objects.create(
                    payment_schedule=payment_schedule,
                    installment_type='periodic',
                    installment_number=installment_number,
                    amount=payment_schedule.periodic_amount,
                    due_date=current_date,
                    description=f"Περιοδική πληρωμή {installment_number} - {payment_schedule.scheduled_maintenance.title}"
                )
                
                # Calculate next payment date
                if payment_schedule.periodic_frequency == 'monthly':
                    current_date = current_date.replace(month=current_date.month + 1)
                elif payment_schedule.periodic_frequency == 'weekly':
                    current_date = current_date + timezone.timedelta(weeks=1)
                elif payment_schedule.periodic_frequency == 'biweekly':
                    current_date = current_date + timezone.timedelta(weeks=2)
                
                installment_number += 1

    @action(detail=True, methods=['post'])
    def generate_installments(self, request, pk=None):
        """Manually regenerate installments for payment schedule"""
        payment_schedule = self.get_object()
        
        # Delete existing installments
        payment_schedule.installments.all().delete()
        
        # Regenerate installments
        self._generate_installments(payment_schedule)
        
        # Return updated payment schedule
        serializer = self.get_serializer(payment_schedule)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def installments(self, request, pk=None):
        """Get all installments for this payment schedule"""
        payment_schedule = self.get_object()
        installments = payment_schedule.installments.all().order_by('installment_number')
        serializer = PaymentInstallmentSerializer(installments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get payment schedule summary with statistics"""
        from decimal import Decimal
        payment_schedule = self.get_object()
        installments = payment_schedule.installments.all()
        
        total_installments = installments.count()
        paid_installments = installments.filter(status='paid').count()
        overdue_installments = installments.filter(
            status='pending',
            due_date__lt=timezone.now().date()
        ).count()
        
        total_paid = installments.filter(status='paid').aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        summary = {
            'payment_schedule': PaymentScheduleSerializer(payment_schedule).data,
            'statistics': {
                'total_installments': total_installments,
                'paid_installments': paid_installments,
                'pending_installments': total_installments - paid_installments,
                'overdue_installments': overdue_installments,
                'total_amount': payment_schedule.total_amount,
                'total_paid': total_paid,
                'remaining_amount': payment_schedule.total_amount - total_paid,
                'completion_percentage': float(total_paid / payment_schedule.total_amount * Decimal('100')) if payment_schedule.total_amount > 0 else 0
            }
        }
        
        return Response(summary)


class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    queryset = PaymentInstallment.objects.select_related(
        'payment_schedule', 'payment_schedule__scheduled_maintenance',
        'payment_schedule__scheduled_maintenance__building',
        'payment_schedule__scheduled_maintenance__contractor',
        'receipt'
    ).all()
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['payment_schedule', 'installment_type', 'status']
    search_fields = ['description', 'payment_schedule__scheduled_maintenance__title']
    ordering_fields = ['due_date', 'installment_number', 'amount']
    ordering = ['due_date', 'installment_number']

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark installment as paid and create payment receipt"""
        installment = self.get_object()
        
        if installment.status == 'paid':
            return Response(
                {'error': 'Η δόση έχει ήδη πληρωθεί'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get payment data from request
        payment_date = request.data.get('payment_date', timezone.now().date())
        receipt_type = request.data.get('receipt_type', 'payment')
        description = request.data.get('description', f"Πληρωμή δόσης {installment.installment_number}")
        
        # Mark installment as paid
        installment.status = 'paid'
        installment.payment_date = payment_date
        installment.save()
        
        # Create payment receipt
        receipt = PaymentReceipt.objects.create(
            scheduled_maintenance=installment.payment_schedule.scheduled_maintenance,
            installment=installment,
            contractor=installment.payment_schedule.scheduled_maintenance.contractor,
            receipt_type=receipt_type,
            amount=installment.amount,
            payment_date=payment_date,
            description=description,
            status='issued',
            created_by=request.user
        )
        
        # Link receipt to installment
        installment.receipt = receipt
        installment.save()
        
        return Response({
            'installment': PaymentInstallmentSerializer(installment).data,
            'receipt': PaymentReceiptSerializer(receipt).data
        })

    @action(detail=True, methods=['post'])
    def mark_cancelled(self, request, pk=None):
        """Mark installment as cancelled"""
        installment = self.get_object()
        installment.status = 'cancelled'
        installment.save()
        
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get all overdue installments"""
        overdue_installments = self.get_queryset().filter(
            status='pending',
            due_date__lt=timezone.now().date()
        )
        
        serializer = self.get_serializer(overdue_installments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming installments (next 30 days)"""
        upcoming_date = timezone.now().date() + timezone.timedelta(days=30)
        upcoming_installments = self.get_queryset().filter(
            status='pending',
            due_date__lte=upcoming_date,
            due_date__gte=timezone.now().date()
        )
        
        serializer = self.get_serializer(upcoming_installments, many=True)
        return Response(serializer.data)


class PaymentReceiptViewSet(viewsets.ModelViewSet):
    queryset = PaymentReceipt.objects.select_related(
        'scheduled_maintenance', 'scheduled_maintenance__building',
        'contractor', 'installment', 'linked_expense',
        'created_by', 'approved_by'
    ).all()
    permission_classes = [IsAuthenticated, MaintenancePermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['scheduled_maintenance', 'contractor', 'receipt_type', 'status']
    search_fields = ['receipt_number', 'description', 'contractor__name']
    ordering_fields = ['payment_date', 'created_at', 'amount']
    ordering = ['-payment_date', '-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentReceiptCreateSerializer
        elif self.action == 'retrieve':
            return PaymentReceiptDetailSerializer
        return PaymentReceiptSerializer

    def perform_create(self, serializer):
        receipt = serializer.save(created_by=self.request.user)
        
        # Auto-create linked expense if needed
        self._create_linked_expense(receipt)

    def _create_linked_expense(self, receipt):
        """Create linked expense for payment receipt"""
        try:
            # Determine category based on maintenance type
            maintenance = receipt.scheduled_maintenance
            category = 'building_maintenance'  # Default category
            
            if maintenance.contractor:
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
                category = category_map.get(maintenance.contractor.service_type, 'building_maintenance')
            
            # Create expense
            expense = Expense.objects.create(
                building=maintenance.building,
                title=f"Πληρωμή: {maintenance.title} - {receipt.description}",
                amount=receipt.amount,
                date=receipt.payment_date,
                category=category,
                distribution_type='by_participation_mills',
                expense_type='maintenance',
                notes=f"Συνδεδεμένη με απόδειξη πληρωμής {receipt.receipt_number}"
            )
            
            # Link expense to receipt
            receipt.linked_expense = expense
            receipt.save(update_fields=['linked_expense'])
            
        except Exception as e:
            print(f"[PaymentReceiptViewSet] Failed to create linked expense: {e}")

    @action(detail=True, methods=['post'])
    def sign_receipt(self, request, pk=None):
        """Add contractor signature to receipt"""
        receipt = self.get_object()
        
        signature_data = request.data.get('signature')
        if not signature_data:
            return Response(
                {'error': 'Απαιτείται υπογραφή'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save signature
        receipt.contractor_signature = signature_data
        receipt.contractor_signature_date = timezone.now()
        receipt.contractor_signature_ip = self._get_client_ip(request)
        receipt.status = 'signed'
        receipt.save()
        
        serializer = self.get_serializer(receipt)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve_receipt(self, request, pk=None):
        """Approve receipt (management approval)"""
        receipt = self.get_object()
        
        receipt.approved_by = request.user
        receipt.approved_at = timezone.now()
        receipt.status = 'approved'
        receipt.save()
        
        serializer = self.get_serializer(receipt)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive_receipt(self, request, pk=None):
        """Archive receipt for long-term storage"""
        receipt = self.get_object()
        
        receipt.status = 'archived'
        receipt.archived_at = timezone.now()
        receipt.save()
        
        serializer = self.get_serializer(receipt)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def print_preview(self, request, pk=None):
        """Get receipt data formatted for printing"""
        receipt = self.get_object()
        
        # Format data for print template
        print_data = {
            'receipt': PaymentReceiptDetailSerializer(receipt).data,
            'building': {
                'name': receipt.scheduled_maintenance.building.name,
                'address': receipt.scheduled_maintenance.building.address,
                'postal_code': receipt.scheduled_maintenance.building.postal_code,
                'city': receipt.scheduled_maintenance.building.city,
            },
            'contractor': {
                'name': receipt.contractor.name,
                'contact_person': receipt.contractor.contact_person,
                'phone': receipt.contractor.phone,
                'email': receipt.contractor.email,
                'tax_number': receipt.contractor.tax_number,
                'address': receipt.contractor.address,
            },
            'maintenance': {
                'title': receipt.scheduled_maintenance.title,
                'description': receipt.scheduled_maintenance.description,
                'scheduled_date': receipt.scheduled_maintenance.scheduled_date,
            },
            'print_metadata': {
                'generated_at': timezone.now(),
                'generated_by': request.user.get_full_name(),
            }
        }
        
        return Response(print_data)

    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """Δημιουργία PDF απόδειξης (απλή υλοποίηση)."""
        receipt = self.get_object()
        try:
            # Prefer WeasyPrint for proper Greek font rendering
            try:
                from weasyprint import HTML, CSS
                html = f"""
                <html>
                  <head>
                    <meta charset='utf-8'>
                    <style>
                      @page {{ size: A4; margin: 20mm; }}
                      body {{ font-family: DejaVu Sans, sans-serif; font-size: 12px; }}
                      h1 {{ font-size: 18px; margin-bottom: 10px; }}
                      .row {{ margin: 6px 0; }}
                      .label {{ font-weight: bold; }}
                    </style>
                  </head>
                  <body>
                    <h1>ΑΠΟΔΕΙΞΗ ΠΛΗΡΩΜΗΣ #{receipt.receipt_number}</h1>
                    <div class='row'><span class='label'>Έργο:</span> {receipt.scheduled_maintenance.title}</div>
                    <div class='row'><span class='label'>Κτίριο:</span> {receipt.scheduled_maintenance.building.name}</div>
                    <div class='row'><span class='label'>Συνεργείο:</span> {getattr(receipt.contractor, 'name', '-')}</div>
                    <div class='row'><span class='label'>Ημ/νία Πληρωμής:</span> {receipt.payment_date}</div>
                    <div class='row'><span class='label'>Ποσό:</span> €{receipt.amount}</div>
                    <div class='row'><span class='label'>Περιγραφή:</span> {receipt.description or ''}</div>
                  </body>
                </html>
                """
                pdf_bytes = HTML(string=html).write_pdf(stylesheets=[CSS(string='@page { size: A4; margin: 20mm; }')])
                response = HttpResponse(pdf_bytes, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="receipt-{receipt.receipt_number}.pdf"'
                return response
            except Exception:
                # Fallback to reportlab
                from reportlab.lib.pagesizes import A4
                from reportlab.pdfgen import canvas
                buffer = BytesIO()
                p = canvas.Canvas(buffer, pagesize=A4)
                width, height = A4
                y = height - 50
                lines = [
                    f"ΑΠΟΔΕΙΞΗ ΠΛΗΡΩΜΗΣ #{receipt.receipt_number}",
                    f"Έργο: {receipt.scheduled_maintenance.title}",
                    f"Κτίριο: {receipt.scheduled_maintenance.building.name}",
                    f"Συνεργείο: {getattr(receipt.contractor, 'name', '-')}",
                    f"Ημ/νία Πληρωμής: {receipt.payment_date}",
                    f"Ποσό: €{receipt.amount}",
                    f"Περιγραφή: {receipt.description}",
                ]
                for line in lines:
                    p.drawString(50, y, line)
                    y -= 20
                p.showPage()
                p.save()
                pdf = buffer.getvalue()
                buffer.close()
                response = HttpResponse(pdf, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="receipt-{receipt.receipt_number}.pdf"'
                return response
        except Exception as e:
            return Response({'error': f'PDF generation not available: {str(e)}'}, status=status.HTTP_501_NOT_IMPLEMENTED)

    @action(detail=True, methods=['post'])
    def contractor_sign(self, request, pk=None):
        """Συντόμευση στο sign_receipt για συμβατότητα με TODO."""
        request._full_data = {**getattr(request, 'data', {}), 'signature': request.data.get('signature')}
        return self.sign_receipt(request, pk)
