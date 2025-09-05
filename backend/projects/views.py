from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Project, Offer, Contract, Milestone
from .permissions import ProjectPermission
from .serializers import ProjectSerializer, OfferSerializer, ContractSerializer, MilestoneSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('building', 'created_by').prefetch_related('milestones', 'offers').all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'status', 'project_type']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related('project', 'project__building', 'contractor').all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'contractor', 'status']
    search_fields = ['description', 'project__title', 'contractor__name']
    ordering_fields = ['submitted_date', 'amount']
    ordering = ['-submitted_date']


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related('project', 'project__building', 'contractor').all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'contractor', 'status', 'contract_type']
    search_fields = ['title', 'description', 'contract_number']
    ordering_fields = ['start_date', 'end_date', 'amount']
    ordering = ['-start_date']


class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.select_related('project', 'project__building').all()
    serializer_class = MilestoneSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'status']
    search_fields = ['title', 'description', 'project__title']
    ordering_fields = ['due_at', 'created_at']
    ordering = ['due_at']
