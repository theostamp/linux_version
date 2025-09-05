from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.throttling import AnonRateThrottle

from .models import Project, Offer, Contract, Milestone, RFQ
from .permissions import ProjectPermission
from .serializers import ProjectSerializer, OfferSerializer, ContractSerializer, MilestoneSerializer, RFQSerializer
from core.utils import publish_building_event


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

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        project = self.get_object()
        with transaction.atomic():
            project.status = 'in_progress'
            if not project.start_date:
                project.start_date = timezone.now().date()
            project.save(update_fields=['status', 'start_date', 'updated_at'])
        publish_building_event(
            building_id=project.building_id,
            event_type='project.updated',
            payload={'id': project.id, 'status': project.status, 'title': project.title},
        )
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        project = self.get_object()
        with transaction.atomic():
            project.status = 'completed'
            project.end_date = timezone.now().date()
            project.save(update_fields=['status', 'end_date', 'updated_at'])
        publish_building_event(
            building_id=project.building_id,
            event_type='project.updated',
            payload={'id': project.id, 'status': project.status, 'title': project.title},
        )
        return Response(ProjectSerializer(project).data)


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related('project', 'project__building', 'contractor').all()
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'project__building', 'contractor', 'status']
    search_fields = ['description', 'project__title', 'contractor__name']
    ordering_fields = ['submitted_date', 'amount']
    ordering = ['-submitted_date']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        offer: Offer = self.get_object()
        with transaction.atomic():
            # Accept selected offer
            if offer.status != 'accepted':
                offer.status = 'accepted'
                offer.evaluation_date = timezone.now()
                offer.save(update_fields=['status', 'evaluation_date'])

            # Reject other offers for same project
            Offer.objects.filter(project_id=offer.project_id).exclude(id=offer.id).update(status='rejected')

            # Update project status
            project = offer.project
            if project.status in {'planning', 'bidding'}:
                project.status = 'awarded'
                project.save(update_fields=['status', 'updated_at'])

        publish_building_event(
            building_id=offer.project.building_id,
            event_type='offer.approved',
            payload={'id': offer.id, 'project_id': offer.project_id, 'contractor_id': offer.contractor_id},
        )
        return Response(OfferSerializer(offer).data, status=status.HTTP_200_OK)


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related('project', 'project__building', 'contractor').all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'project__building', 'contractor', 'status', 'contract_type']
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


class RFQViewSet(viewsets.ModelViewSet):
    queryset = RFQ.objects.select_related('project', 'project__building').all()
    serializer_class = RFQSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'project__building', 'status']
    search_fields = ['title', 'description', 'project__title']
    ordering_fields = ['created_at', 'due_date']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@method_decorator(cache_page(60), name='dispatch')
class PublicProjectsAPIView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def list(self, request):
        building_id = request.query_params.get('building')
        statuses = {'awarded', 'in_progress'}
        qs = Project.objects.filter(status__in=statuses)
        if building_id:
            try:
                qs = qs.filter(building_id=int(building_id))
            except (TypeError, ValueError):
                pass
        qs = qs.order_by('-start_date', '-created_at')[:50]
        data = [
            {
                'id': p.id,
                'title': p.title,
                'status': p.status,
                'start_date': p.start_date,
                'end_date': p.end_date,
            }
            for p in qs
        ]
        return Response(data)
