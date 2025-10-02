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
    """
    🔴 ΚΡΙΣΙΜΗ ΣΥΝΑΡΤΗΣΗ - ΑΥΤΟΜΑΤΗ ΣΥΝΔΕΣΗ ΠΡΟΣΦΟΡΑΣ → ΕΡΓΟΥ → ΔΑΠΑΝΩΝ
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Καλείται από: OfferViewSet.approve() και ProjectViewSet.update_status()

    ΛΕΙΤΟΥΡΓΙΑ:
    1. Δημιουργεί ScheduledMaintenance από approved offer
    2. Μεταφέρει στοιχεία συνεργείου (contractor_name, phone, email)
    3. Δημιουργεί Expenses (Προκαταβολή + Δόσεις)
    4. Δημιουργεί Transactions για κάθε διαμέρισμα

    ⚠️ ΠΡΟΣΟΧΗ: ΜΗΝ αλλάξετε τη λογική χωρίς να ελέγξετε:
    - test_and_fix_offer_flow.py
    - OFFER_PROJECT_EXPENSE_ARCHITECTURE.md
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """
    try:
        from financial.models import Expense
        from maintenance.models import ScheduledMaintenance, PaymentSchedule
        from decimal import Decimal
        from datetime import datetime, timedelta
        import calendar

        # Υπολογισμός ημερομηνίας πληρωμής
        due_date = project.deadline or (datetime.now().date() + timedelta(days=30))

        # 🔴 ΚΡΙΣΙΜΟ: Δημιουργία ή ενημέρωση ScheduledMaintenance με linked_project
        # Αυτό συνδέει το approved project με το maintenance module
        scheduled_maintenance, created = ScheduledMaintenance.objects.get_or_create(
            linked_project=project,
            building=project.building,
            defaults={
                'title': project.title,
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
                'payment_terms': project.payment_terms,
                'estimated_duration': 8,  # Default 8 hours for a workday
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
            scheduled_maintenance.payment_terms = project.payment_terms
            scheduled_maintenance.save()

        # Υπολογισμός ποσών για επιμερισμό
        total_amount = project.final_cost or project.estimated_cost or Decimal('0.00')
        installments = project.installments or 1
        advance_payment = project.advance_payment or Decimal('0.00')

        # Επιλογή κατηγορίας
        category = 'project'
        if 'συντήρηση' in project.title.lower() or 'επισκευή' in project.title.lower():
            category = 'maintenance_project'
        elif 'ανακαίνιση' in project.title.lower():
            category = 'renovation'
        elif 'αναβάθμιση' in project.title.lower():
            category = 'upgrade'

        # Διαγραφή παλιών δαπανών για αυτό το έργο (αν υπάρχουν)
        old_expenses = Expense.objects.filter(
            building=project.building,
            title__icontains=project.title
        )
        old_expenses.delete()

        # Αν έχουμε δόσεις, δημιουργούμε επιμερισμένες δαπάνες
        if installments > 1 and total_amount > 0:
            # Υπολογισμός ποσοστού προκαταβολής
            advance_percentage = (advance_payment / total_amount * 100) if advance_payment and total_amount else 30

            # Δημιουργία PaymentSchedule
            payment_schedule, ps_created = PaymentSchedule.objects.get_or_create(
                scheduled_maintenance=scheduled_maintenance,
                defaults={
                    'payment_type': 'advance_installments',
                    'total_amount': total_amount,
                    'advance_percentage': advance_percentage,
                    'installment_count': installments,
                    'installment_frequency': 'monthly',
                    'start_date': datetime.now().date(),
                    'notes': project.payment_terms or '',
                    'status': 'active',
                }
            )

            if not ps_created:
                payment_schedule.total_amount = total_amount
                payment_schedule.advance_percentage = advance_percentage
                payment_schedule.installment_count = installments
                payment_schedule.notes = project.payment_terms or ''
                payment_schedule.save()

            # Δημιουργία προκαταβολής (τρέχων μήνας)
            if advance_payment > 0:
                advance_expense = Expense.objects.create(
                    building=project.building,
                    title=f"{project.title} - Προκαταβολή ({advance_percentage:.0f}%)",
                    amount=advance_payment,
                    category=category,
                    date=datetime.now().date(),
                    due_date=datetime.now().date() + timedelta(days=15),
                    distribution_type='by_participation_mills',
                    notes=f"Προκαταβολή {advance_percentage:.0f}% για έργο. Συνολικό κόστος: {total_amount}€. Ανάδοχος: {project.selected_contractor}",
                )

            # Δημιουργία δόσεων (μελλοντικοί μήνες)
            # ΔΙΟΡΘΩΣΗ: Οι δόσεις ξεκινούν από τον ΕΠΟΜΕΝΟ μήνα μετά την προκαταβολή
            remaining_amount = total_amount - advance_payment
            installment_amount = remaining_amount / installments

            base_date = datetime.now().date()
            for i in range(1, installments + 1):
                # Υπολογισμός μήνα πληρωμής (πρώτη του κάθε μήνα)
                # ΔΙΟΡΘΩΣΗ: Αν έχουμε προκαταβολή, ξεκινάμε από τον επόμενο μήνα (i+1)
                # Αν δεν έχουμε προκαταβολή, ξεκινάμε από τον τρέχοντα μήνα (i)
                month_offset = i + 1 if advance_payment > 0 else i

                payment_month_start = base_date.replace(day=1)
                # Προσθήκη μηνών
                month = payment_month_start.month + month_offset
                year = payment_month_start.year
                while month > 12:
                    month -= 12
                    year += 1
                payment_month_start = payment_month_start.replace(month=month, year=year)

                # ΔΙΟΡΘΩΣΗ V2: Η ημερομηνία δημιουργίας της δόσης είναι η τελευταία του μήνα πληρωμής
                # Έτσι η δόση του 11ου θα έχει date=30/11, και θα εμφανίζεται ως παλιά οφειλή στον 12ο
                # Αυτό εξασφαλίζει ότι η προκαταβολή (π.χ. 03/10) και η Δόση 1 (30/11) δεν εμφανίζονται μαζί
                last_day = calendar.monthrange(payment_month_start.year, payment_month_start.month)[1]
                installment_date = payment_month_start.replace(day=last_day)
                due_date = installment_date

                installment_expense = Expense.objects.create(
                    building=project.building,
                    title=f"{project.title} - Δόση {i}/{installments}",
                    amount=installment_amount,
                    category=category,
                    date=installment_date,
                    due_date=due_date,
                    distribution_type='by_participation_mills',
                    notes=f"Δόση {i} από {installments} για έργο. Ποσό δόσης: {installment_amount:.2f}€. Ανάδοχος: {project.selected_contractor}",
                )

        else:
            # Αν δεν έχουμε δόσεις, δημιουργούμε μία δαπάνη
            expense = Expense.objects.create(
                building=project.building,
                title=f"Έργο: {project.title}",
                amount=total_amount,
                category=category,
                date=project.created_at.date(),
                due_date=due_date,
                distribution_type='by_participation_mills',
                notes=f"Έργο: {project.description or ''}\nΑνάδοχος: {project.selected_contractor}\nΑυτόματη καταχώρηση από έγκριση προσφοράς",
            )

            # Σύνδεση του έργου με τη δαπάνη
            project.linked_expense = expense
            project.save(update_fields=['linked_expense'])

        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=project.building_id,
            event_type="maintenance.scheduled.created" if created else "maintenance.scheduled.updated",
            payload={
                "id": scheduled_maintenance.id,
                "title": scheduled_maintenance.title,
                "total_cost": str(scheduled_maintenance.total_cost),
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
        """
        🔴 ΚΡΙΣΙΜΗ ΣΥΝΑΡΤΗΣΗ - ΜΗΝ ΑΛΛΑΞΕΤΕ ΧΩΡΙΣ ΈΓΚΡΙΣΗ
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Εγκρίνει προσφορά και δημιουργεί αυτόματα:
        1. ScheduledMaintenance (Προγραμματισμένο Έργο)
        2. Expenses (Δαπάνες με δόσεις)
        3. Transactions (Χρεώσεις διαμερισμάτων)

        ΠΡΟΣΟΧΗ: Η update_project_schedule() είναι ΑΠΑΡΑΙΤΗΤΗ
        Δείτε: OFFER_PROJECT_EXPENSE_ARCHITECTURE.md
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        offer = self.get_object()
        with transaction.atomic():
            # ΒΗΜΑ 1: Εγκρίνει την προσφορά
            offer.status = 'accepted'
            offer.reviewed_at = timezone.now()
            offer.reviewed_by = request.user
            offer.save()

            # ΒΗΜΑ 2: Απορρίπτει τις άλλες προσφορές για το ίδιο έργο
            Offer.objects.filter(project=offer.project).exclude(id=offer.id).update(
                status='rejected',
                reviewed_at=timezone.now(),
                reviewed_by=request.user
            )

            # ΒΗΜΑ 3: Ενημερώνει το έργο με ΟΛΑ τα payment fields
            # ⚠️ ΚΡΙΣΙΜΟ: Πρέπει να αντιγραφούν ΟΛΑ τα πεδία από την προσφορά
            project = offer.project
            project.selected_contractor = offer.contractor_name  # ΑΠΑΡΑΙΤΗΤΟ για ScheduledMaintenance
            project.final_cost = offer.amount                    # ΑΠΑΡΑΙΤΗΤΟ για δαπάνες
            project.payment_method = offer.payment_method        # ΑΠΑΡΑΙΤΗΤΟ για τύπο πληρωμής
            project.installments = offer.installments or 1       # ΑΠΑΡΑΙΤΗΤΟ για δόσεις
            project.advance_payment = offer.advance_payment      # ΑΠΑΡΑΙΤΗΤΟ για προκαταβολή
            project.payment_terms = offer.payment_terms
            project.status = 'approved'
            project.save()

            # ΒΗΜΑ 4: 🔴 ΚΡΙΣΙΜΟ - ΜΗΝ ΑΦΑΙΡΕΣΕΤΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
            # Δημιουργεί αυτόματα ScheduledMaintenance και Expenses
            # Χωρίς αυτήν ΔΕΝ θα υπάρξει σύνδεση με το maintenance module!
            update_project_schedule(project, offer)

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
