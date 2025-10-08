from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

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

        # Δημιουργία ξεχωριστής ανακοίνωσης για γενική συνέλευση αν υπάρχει
        if instance.general_assembly_date:
            create_assembly_announcement(instance)
    else:
        # Αν ενημερώνεται το έργο και προστέθηκε general_assembly_date
        # ελέγχουμε αν υπάρχει ήδη ανακοίνωση για τη συνέλευση
        if instance.general_assembly_date:
            # Θα δημιουργήσουμε ανακοίνωση μόνο αν δεν υπάρχει ήδη για αυτή την ημερομηνία
            create_assembly_announcement(instance, check_existing=True)
            # Απενεργοποίηση ανακοίνωσης αν η ημερομηνία έχει περάσει
            deactivate_assembly_announcement(instance)

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

    # Απενεργοποίηση όλων των ανακοινώσεων προσφορών όταν επιλεγεί μία
    if not created and instance.status == 'accepted':
        deactivate_offer_announcements(instance.project)

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
            project=project,  # ← ΣΥΝΔΕΣΗ ΜΕ PROJECT
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
        
        # Έλεγχος αν υπάρχει ήδη ανακοίνωση για προσφορές αυτού του έργου
        existing_announcement = Announcement.objects.filter(
            building=offer.project.building,
            title__icontains=f"Νέα Προσφορά για: {offer.project.title}",
            is_active=True
        ).first()
        
        if existing_announcement:
            # Ενημέρωση υπάρχουσας ανακοίνωσης - προσθήκη νέας προσφοράς
            current_description = existing_announcement.description
            
            # Προσθήκη νέας προσφοράς στη λίστα
            new_offer = f"""

---

### Νέα Προσφορά από: {offer.contractor_name}

**Ποσό:** €{offer.amount:,.2f}
**Περιγραφή:** {offer.description or 'Δεν υπάρχει περιγραφή'}
{f'**Χρόνος Ολοκλήρωσης:** {offer.completion_time}' if offer.completion_time else ''}
{f'**Εγγύηση:** {offer.warranty_period}' if offer.warranty_period else ''}
{f'**Όροι Πληρωμής:** {offer.payment_terms}' if offer.payment_terms else ''}

Η προσφορά βρίσκεται υπό αξιολόγηση.
"""
            
            # Προσθέτουμε τη νέα προσφορά πριν το "Η προσφορά βρίσκεται υπό αξιολόγηση"
            if "Η προσφορά βρίσκεται υπό αξιολόγηση" in current_description:
                parts = current_description.split("Η προσφορά βρίσκεται υπό αξιολόγηση")
                existing_announcement.description = parts[0] + new_offer + "\n" + "Η προσφορά βρίσκεται υπό αξιολόγηση" + parts[1]
            else:
                existing_announcement.description = current_description + new_offer
            
            existing_announcement.updated_at = timezone.now()
            existing_announcement.save(update_fields=['description', 'updated_at'])
            
            # Ενημέρωση με WebSocket
            publish_building_event(
                building_id=offer.project.building_id,
                event_type="announcement.updated",
                payload={
                    "id": existing_announcement.id,
                    "title": existing_announcement.title,
                    "is_urgent": existing_announcement.is_urgent,
                },
            )
            return  # Τελείωσε η ενημέρωση
        
        # ΔΗΜΙΟΥΡΓΙΑ νέας ανακοίνωσης (πρώτη προσφορά για αυτό το έργο)
        announcement = Announcement.objects.create(
            building=offer.project.building,
            author=offer.project.created_by,
            project=offer.project,  # ← ΣΥΝΔΕΣΗ ΜΕ PROJECT
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
            project=project,  # ← ΣΥΝΔΕΣΗ ΜΕ PROJECT
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


def create_assembly_announcement(project: Project, check_existing: bool = False):
    """Δημιουργεί ή ενημερώνει ανακοίνωση Γενικής Συνέλευσης (ομαδοποιημένα θέματα)"""
    try:
        from announcements.models import Announcement
        from datetime import timedelta

        assembly_date = project.general_assembly_date
        today = project.created_at.date() if hasattr(project, 'created_at') else assembly_date

        # Αναζήτηση υπάρχουσας ανακοίνωσης για την ίδια ημερομηνία συνέλευσης
        existing_announcement = Announcement.objects.filter(
            building=project.building,
            title__icontains="Σύγκληση Γενικής Συνέλευσης",
            end_date=assembly_date,
            is_active=True
        ).first()

        if existing_announcement:
            # ΕΝΗΜΕΡΩΣΗ υπάρχουσας ανακοίνωσης - προσθήκη νέου θέματος
            current_description = existing_announcement.description

            # Βρίσκουμε πού τελειώνουν τα υπάρχοντα θέματα
            if "**ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:**" in current_description:
                # Προσθήκη νέου θέματος στη λίστα
                new_topic = f"""
---

### Θέμα: {project.title}

{f'**Εκτιμώμενο Κόστος:** €{project.estimated_cost:,.2f}' if project.estimated_cost else ''}
{f'**Προθεσμία Ολοκλήρωσης:** {project.deadline.strftime("%d/%m/%Y")}' if project.deadline else ''}
**Περιγραφή:** {project.description[:200]}{'...' if len(project.description) > 200 else ''}
"""
                # Προσθέτουμε το νέο θέμα πριν το "Σημαντικό:"
                if "**Σημαντικό:**" in current_description:
                    parts = current_description.split("**Σημαντικό:**")
                    existing_announcement.description = parts[0] + new_topic + "\n\n**Σημαντικό:**" + parts[1]
                else:
                    existing_announcement.description = current_description + new_topic

                existing_announcement.updated_at = timezone.now()
                existing_announcement.save(update_fields=['description', 'updated_at'])
                
                # Προσθήκη του project στη ManyToMany σχέση
                existing_announcement.projects.add(project)

                # Ενημέρωση με WebSocket
                publish_building_event(
                    building_id=project.building_id,
                    event_type="announcement.updated",
                    payload={
                        "id": existing_announcement.id,
                        "title": existing_announcement.title,
                        "is_urgent": existing_announcement.is_urgent,
                    },
                )
                return  # Τελείωσε η ενημέρωση

        # ΔΗΜΙΟΥΡΓΙΑ νέας ανακοίνωσης (πρώτο θέμα για αυτή την ημερομηνία)

        # Στοιχεία συνέλευσης
        if project.assembly_time:
            if hasattr(project.assembly_time, 'strftime'):
                assembly_time_str = project.assembly_time.strftime('%H:%M')
            else:
                assembly_time_str = str(project.assembly_time)
        else:
            assembly_time_str = '20:00'

        # Τοποθεσία/Zoom
        location_info = ""
        if project.assembly_is_online and project.assembly_zoom_link:
            location_info = f"\n**Τρόπος Συμμετοχής:** Διαδικτυακή Συνέλευση (Zoom)\n**Σύνδεσμος:** {project.assembly_zoom_link}"
        elif project.assembly_location:
            location_info = f"\n**Τοποθεσία:** {project.assembly_location}"

        announcement = Announcement.objects.create(
            building=project.building,
            author=project.created_by,
            title=f"Σύγκληση Γενικής Συνέλευσης - {assembly_date.strftime('%d/%m/%Y')}",
            description=f"""
Καλείστε να παραστείτε στη Γενική Συνέλευση των ιδιοκτητών.

**Ημερομηνία και Ώρα Συνέλευσης:** {assembly_date.strftime('%d/%m/%Y')} στις {assembly_time_str}{location_info}

**ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:**

---

### Θέμα: {project.title}

{f'**Εκτιμώμενο Κόστος:** €{project.estimated_cost:,.2f}' if project.estimated_cost else ''}
{f'**Προθεσμία Ολοκλήρωσης:** {project.deadline.strftime("%d/%m/%Y")}' if project.deadline else ''}
**Περιγραφή:** {project.description[:200]}{'...' if len(project.description) > 200 else ''}

---

**Σημαντικό:** Η παρουσία σας είναι απαραίτητη για την απαρτία της συνέλευσης.

Για περισσότερες πληροφορίες και διευκρινήσεις, παρακαλούμε επικοινωνήστε με τη διαχειριστική ομάδα.
            """.strip(),
            published=True,
            is_active=True,
            is_urgent=True,
            priority=20,
            start_date=today,
            end_date=assembly_date,
        )
        
        # Προσθήκη του project στη ManyToMany σχέση
        announcement.projects.add(project)

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

        # Δημιουργία NotificationEvent για το digest email
        try:
            from notifications.services import NotificationEventService

            NotificationEventService.create_event(
                event_type='meeting',
                building=project.building,
                title=f"Γενική Συνέλευση: {project.title}",
                description=f"Σύγκληση γενικής συνέλευσης στις {assembly_date.strftime('%d/%m/%Y')} για συζήτηση και έγκριση του έργου.",
                url=f"/projects/{project.id}",
                is_urgent=True,
                icon='📋',
                event_date=assembly_date,
                related_project_id=project.id
            )
        except Exception:
            pass  # Αν δεν υπάρχει το NotificationEventService, συνεχίζουμε

    except Exception as e:
        # Log the error but don't fail the project creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create assembly announcement for project {project.id}: {e}")


def deactivate_offer_announcements(project: Project):
    """Απενεργοποιεί όλες τις ανακοινώσεις προσφορών για ένα έργο"""
    try:
        from announcements.models import Announcement

        # Βρες όλες τις ανακοινώσεις προσφορών για αυτό το έργο
        announcements = Announcement.objects.filter(
            building=project.building,
            title__icontains=f"Νέα Προσφορά για: {project.title}",
            is_active=True
        )

        # Απενεργοποίησέ τις
        updated_count = announcements.update(is_active=False)

        if updated_count > 0:
            # Ενημέρωση με WebSocket
            publish_building_event(
                building_id=project.building_id,
                event_type="announcements.updated",
                payload={
                    "message": f"Απενεργοποιήθηκαν {updated_count} ανακοινώσεις προσφορών",
                    "project_id": str(project.id),
                },
            )

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to deactivate offer announcements for project {project.id}: {e}")


def deactivate_assembly_announcement(project: Project):
    """Απενεργοποιεί την ανακοίνωση Γενικής Συνέλευσης αν η ημερομηνία έχει περάσει"""
    try:
        from announcements.models import Announcement

        if not project.general_assembly_date:
            return

        # Έλεγχος αν η ημερομηνία έχει περάσει
        if project.general_assembly_date < timezone.now().date():
            # Βρες την ανακοίνωση της συνέλευσης
            announcements = Announcement.objects.filter(
                building=project.building,
                title__icontains="Σύγκληση Γενικής Συνέλευσης",
                end_date=project.general_assembly_date,
                is_active=True
            )

            # Απενεργοποίησέ την
            updated_count = announcements.update(is_active=False)

            if updated_count > 0:
                # Ενημέρωση με WebSocket
                publish_building_event(
                    building_id=project.building_id,
                    event_type="announcements.updated",
                    payload={
                        "message": f"Απενεργοποιήθηκε ανακοίνωση συνέλευσης που έχει παρέλθει",
                        "project_id": str(project.id),
                    },
                )

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to deactivate assembly announcement for project {project.id}: {e}")


@receiver(pre_delete, sender=Project)
def cleanup_project_todos(sender, instance: Project, **kwargs):
    """Διαγράφει συνδεδεμένα TODOs όταν διαγράφεται ένα Project"""
    try:
        from todo_management.models import TodoLink
        
        ct = ContentType.objects.get_for_model(Project)
        links = TodoLink.objects.filter(
            content_type=ct,
            object_id=instance.pk
        ).select_related('todo')
        
        for link in links:
            # Διαγραφή του TODO (το TodoLink θα διαγραφεί αυτόματα με CASCADE)
            link.todo.delete()
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to cleanup TODOs for project {instance.id}: {e}")
