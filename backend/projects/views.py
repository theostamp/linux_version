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


def update_project_schedule(project, offer=None):
    """Ενημερώνει το σχήμα 'Προγραμματισμός έργου' στο financial και maintenance modules"""
    try:
        from financial.models import Expense
        from maintenance.models import ScheduledMaintenance
        from decimal import Decimal
        from datetime import datetime, timedelta

        # Υπολογισμός ημερομηνίας πληρωμής (αν έχει deadline χρησιμοποίησε αυτό, αλλιώς 30 μέρες από σήμερα)
        due_date = project.deadline or (datetime.now().date() + timedelta(days=30))

        # Δημιουργία περιγραφής με στοιχεία πληρωμής
        description = f"Έργο: {project.description or ''}"
        if project.payment_method:
            description += f"\nΤρόπος Πληρωμής: {project.payment_method}"
        if project.installments and project.installments > 1:
            description += f"\nΔόσεις: {project.installments}"
        if project.advance_payment:
            description += f"\nΠροκαταβολή: €{project.advance_payment}"
        if project.payment_terms:
            description += f"\nΌροι: {project.payment_terms}"

        # Επιλογή κατάλληλης κατηγορίας δαπάνης
        category = 'project'  # default
        if 'συντήρηση' in project.title.lower() or 'επισκευή' in project.title.lower():
            category = 'maintenance_project'
        elif 'ανακαίνιση' in project.title.lower():
            category = 'renovation'
        elif 'αναβάθμιση' in project.title.lower():
            category = 'upgrade'

        # Δημιουργία ή ενημέρωση δαπάνης για το έργο
        expense, created = Expense.objects.get_or_create(
            title=f"Έργο: {project.title}",
            building=project.building,
            defaults={
                'amount': project.final_cost or project.estimated_cost or Decimal('0.00'),
                'category': category,
                'description': description,
                'date': project.created_at.date(),
                'due_date': due_date,
                'distribution_type': 'by_participation_mills',  # Συνήθως τα έργα χρεώνονται με χιλιοστά
                'created_by': project.created_by,
                'notes': f"Ανάδοχος: {project.selected_contractor}\nΑυτόματη καταχώρηση από έγκριση προσφοράς",
            }
        )

        if not created:
            # Ενημέρωση υπάρχουσας δαπάνης
            expense.amount = project.final_cost or project.estimated_cost or expense.amount
            expense.description = description
            expense.due_date = due_date
            expense.notes = f"Ανάδοχος: {project.selected_contractor}\nΑυτόματη ενημέρωση από έγκριση προσφοράς"
            expense.save()

        # Σύνδεση του έργου με τη δαπάνη
        project.linked_expense = expense
        project.save(update_fields=['linked_expense'])

        # Δημιουργία ή ενημέρωση ScheduledMaintenance για το έργο
        scheduled_maintenance, created = ScheduledMaintenance.objects.get_or_create(
            title=project.title,
            building=project.building,
            defaults={
                'description': project.description or '',
                'scheduled_date': project.deadline or (datetime.now().date() + timedelta(days=30)),
                'priority': project.priority or 'medium',
                'status': 'in_progress' if project.status == 'approved' else 'pending',
                'contractor_name': project.selected_contractor,
                'contractor_contact': offer.contractor_contact if offer else '',
                'contractor_phone': offer.contractor_phone if offer else '',
                'contractor_email': offer.contractor_email if offer else '',
                'total_cost': project.final_cost or project.estimated_cost or Decimal('0.00'),
                'payment_method': project.payment_method,
                'installments': project.installments or 1,
                'advance_payment': project.advance_payment,
                'created_by': project.created_by,
            }
        )

        if not created:
            # Ενημέρωση υπάρχοντος ScheduledMaintenance
            scheduled_maintenance.description = project.description or ''
            scheduled_maintenance.scheduled_date = project.deadline or (datetime.now().date() + timedelta(days=30))
            scheduled_maintenance.priority = project.priority or 'medium'
            scheduled_maintenance.status = 'in_progress' if project.status == 'approved' else 'pending'
            scheduled_maintenance.contractor_name = project.selected_contractor
            if offer:
                scheduled_maintenance.contractor_contact = offer.contractor_contact or ''
                scheduled_maintenance.contractor_phone = offer.contractor_phone or ''
                scheduled_maintenance.contractor_email = offer.contractor_email or ''
            scheduled_maintenance.total_cost = project.final_cost or project.estimated_cost or scheduled_maintenance.total_cost
            scheduled_maintenance.payment_method = project.payment_method
            scheduled_maintenance.installments = project.installments or 1
            scheduled_maintenance.advance_payment = project.advance_payment
            scheduled_maintenance.save()
        
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
            
            # Ενημερώνει το έργο με όλα τα πεδία πληρωμής και στοιχεία συνεργείου
            project.selected_contractor = offer.contractor_name
            project.final_cost = offer.amount
            project.payment_terms = offer.payment_terms
            project.payment_method = offer.payment_method
            project.installments = offer.installments
            project.advance_payment = offer.advance_payment
            project.status = 'approved'
            # Προσθήκη: αποθήκευση των στοιχείων επικοινωνίας στο object της προσφοράς
            # για να τα περάσουμε στο ScheduledMaintenance
            project.selected_offer = offer
            project.save()
            
            # Ενημερώνει το σχήμα "Προγραμματισμός έργου" στο financial και maintenance modules
            update_project_schedule(project, offer)
        
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

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by building if provided
        building_id = self.request.query_params.get('building')
        if building_id:
            queryset = queryset.filter(project__building_id=building_id)
        return queryset

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
