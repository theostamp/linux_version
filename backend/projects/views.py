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
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(
        f"update_project_schedule called for project {project.id}",
        extra={
            'project_id': str(project.id),
            'project_title': project.title,
            'offer_id': str(offer.id) if offer else None,
            'contractor_name': offer.contractor_name if offer else project.selected_contractor,
            'final_cost': float(project.final_cost) if project.final_cost else None,
        }
    )
    
    try:
        from financial.models import Expense
        from maintenance.models import ScheduledMaintenance, PaymentSchedule
        from decimal import Decimal
        from datetime import datetime, timedelta
        import calendar

        # Υπολογισμός ημερομηνίας πληρωμής
        # 🔧 FIX: Χρήση πρώτης μέρας τρέχοντος μήνα αντί για +30 ημέρες
        # Αυτό εξασφαλίζει ότι η προκαταβολή πέφτει στον ίδιο μήνα με την έγκριση
        if project.deadline:
            due_date = project.deadline
        else:
            now = datetime.now().date()
            due_date = now.replace(day=1)  # Πρώτη μέρα τρέχοντος μήνα

        # 🔴 ΚΡΙΣΙΜΟ: Δημιουργία ή ενημέρωση ScheduledMaintenance με linked_project
        # Αυτό συνδέει το approved project με το maintenance module
        scheduled_maintenance, created = ScheduledMaintenance.objects.get_or_create(
            linked_project=project,
            building=project.building,
            defaults={
                'title': project.title,
                'description': project.description or '',
                'scheduled_date': due_date,
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
        
        if created:
            logger.info(
                f"ScheduledMaintenance created for project {project.id}",
                extra={
                    'scheduled_maintenance_id': scheduled_maintenance.id,
                    'project_id': str(project.id),
                    'title': scheduled_maintenance.title,
                }
            )
        else:
            logger.info(
                f"ScheduledMaintenance updated for project {project.id}",
                extra={
                    'scheduled_maintenance_id': scheduled_maintenance.id,
                    'project_id': str(project.id),
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
        
        # 🔧 DEBUG: Log payment details για debugging
        logger.info(
            f"update_project_schedule: Payment details for project {project.id}",
            extra={
                'project_id': str(project.id),
                'payment_method': project.payment_method,
                'installments': installments,
                'advance_payment': float(advance_payment),
                'total_amount': float(total_amount),
                'will_create_installments': installments > 1 and total_amount > 0,
            }
        )

        # Επιλογή κατηγορίας
        category = 'project'
        if 'συντήρηση' in project.title.lower() or 'επισκευή' in project.title.lower():
            category = 'maintenance_project'
        elif 'ανακαίνιση' in project.title.lower():
            category = 'renovation'
        elif 'αναβάθμιση' in project.title.lower():
            category = 'upgrade'

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # 🛡️ ΠΡΟΣΤΑΣΙΑ ΥΠΑΡΧΟΥΣΩΝ ΔΑΠΑΝΩΝ (Phase 1 - Oct 8, 2025)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # 
        # ΠΡΟΒΛΗΜΑ: Η διαγραφή δαπανών χωρίς έλεγχο προκαλεί:
        # - Απώλεια πληρωμών
        # - Χάσιμο transactions
        # - Διπλές καταχωρήσεις
        #
        # ΛΥΣΗ: Διαγραφή ΜΟΝΟ αν:
        # 1. Δεν έχουν πληρωθεί
        # 2. Είναι πρόσφατες (< 24 ώρες)
        # 3. Δεν έχουν συνδεθεί με πληρωμές
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        from django.utils import timezone
        from datetime import timedelta
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Βρες υπάρχουσες δαπάνες
        old_expenses = Expense.objects.filter(
            building=project.building,
            title__icontains=project.title
        )
        
        logger.info(
            f"🔍 Checking for existing expenses for project '{project.title}'",
            extra={
                'project_id': str(project.id),
                'building_id': project.building_id,
                'existing_expenses_count': old_expenses.count(),
            }
        )
        
        if old_expenses.exists():
            logger.info(f"   Found {old_expenses.count()} existing expenses: {list(old_expenses.values('id', 'title', 'amount', 'date', 'paid_amount', 'created_at'))}")
            
            # Έλεγχος 1: Έχουν πληρωθεί;
            paid_expenses = old_expenses.exclude(
                paid_amount__isnull=True
            ).exclude(paid_amount=0)
            
            if paid_expenses.exists():
                logger.warning(
                    f"⚠️ ΠΡΟΣΤΑΣΙΑ: Βρέθηκαν {paid_expenses.count()} πληρωμένες δαπάνες "
                    f"για το έργο '{project.title}'. ΔΕΝ διαγράφονται!"
                )
                logger.info(f"   Πληρωμένες δαπάνες: {list(paid_expenses.values('id', 'title', 'amount', 'paid_amount'))}")
                # ΜΗΝ συνεχίσεις τη διαγραφή - επέστρεψε
                logger.info("   ❌ Aborting expense creation due to paid expenses")
                return
            
            # Έλεγχος 2: Είναι παλιές (> 24 ώρες);
            cutoff_time = timezone.now() - timedelta(hours=24)
            old_cutoff_expenses = old_expenses.filter(created_at__lt=cutoff_time)
            
            if old_cutoff_expenses.exists():
                logger.warning(
                    f"⚠️ ΠΡΟΣΤΑΣΙΑ: Βρέθηκαν {old_cutoff_expenses.count()} παλιές δαπάνες (>24h) "
                    f"για το έργο '{project.title}'. ΔΕΝ διαγράφονται!"
                )
                logger.info(f"   Παλιές δαπάνες: {list(old_cutoff_expenses.values('id', 'title', 'created_at'))}")
                # ΜΗΝ συνεχίσεις τη διαγραφή - επέστρεψε
                logger.info("   ❌ Aborting expense creation due to old expenses (>24h)")
                return
            
            # Έλεγχος 3: Έχουν συνδεθεί με πληρωμές μέσω maintenance;
            expenses_with_receipts = old_expenses.filter(
                maintenance_payment_receipts__isnull=False
            ).distinct()
            
            if expenses_with_receipts.exists():
                logger.warning(
                    f"⚠️ ΠΡΟΣΤΑΣΙΑ: Βρέθηκαν {expenses_with_receipts.count()} δαπάνες με συνδεδεμένες πληρωμές "
                    f"για το έργο '{project.title}'. ΔΕΝ διαγράφονται!"
                )
                logger.info(f"   Δαπάνες με receipts: {list(expenses_with_receipts.values('id', 'title'))}")
                # ΜΗΝ συνεχίσεις τη διαγραφή - επέστρεψε
                logger.info("   ❌ Aborting expense creation due to expenses with receipts")
                return
            
            # Αν όλοι οι έλεγχοι πέρασαν, κάνε log και διέγραψε
            logger.info(
                f"✅ ΑΣΦΑΛΗΣ ΔΙΑΓΡΑΦΗ: {old_expenses.count()} νέες, μη-πληρωμένες δαπάνες "
                f"για το έργο '{project.title}' θα διαγραφούν και θα ξαναδημιουργηθούν."
            )
            logger.debug(f"   Δαπάνες προς διαγραφή: {list(old_expenses.values('id', 'title', 'amount', 'date'))}")
            
            # Διαγραφή μόνο αν πέρασε όλους τους ελέγχους
            deleted_count = old_expenses.count()
            old_expenses.delete()
            logger.info(f"   ✓ Deleted {deleted_count} old expenses")
        else:
            logger.info(f"   ✓ No existing expenses found, proceeding with expense creation")

        # 🔧 FIX: Ελέγχος αν το payment_method είναι 'installments' αλλά installments <= 1
        # Σε αυτή την περίπτωση, πρέπει να χρησιμοποιήσουμε το installments από το project
        if project.payment_method == 'installments' and installments <= 1:
            logger.warning(
                f"⚠️ Project {project.id} has payment_method='installments' but installments={installments}. "
                f"This should not happen - check if installments was saved correctly."
            )
            # Αν το project έχει installments > 1, χρησιμοποίησε αυτό
            if project.installments and project.installments > 1:
                installments = project.installments
                logger.info(f"Using project.installments={installments} instead")
            else:
                logger.error(
                    f"❌ Project {project.id} has payment_method='installments' but installments is not set correctly. "
                    f"Will create one-time expense instead of installments."
                )

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
                    'start_date': due_date,
                    'notes': project.payment_terms or '',
                    'status': 'active',
                }
            )

            if not ps_created:
                payment_schedule.total_amount = total_amount
                payment_schedule.advance_percentage = advance_percentage
                payment_schedule.installment_count = installments
                payment_schedule.start_date = due_date  # 🔧 FIX: Ενημέρωση start_date
                payment_schedule.notes = project.payment_terms or ''
                payment_schedule.save()

            # Δημιουργία προκαταβολής (τρέχων μήνας)
            if advance_payment > 0:
                # Χρήση της ημερομηνίας έναρξης από το PaymentSchedule
                advance_date = payment_schedule.start_date
                advance_expense = Expense.objects.create(
                    building=project.building,
                    title=f"{project.title} - Προκαταβολή ({advance_percentage:.0f}%)",
                    amount=advance_payment,
                    category=category,
                    date=advance_date,
                    due_date=advance_date + timedelta(days=15),
                    distribution_type='by_participation_mills',
                    notes=f"Προκαταβολή {advance_percentage:.0f}% για έργο. Συνολικό κόστος: {total_amount}€. Ανάδοχος: {project.selected_contractor}",
                    # 🔗 Σύνδεση με project για ιχνηλασία
                    project=project,
                    # 📝 Audit Trail
                    audit_trail={
                        'created_from': 'offer_approval',
                        'offer_id': str(offer.id) if offer else None,
                        'project_id': str(project.id),
                        'scheduled_maintenance_id': scheduled_maintenance.id if scheduled_maintenance else None,
                        'installment_type': 'advance_payment',
                        'installment_number': 0,
                        'total_installments': installments,
                        'created_at': datetime.now().isoformat(),
                    },
                )
                logger.info(
                    f"Advance payment expense created for project {project.id}",
                    extra={
                        'expense_id': advance_expense.id,
                        'project_id': str(project.id),
                        'amount': float(advance_payment),
                        'date': str(advance_date),
                    }
                )

            # Δημιουργία δόσεων (μελλοντικοί μήνες)
            # ΔΙΟΡΘΩΣΗ: Οι δόσεις ξεκινούν από τον ΕΠΟΜΕΝΟ μήνα μετά την προκαταβολή
            remaining_amount = total_amount - advance_payment
            installment_amount = remaining_amount / installments

            # Χρήση της ημερομηνίας έναρξης από το PaymentSchedule ως base_date
            base_date = payment_schedule.start_date

            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            # ⚠️ ΚΡΙΣΙΜΟ: PROJECT INSTALLMENTS LOGIC
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            #
            # ΝΕΟΣ ΚΑΝΟΝΑΣ (2025-10-08):
            # - Οι δόσεις ξεκινούν από τον ΑΜΕΣΩΣ ΕΠΟΜΕΝΟ μήνα μετά την προκαταβολή
            # - Όλες οι χρεώσεις γίνονται την 1η του μήνα
            # - month_offset = i (όχι i+1) - απλός μετρητής
            #
            # ΠΑΡΑΔΕΙΓΜΑ:
            # - Προκαταβολή: 01/10/2025 (Οκτώβριος)
            # - Δόση 1: 01/11/2025 (Νοέμβριος) 
            # - Δόση 2: 01/12/2025 (Δεκέμβριος)
            # - κλπ...
            #
            # Βλέπε: BALANCE_TRANSFER_ARCHITECTURE.md
            # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            for i in range(1, installments + 1):
                # Υπολογισμός μήνα δόσης: Αν έχουμε προκαταβολή, προσθέτουμε i μήνες (όχι i+1)
                month_offset = i

                payment_month_start = base_date.replace(day=1)
                # Προσθήκη μηνών
                month = payment_month_start.month + month_offset
                year = payment_month_start.year
                while month > 12:
                    month -= 12
                    year += 1
                payment_month_start = payment_month_start.replace(month=month, year=year)

                # Η ημερομηνία χρέωσης είναι ΠΑΝΤΑ η 1η του μήνα
                installment_date = payment_month_start.replace(day=1)
                due_date = installment_date  # date == due_date για δόσεις

                installment_expense = Expense.objects.create(
                    building=project.building,
                    title=f"{project.title} - Δόση {i}/{installments}",
                    amount=installment_amount,
                    category=category,
                    date=installment_date,
                    due_date=due_date,
                    distribution_type='by_participation_mills',
                    notes=f"Δόση {i} από {installments} για έργο. Ποσό δόσης: {installment_amount:.2f}€. Ανάδοχος: {project.selected_contractor}",
                    # 🔗 Σύνδεση με project για ιχνηλασία
                    project=project,
                    # 📝 Audit Trail
                    audit_trail={
                        'created_from': 'offer_approval',
                        'offer_id': str(offer.id) if offer else None,
                        'project_id': str(project.id),
                        'scheduled_maintenance_id': scheduled_maintenance.id if scheduled_maintenance else None,
                        'installment_type': 'monthly_installment',
                        'installment_number': i,
                        'total_installments': installments,
                        'created_at': datetime.now().isoformat(),
                    },
                )
                logger.info(
                    f"Installment expense {i}/{installments} created for project {project.id}",
                    extra={
                        'expense_id': installment_expense.id,
                        'project_id': str(project.id),
                        'installment_number': i,
                        'total_installments': installments,
                        'amount': float(installment_amount),
                        'date': str(installment_date),
                    }
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
                # 🔗 Σύνδεση με project για ιχνηλασία
                project=project,
                # 📝 Audit Trail
                audit_trail={
                    'created_from': 'offer_approval',
                    'offer_id': str(offer.id) if offer else None,
                    'project_id': str(project.id),
                    'scheduled_maintenance_id': scheduled_maintenance.id if scheduled_maintenance else None,
                    'installment_type': 'lump_sum',
                    'installment_number': 0,
                    'total_installments': 1,
                    'created_at': datetime.now().isoformat(),
                },
            )

            # Σύνδεση του έργου με τη δαπάνη
            project.linked_expense = expense
            project.save(update_fields=['linked_expense'])
            logger.info(
                f"One-time expense created for project {project.id}",
                extra={
                    'expense_id': expense.id,
                    'project_id': str(project.id),
                    'amount': float(total_amount),
                    'date': str(project.created_at.date()),
                }
            )

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
        
        # Μέτρηση δημιουργημένων δαπανών
        created_expenses = Expense.objects.filter(
            building=project.building,
            title__icontains=project.title
        )
        
        logger.info(
            f"✅ update_project_schedule completed successfully for project {project.id}",
            extra={
                'project_id': str(project.id),
                'scheduled_maintenance_id': scheduled_maintenance.id if scheduled_maintenance else None,
                'payment_method': project.payment_method,
                'installments': installments,
                'total_expenses_created': created_expenses.count(),
                'expenses_list': list(created_expenses.values('id', 'title', 'amount', 'date')),
            }
        )
        
    except Exception as e:
        # Log the error but don't fail the project approval
        logger.error(
            f"Failed to update project schedule for project {project.id}: {e}",
            extra={
                'project_id': str(project.id),
                'error_type': type(e).__name__,
                'error_message': str(e),
            },
            exc_info=True
        )


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
    def sync_expenses(self, request, pk=None):
        """
        🔄 MANUAL EXPENSE SYNC TOOL
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Επανασυγχρονίζει τις δαπάνες του έργου με τα τρέχοντα payment data.

        Parameters:
            - preview (bool): True για προεπισκόπηση, False για εκτέλεση
            - confirm (bool): Απαιτείται True για εκτέλεση (safety check)

        Returns:
            - Αν preview=True: Λίστα με current/new expenses
            - Αν preview=False: Αποτέλεσμα συγχρονισμού
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """
        from financial.models import Expense

        project = self.get_object()
        preview = request.data.get('preview', False)
        confirm = request.data.get('confirm', False)

        # Έλεγχος αν το project έχει approved offer
        if not project.has_approved_offer:
            return Response(
                {'detail': 'Το έργο δεν έχει εγκεκριμένη προσφορά'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Εύρεση υπαρχουσών δαπανών που δημιουργήθηκαν από αυτό το project
        current_expenses = Expense.objects.filter(project=project).order_by('date')

        if preview:
            # PREVIEW MODE: Επιστρέφει τι θα αλλάξει
            # Υπολογισμός νέων δαπανών (χωρίς δημιουργία)
            new_expenses_data = []

            if project.installments and project.installments > 1:
                # Προκαταβολή
                if project.advance_payment and project.advance_payment > 0:
                    new_expenses_data.append({
                        'title': f"{project.title} - Προκαταβολή",
                        'amount': str(project.advance_payment),
                        'date': str(project.deadline or project.created_at.date()),
                        'installment_number': 0,
                    })

                # Δόσεις
                remaining = (project.final_cost or 0) - (project.advance_payment or 0)
                installment_amount = remaining / project.installments

                for i in range(1, project.installments + 1):
                    new_expenses_data.append({
                        'title': f"{project.title} - Δόση {i}/{project.installments}",
                        'amount': f"{installment_amount:.2f}",
                        'date': 'TBD',  # Θα υπολογιστεί στην πραγματική δημιουργία
                        'installment_number': i,
                    })
            else:
                # Εφάπαξ
                new_expenses_data.append({
                    'title': f"Έργο: {project.title}",
                    'amount': str(project.final_cost or 0),
                    'date': str(project.created_at.date()),
                    'installment_number': 0,
                })

            return Response({
                'will_delete': current_expenses.count(),
                'will_create': len(new_expenses_data),
                'current_expenses': [
                    {
                        'id': exp.id,
                        'title': exp.title,
                        'amount': str(exp.amount),
                        'date': str(exp.date),
                    }
                    for exp in current_expenses
                ],
                'new_expenses': new_expenses_data,
            })

        else:
            # EXECUTION MODE: Πραγματική επανασυγχρονισμός
            if not confirm:
                return Response(
                    {'detail': 'Απαιτείται επιβεβαίωση (confirm=true)'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # ΒΗΜΑ 1: Διαγραφή υπαρχουσών δαπανών
                deleted_count = current_expenses.count()
                current_expenses.delete()

                # ΒΗΜΑ 2: Εύρεση εγκεκριμένης προσφοράς
                approved_offer = project.offers.filter(status='accepted').first()

                # ΒΗΜΑ 3: Επανακλήση update_project_schedule
                update_project_schedule(project, approved_offer)

                # Μέτρηση νέων δαπανών
                new_expenses = Expense.objects.filter(project=project)
                created_count = new_expenses.count()

                return Response({
                    'success': True,
                    'deleted_count': deleted_count,
                    'created_count': created_count,
                    'message': f'Διαγράφηκαν {deleted_count} δαπάνες και δημιουργήθηκαν {created_count} νέες',
                })

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

    def create(self, request, *args, **kwargs):
        """Create offer with detailed logging"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(
            f"Offer creation attempt by user {request.user.id}",
            extra={
                'user_id': request.user.id,
                'user_email': getattr(request.user, 'email', None),
                'payload': request.data,
                'building_id': request.data.get('project') and self._get_project_building_id(request.data.get('project')),
            }
        )
        
        try:
            response = super().create(request, *args, **kwargs)
            offer_id = response.data.get('id') if hasattr(response, 'data') else None
            logger.info(
                f"Offer created successfully: {offer_id}",
                extra={
                    'offer_id': offer_id,
                    'user_id': request.user.id,
                    'project_id': request.data.get('project'),
                }
            )
            return response
        except Exception as e:
            logger.error(
                f"Offer creation failed: {str(e)}",
                extra={
                    'user_id': request.user.id,
                    'payload': request.data,
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                },
                exc_info=True
            )
            raise

    def _get_project_building_id(self, project_id):
        """Helper to get building ID from project ID"""
        try:
            from .models import Project
            project = Project.objects.filter(id=project_id).first()
            return project.building_id if project else None
        except:
            return None

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
        import logging
        logger = logging.getLogger(__name__)
        
        offer = self.get_object()
        logger.info(
            f"Approving offer {offer.id} for project {offer.project.id}",
            extra={
                'offer_id': str(offer.id),
                'project_id': str(offer.project.id),
                'contractor_name': offer.contractor_name,
                'amount': float(offer.amount) if offer.amount else None,
                'user_id': request.user.id,
            }
        )
        
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
            
            # 🔧 FIX: Αν το payment_method είναι 'installments' αλλά installments είναι None, 
            # χρησιμοποιούμε προεπιλεγμένη τιμή 1 (αλλά θα πρέπει να έχει οριστεί από τον χρήστη)
            installments_value = offer.installments
            if offer.payment_method == 'installments' and (not installments_value or installments_value < 1):
                logger.warning(
                    f"⚠️ Offer {offer.id} has payment_method='installments' but installments={installments_value}. "
                    f"Using default value 1, but this should be set by the user."
                )
                installments_value = 1
            
            logger.info(
                f"Updating project {project.id} with payment details",
                extra={
                    'project_id': str(project.id),
                    'offer_id': str(offer.id),
                    'payment_method': offer.payment_method,
                    'installments': installments_value,
                    'advance_payment': float(offer.advance_payment) if offer.advance_payment else None,
                    'amount': float(offer.amount) if offer.amount else None,
                }
            )
            
            project.selected_contractor = offer.contractor_name  # ΑΠΑΡΑΙΤΗΤΟ για ScheduledMaintenance
            project.final_cost = offer.amount                    # ΑΠΑΡΑΙΤΗΤΟ για δαπάνες
            project.payment_method = offer.payment_method        # ΑΠΑΡΑΙΤΗΤΟ για τύπο πληρωμής
            project.installments = installments_value or 1       # ΑΠΑΡΑΙΤΗΤΟ για δόσεις
            project.advance_payment = offer.advance_payment      # ΑΠΑΡΑΙΤΗΤΟ για προκαταβολή
            project.payment_terms = offer.payment_terms
            project.status = 'approved'
            project.save()

            # ΒΗΜΑ 4: 🔴 ΚΡΙΣΙΜΟ - ΜΗΝ ΑΦΑΙΡΕΣΕΤΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
            # Δημιουργεί αυτόματα ScheduledMaintenance και Expenses
            # Χωρίς αυτήν ΔΕΝ θα υπάρξει σύνδεση με το maintenance module!
            logger.info(f"Calling update_project_schedule for project {project.id}")
            update_project_schedule(project, offer)
            logger.info(f"update_project_schedule completed for project {project.id}")

        logger.info(
            f"Offer {offer.id} approved successfully",
            extra={
                'offer_id': str(offer.id),
                'project_id': str(offer.project.id),
                'project_status': project.status,
                'project_final_cost': float(project.final_cost) if project.final_cost else None,
            }
        )
        
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
