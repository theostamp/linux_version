from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Contractor, ServiceReceipt, ScheduledMaintenance
from .serializers import (
    ContractorSerializer, ServiceReceiptSerializer, ScheduledMaintenanceSerializer
)


class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['service_type', 'status', 'availability']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'rating', 'reliability_score', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def receipts(self, request, pk=None):
        """Λήψη αποδείξεων συνεργείου"""
        contractor = self.get_object()
        receipts = contractor.receipts.all()
        serializer = ServiceReceiptSerializer(receipts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def scheduled_work(self, request, pk=None):
        """Λήψη προγραμματισμένων έργων συνεργείου"""
        contractor = self.get_object()
        scheduled_work = contractor.scheduled_work.all()
        serializer = ScheduledMaintenanceSerializer(scheduled_work, many=True)
        return Response(serializer.data)


class ServiceReceiptViewSet(viewsets.ModelViewSet):
    queryset = ServiceReceipt.objects.all()
    serializer_class = ServiceReceiptSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contractor', 'building', 'payment_status']
    search_fields = ['description', 'invoice_number', 'contractor__name']
    ordering_fields = ['service_date', 'amount', 'created_at']
    ordering = ['-service_date']


class ScheduledMaintenanceViewSet(viewsets.ModelViewSet):
    queryset = ScheduledMaintenance.objects.all()
    serializer_class = ScheduledMaintenanceSerializer
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
