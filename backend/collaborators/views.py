from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import (
    Collaborator, CollaborationProject, CollaborationContract,
    CollaborationInvoice, CollaborationMeeting, CollaboratorPerformance
)
from .serializers import (
    CollaboratorSerializer, CollaborationProjectSerializer, CollaborationContractSerializer,
    CollaborationInvoiceSerializer, CollaborationMeetingSerializer, CollaboratorPerformanceSerializer
)


class CollaboratorViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Collaborator.objects.all()
    serializer_class = CollaboratorSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['collaborator_type', 'status', 'availability']
    search_fields = ['name', 'contact_person', 'email', 'phone']
    ordering_fields = ['name', 'rating', 'created_at']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """Λήψη έργων συνεργάτη"""
        collaborator = self.get_object()
        projects = collaborator.projects.all()
        serializer = CollaborationProjectSerializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def contracts(self, request, pk=None):
        """Λήψη συμβολαίων συνεργάτη"""
        collaborator = self.get_object()
        contracts = collaborator.contracts.all()
        serializer = CollaborationContractSerializer(contracts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """Λήψη τιμολογίων συνεργάτη"""
        collaborator = self.get_object()
        invoices = collaborator.invoices.all()
        serializer = CollaborationInvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def meetings(self, request, pk=None):
        """Λήψη συναντήσεων με συνεργάτη"""
        collaborator = self.get_object()
        meetings = collaborator.meetings.all()
        serializer = CollaborationMeetingSerializer(meetings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Λήψη απόδοσης συνεργάτη"""
        collaborator = self.get_object()
        performance = collaborator.performance_records.all()
        serializer = CollaboratorPerformanceSerializer(performance, many=True)
        return Response(serializer.data)


class CollaborationProjectViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CollaborationProject.objects.all()
    serializer_class = CollaborationProjectSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project_type', 'status', 'collaborator', 'building']
    search_fields = ['title', 'description']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-start_date']

    @action(detail=True, methods=['get'])
    def meetings(self, request, pk=None):
        """Λήψη συναντήσεων έργου"""
        project = self.get_object()
        meetings = project.meetings.all()
        serializer = CollaborationMeetingSerializer(meetings, many=True)
        return Response(serializer.data)


class CollaborationContractViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CollaborationContract.objects.all()
    serializer_class = CollaborationContractSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['contract_type', 'status', 'collaborator', 'building']
    search_fields = ['contract_number', 'title']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']

    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """Λήψη τιμολογίων συμβολαίου"""
        contract = self.get_object()
        invoices = contract.invoices.all()
        serializer = CollaborationInvoiceSerializer(invoices, many=True)
        return Response(serializer.data)


class CollaborationInvoiceViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CollaborationInvoice.objects.all()
    serializer_class = CollaborationInvoiceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'collaborator', 'contract']
    search_fields = ['invoice_number', 'description']
    ordering_fields = ['issue_date', 'due_date', 'created_at']
    ordering = ['-issue_date']

    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        """Σήμανση τιμολογίου ως πληρωμένου"""
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)


class CollaborationMeetingViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CollaborationMeeting.objects.all()
    serializer_class = CollaborationMeetingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['meeting_type', 'is_online', 'collaborator', 'project']
    search_fields = ['title', 'description']
    ordering_fields = ['scheduled_at', 'created_at']
    ordering = ['-scheduled_at']


class CollaboratorPerformanceViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = CollaboratorPerformance.objects.all()
    serializer_class = CollaboratorPerformanceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['collaborator', 'period_start', 'period_end']
    ordering_fields = ['period_end', 'created_at']
    ordering = ['-period_end'] 