from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import Contractor, ServiceReceipt, ScheduledMaintenance, MaintenanceTicket, WorkOrder
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
