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
from django.shortcuts import get_object_or_404

from .models import Project, Offer, OfferFile, ProjectVote, ProjectExpense
from .permissions import ProjectPermission
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer,
    OfferSerializer, OfferDetailSerializer,
    OfferFileSerializer, ProjectVoteSerializer, ProjectExpenseSerializer
)
from core.utils import publish_building_event


def update_project_schedule(project):
    """Ενημερώνει το σχήμα 'Προγραμματισμός έργου' στο financial module"""
    try:
        from financial.models import Expense
        from decimal import Decimal
        
        # Δημιουργία ή ενημέρωση δαπάνης για το έργο
        expense, created = Expense.objects.get_or_create(
            title=f"Έργο: {project.title}",
            building=project.building,
            defaults={
                'amount': project.final_cost or project.estimated_cost or Decimal('0.00'),
                'category': 'project',
                'description': f"Έργο: {project.description or ''}",
                'date': project.created_at.date(),
                'created_by': project.created_by,
            }
        )
        
        if not created:
            # Ενημέρωση υπάρχουσας δαπάνης
            expense.amount = project.final_cost or project.estimated_cost or expense.amount
            expense.description = f"Έργο: {project.description or ''}"
            expense.save()
        
        # Σύνδεση του έργου με τη δαπάνη
        project.linked_expense = expense
        project.save(update_fields=['linked_expense'])
        
        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=project.building_id,
            event_type="financial.expense.updated",
            payload={
                "id": expense.id,
                "title": expense.title,
                "amount": str(expense.amount),
                "project_id": str(project.id),
            },
        )
        
    except Exception as e:
        # Log the error but don't fail the project approval
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to update project schedule for project {project.id}: {e}")


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related('building', 'created_by').prefetch_related('offers', 'votes', 'expenses').all()
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['building', 'status', 'priority']
    search_fields = ['title', 'description', 'selected_contractor']
    ordering_fields = ['created_at', 'deadline', 'tender_deadline', 'general_assembly_date']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        project = self.get_object()
        with transaction.atomic():
            project.status = 'in_progress'
            project.save(update_fields=['status', 'updated_at'])
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
            project.save(update_fields=['status', 'updated_at'])
        publish_building_event(
            building_id=project.building_id,
            event_type='project.updated',
            payload={'id': project.id, 'status': project.status, 'title': project.title},
        )
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def approve_offer(self, request, pk=None):
        """Εγκρίνει μια προσφορά και ενημερώνει το έργο"""
        project = self.get_object()
        offer_id = request.data.get('offer_id')
        
        if not offer_id:
            return Response({'error': 'offer_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        offer = get_object_or_404(Offer, id=offer_id, project=project)
        
        with transaction.atomic():
            # Εγκρίνει την επιλεγμένη προσφορά
            offer.status = 'accepted'
            offer.reviewed_at = timezone.now()
            offer.reviewed_by = request.user
            offer.save()
            
            # Απορρίπτει τις άλλες προσφορές
            Offer.objects.filter(project=project).exclude(id=offer.id).update(
                status='rejected',
                reviewed_at=timezone.now(),
                reviewed_by=request.user
            )
            
            # Ενημερώνει το έργο
            project.selected_contractor = offer.contractor_name
            project.final_cost = offer.amount
            project.payment_terms = offer.payment_terms
            project.status = 'approved'
            project.save()
            
            # Ενημερώνει το σχήμα "Προγραμματισμός έργου" στο financial module
            update_project_schedule(project)
        
        publish_building_event(
            building_id=project.building_id,
            event_type='offer.approved',
            payload={'id': offer.id, 'project_id': project.id, 'contractor': offer.contractor_name},
        )
        return Response(OfferSerializer(offer).data)


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.select_related('project', 'project__building', 'reviewed_by').prefetch_related('files').all()
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'project__building', 'status']
    search_fields = ['description', 'project__title', 'contractor_name']
    ordering_fields = ['submitted_at', 'amount']
    ordering = ['-submitted_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OfferDetailSerializer
        return OfferSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        offer = self.get_object()
        with transaction.atomic():
            # Εγκρίνει την προσφορά
            offer.status = 'accepted'
            offer.reviewed_at = timezone.now()
            offer.reviewed_by = request.user
            offer.save()

            # Απορρίπτει τις άλλες προσφορές για το ίδιο έργο
            Offer.objects.filter(project=offer.project).exclude(id=offer.id).update(
                status='rejected',
                reviewed_at=timezone.now(),
                reviewed_by=request.user
            )

            # Ενημερώνει το έργο
            project = offer.project
            project.selected_contractor = offer.contractor_name
            project.final_cost = offer.amount
            project.payment_terms = offer.payment_terms
            project.status = 'approved'
            project.save()

        publish_building_event(
            building_id=offer.project.building_id,
            event_type='offer.approved',
            payload={'id': offer.id, 'project_id': offer.project.id, 'contractor': offer.contractor_name},
        )
        return Response(OfferSerializer(offer).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        offer = self.get_object()
        with transaction.atomic():
            offer.status = 'rejected'
            offer.reviewed_at = timezone.now()
            offer.reviewed_by = request.user
            offer.notes = request.data.get('notes', '')
            offer.save()

        return Response(OfferSerializer(offer).data, status=status.HTTP_200_OK)


class OfferFileViewSet(viewsets.ModelViewSet):
    queryset = OfferFile.objects.select_related('offer', 'offer__project', 'uploaded_by').all()
    serializer_class = OfferFileSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['offer', 'offer__project', 'file_type']
    search_fields = ['filename', 'offer__contractor_name']
    ordering_fields = ['uploaded_at', 'file_size']
    ordering = ['-uploaded_at']

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class ProjectVoteViewSet(viewsets.ModelViewSet):
    queryset = ProjectVote.objects.select_related('project', 'offer').all()
    serializer_class = ProjectVoteSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'offer', 'vote_type', 'apartment']
    search_fields = ['voter_name', 'apartment', 'project__title']
    ordering_fields = ['voted_at', 'participation_mills']
    ordering = ['-voted_at']


class ProjectExpenseViewSet(viewsets.ModelViewSet):
    queryset = ProjectExpense.objects.select_related('project', 'created_by').all()
    serializer_class = ProjectExpenseSerializer
    permission_classes = [IsAuthenticated, ProjectPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'expense_type']
    search_fields = ['description', 'project__title']
    ordering_fields = ['expense_date', 'amount', 'created_at']
    ordering = ['-expense_date']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@method_decorator(cache_page(60), name='dispatch')
class PublicProjectsAPIView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def list(self, request):
        building_id = request.query_params.get('building')
        statuses = {'approved', 'in_progress', 'completed'}
        qs = Project.objects.filter(status__in=statuses)
        if building_id:
            try:
                qs = qs.filter(building_id=int(building_id))
            except (TypeError, ValueError):
                pass
        qs = qs.order_by('-created_at')[:50]
        data = [
            {
                'id': p.id,
                'title': p.title,
                'status': p.status,
                'deadline': p.deadline,
                'selected_contractor': p.selected_contractor,
                'final_cost': p.final_cost,
            }
            for p in qs
        ]
        return Response(data)
