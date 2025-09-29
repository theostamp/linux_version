from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import Project, Offer, ProjectVote
from todo_management.services import ensure_linked_todo, complete_linked_todo
from core.utils import publish_building_event

User = get_user_model()


@receiver(post_save, sender=Project)
def sync_project_todo(sender, instance: Project, created, **kwargs):
    """Δημιουργεί ή ενημερώνει todo για το έργο"""
    if instance.status in {"completed", "cancelled"}:
        complete_linked_todo(content_object=instance)
    else:
        ensure_linked_todo(
            content_object=instance,
            title=f"Έργο: {instance.title}",
            description=instance.description or "",
            due_at=instance.deadline,
            priority=instance.priority,
            assigned_to=instance.created_by,
            created_by=instance.created_by,
        )
    
    # Δημιουργία ανακοίνωσης για νέο έργο
    if created:
        create_project_announcement(instance)
    
    publish_building_event(
        building_id=instance.building_id,
        event_type="project.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "title": instance.title,
        },
    )


@receiver(post_save, sender=Offer)
def sync_offer_todo(sender, instance: Offer, created, **kwargs):
    """Δημιουργεί todo για αξιολόγηση προσφοράς"""
    if instance.status == 'submitted':
        ensure_linked_todo(
            content_object=instance,
            title=f"Αξιολόγηση Προσφοράς: {instance.contractor_name}",
            description=f"Προσφορά για έργο: {instance.project.title}\nΠοσό: €{instance.amount}",
            due_at=instance.project.tender_deadline,
            priority="high",
            assigned_to=None,  # Μπορεί να ανατεθεί σε διαχειριστή
            created_by=instance.project.created_by,
        )
    
    # Δημιουργία ανακοίνωσης για νέα προσφορά
    if created and instance.status == 'submitted':
        create_offer_announcement(instance)
    
    publish_building_event(
        building_id=instance.project.building_id,
        event_type="offer.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "project_id": instance.project_id,
            "contractor": instance.contractor_name,
        },
    )


@receiver(post_save, sender=ProjectVote)
def sync_vote_todo(sender, instance: ProjectVote, created, **kwargs):
    """Ενημερώνει το todo του έργου με τα αποτελέσματα ψηφοφορίας"""
    if created:
        # Μπορούμε να δημιουργήσουμε todo για συλλογή ψήφων
        ensure_linked_todo(
            content_object=instance.project,
            title=f"Συλλογή Ψήφων: {instance.project.title}",
            description=f"Ψηφοφορία από {instance.voter_name} ({instance.apartment})",
            due_at=instance.project.general_assembly_date,
            priority="medium",
            assigned_to=None,
            created_by=instance.project.created_by,
        )
        
        # Δημιουργία ανακοίνωσης για ψηφοφορία (μόνο για την πρώτη ψήφο)
        if instance.project.votes.count() == 1:
            create_vote_announcement(instance.project)
    
    publish_building_event(
        building_id=instance.project.building_id,
        event_type="project.vote",
        payload={
            "id": instance.id,
            "project_id": instance.project_id,
            "voter": instance.voter_name,
            "apartment": instance.apartment,
            "vote_type": instance.vote_type,
        },
    )


def create_project_announcement(project: Project):
    """Δημιουργεί ανακοίνωση για νέο έργο"""
    try:
        from announcements.models import Announcement
        
        # Δημιουργία ανακοίνωσης για το νέο έργο
        announcement = Announcement.objects.create(
            building=project.building,
            author=project.created_by,
            title=f"Νέο Έργο: {project.title}",
            description=f"""
Δημιουργήθηκε νέο έργο στο κτίριο:

**Τίτλος:** {project.title}
**Περιγραφή:** {project.description or 'Δεν υπάρχει περιγραφή'}
**Προτεραιότητα:** {project.get_priority_display()}
**Εκτιμώμενο Κόστος:** {f'€{project.estimated_cost:,.2f}' if project.estimated_cost else 'Δεν έχει καθοριστεί'}
{f'**Προθεσμία:** {project.deadline}' if project.deadline else ''}
{f'**Ημερομηνία Γενικής Συνελεύσης:** {project.general_assembly_date}' if project.general_assembly_date else ''}

Για περισσότερες πληροφορίες, επικοινωνήστε με τη διοίκηση.
            """.strip(),
            published=True,
            is_active=True,
            is_urgent=project.priority == 'urgent',
            priority=10 if project.priority == 'urgent' else 5,
            start_date=project.created_at.date(),
            end_date=project.deadline or None,
        )
        
        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=project.building_id,
            event_type="announcement.created",
            payload={
                "id": announcement.id,
                "title": announcement.title,
                "is_urgent": announcement.is_urgent,
            },
        )
        
    except Exception as e:
        # Log the error but don't fail the project creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create announcement for project {project.id}: {e}")


def create_offer_announcement(offer: Offer):
    """Δημιουργεί ανακοίνωση για νέα προσφορά"""
    try:
        from announcements.models import Announcement
        
        # Δημιουργία ανακοίνωσης για τη νέα προσφορά
        announcement = Announcement.objects.create(
            building=offer.project.building,
            author=offer.project.created_by,
            title=f"Νέα Προσφορά για: {offer.project.title}",
            description=f"""
Υποβλήθηκε νέα προσφορά για το έργο "{offer.project.title}":

**Συνεργείο:** {offer.contractor_name}
**Ποσό:** €{offer.amount:,.2f}
**Περιγραφή:** {offer.description or 'Δεν υπάρχει περιγραφή'}
{f'**Χρόνος Ολοκλήρωσης:** {offer.completion_time}' if offer.completion_time else ''}
{f'**Εγγύηση:** {offer.warranty_period}' if offer.warranty_period else ''}
{f'**Όροι Πληρωμής:** {offer.payment_terms}' if offer.payment_terms else ''}

Η προσφορά βρίσκεται υπό αξιολόγηση.
            """.strip(),
            published=True,
            is_active=True,
            is_urgent=False,
            priority=3,
            start_date=offer.submitted_at.date(),
            end_date=offer.project.tender_deadline,
        )
        
        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=offer.project.building_id,
            event_type="announcement.created",
            payload={
                "id": announcement.id,
                "title": announcement.title,
                "is_urgent": announcement.is_urgent,
            },
        )
        
    except Exception as e:
        # Log the error but don't fail the offer creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create announcement for offer {offer.id}: {e}")


def create_vote_announcement(project: Project):
    """Δημιουργεί ανακοίνωση για ψηφοφορία"""
    try:
        from announcements.models import Announcement
        
        # Δημιουργία ανακοίνωσης για ψηφοφορία
        announcement = Announcement.objects.create(
            building=project.building,
            author=project.created_by,
            title=f"Ψηφοφορία για: {project.title}",
            description=f"""
Ανακοινώνεται ψηφοφορία για το έργο "{project.title}".

{f'**Ημερομηνία Γενικής Συνελεύσης:** {project.general_assembly_date}' if project.general_assembly_date else ''}

Όλοι οι ιδιοκτήτες καλούνται να συμμετάσχουν στην ψηφοφορία για την έγκριση του έργου.

Για περισσότερες πληροφορίες, επικοινωνήστε με τη διοίκηση.
            """.strip(),
            published=True,
            is_active=True,
            is_urgent=True,
            priority=15,
            start_date=project.created_at.date(),
            end_date=project.general_assembly_date,
        )
        
        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=project.building_id,
            event_type="announcement.created",
            payload={
                "id": announcement.id,
                "title": announcement.title,
                "is_urgent": announcement.is_urgent,
            },
        )
        
    except Exception as e:
        # Log the error but don't fail the vote creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create vote announcement for project {project.id}: {e}")


