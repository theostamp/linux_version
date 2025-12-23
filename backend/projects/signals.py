from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
import re

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
        # Δημιουργία αυτόματης ψηφοφορίας για έγκριση έργου (ΠΑΝΤΑ για νέα έργα)
        create_project_vote(instance)

        # Δημιουργία ξεχωριστής ανακοίνωσης για γενική συνέλευση αν υπάρχει
        # Ελέγχουμε και general_assembly_date και linked_assembly
        if instance.general_assembly_date or instance.linked_assembly:
            create_assembly_announcement(instance)
    else:
        # Αν ενημερώνεται το έργο και προστέθηκε general_assembly_date ή linked_assembly
        # ελέγχουμε αν υπάρχει ήδη ανακοίνωση για τη συνέλευση
        if instance.general_assembly_date or instance.linked_assembly:
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

Για περισσότερες πληροφορίες, επικοινωνήστε με τη διαχείριση.
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
        
        project = offer.project
        
        # Έλεγχος αν υπάρχει ανακοίνωση συνέλευσης για αυτό το έργο
        # Αν υπάρχει, ενημερώνουμε αυτήν αντί να δημιουργούμε ξεχωριστή
        assembly_announcement = None
        if project.linked_assembly or project.general_assembly_date:
            assembly_date = project.linked_assembly.scheduled_date if project.linked_assembly else project.general_assembly_date
            assembly_announcement = (
                Announcement.objects
                .filter(
                    building=project.building,
                    title__icontains=f"Σύγκληση Γενικής Συνέλευσης",
                    projects=project,
                    is_active=True
                )
                .first()
            )
        
        if assembly_announcement:
            # Ενημέρωση ανακοίνωσης συνέλευσης με πλήθος προσφορών
            offers_count = project.offers.filter(status='submitted').count()
            
            # Προσθήκη/ενημέρωση πληροφορίας για προσφορές στην περιγραφή
            current_description = assembly_announcement.description
            
            # Έλεγχος αν υπάρχει ήδη πληροφορία για προσφορές
            if "προσφορές" in current_description.lower() or "προσφορά" in current_description.lower():
                # Ενημέρωση υπάρχουσας αναφοράς
                # Αντικατάσταση παλιού πλήθους με νέο
                pattern = r'(\d+)\s+προσφορές?\s+προς\s+έγκριση'
                if re.search(pattern, current_description, re.IGNORECASE):
                    current_description = re.sub(
                        pattern,
                        f'{offers_count} {"προσφορά" if offers_count == 1 else "προσφορές"} προς έγκριση',
                        current_description,
                        flags=re.IGNORECASE
                    )
                else:
                    # Προσθήκη νέας πληροφορίας
                    offers_info = f"\n\n**Προσφορές:** Έχουν συγκεντρωθεί {offers_count} {'προσφορά' if offers_count == 1 else 'προσφορές'} προς έγκριση."
                    current_description = current_description + offers_info
            else:
                # Προσθήκη νέας πληροφορίας για προσφορές
                offers_info = f"\n\n**Προσφορές:** Έχουν συγκεντρωθεί {offers_count} {'προσφορά' if offers_count == 1 else 'προσφορές'} προς έγκριση."
                current_description = current_description + offers_info
            
            assembly_announcement.description = current_description
            assembly_announcement.updated_at = timezone.now()
            assembly_announcement.save(update_fields=['description', 'updated_at'])
            
            # Ενημέρωση με WebSocket
            publish_building_event(
                building_id=project.building_id,
                event_type="announcement.updated",
                payload={
                    "id": assembly_announcement.id,
                    "title": assembly_announcement.title,
                    "is_urgent": assembly_announcement.is_urgent,
                },
            )
            return  # Τελείωσε η ενημέρωση
        
        # Αν δεν υπάρχει ανακοίνωση συνέλευσης, δημιουργούμε ξεχωριστή για προσφορές
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

Για περισσότερες πληροφορίες, επικοινωνήστε με τη διαχείριση.
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


def _build_assembly_topic(project: Project) -> str:
    description = project.description or "Δεν υπάρχει περιγραφή"
    trimmed_description = description if len(description) <= 200 else f"{description[:200]}..."

    lines = [
        "---",
        f"### Θέμα: {project.title}",
    ]

    if project.estimated_cost:
        lines.append(f"**Εκτιμώμενο Κόστος:** €{project.estimated_cost:,.2f}")
    if project.deadline:
        lines.append(f"**Προθεσμία Ολοκλήρωσης:** {project.deadline.strftime('%d/%m/%Y')}")

    lines.append(f"**Περιγραφή:** {trimmed_description}")
    return "\n".join(line for line in lines if line.strip())


def _build_assembly_description(projects, assembly_date, assembly_time_str, location_info):
    header = (
        "Καλείστε να παραστείτε στη Γενική Συνέλευση των ιδιοκτητών.\n\n"
        f"**Ημερομηνία και Ώρα Συνέλευσης:** {assembly_date.strftime('%d/%m/%Y')} στις {assembly_time_str}{location_info}\n\n"
        "**ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:**\n\n"
    )

    topics = "\n\n".join(_build_assembly_topic(project) for project in projects if project)
    footer = (
        "\n\n**Σημαντικό:** Η παρουσία σας είναι απαραίτητη για την απαρτία της συνέλευσης.\n\n"
        "Για περισσότερες πληροφορίες και διευκρινήσεις, παρακαλούμε επικοινωνήστε με τη Διαχείρηση."
    )

    return f"{header}{topics}{footer}".strip()


def create_assembly_announcement(project: Project, check_existing: bool = False):
    """Δημιουργεί ή ενημερώνει ανακοίνωση Γενικής Συνέλευσης (ομαδοποιημένα θέματα)"""
    try:
        from announcements.models import Announcement

        # Προτεραιότητα: linked_assembly > general_assembly_date
        assembly = project.linked_assembly
        if assembly:
            assembly_date = assembly.scheduled_date
            assembly_time_str = assembly.scheduled_time.strftime('%H:%M') if assembly.scheduled_time else '20:00'
            location_info = ""
            if assembly.is_online and assembly.meeting_link:
                location_info = f"\n**Τρόπος Συμμετοχής:** Διαδικτυακή Συνέλευση (Zoom)\n**Σύνδεσμος:** {assembly.meeting_link}"
            elif assembly.location:
                location_info = f"\n**Τοποθεσία:** {assembly.location}"
        elif project.general_assembly_date:
            assembly_date = project.general_assembly_date
            # Στοιχεία συνέλευσης
            if project.assembly_time:
                if hasattr(project.assembly_time, 'strftime'):
                    assembly_time_str = project.assembly_time.strftime('%H:%M')
                else:
                    assembly_time_str = str(project.assembly_time)
            else:
                assembly_time_str = '20:00'

            location_info = ""
            if project.assembly_is_online and project.assembly_zoom_link:
                location_info = f"\n**Τρόπος Συμμετοχής:** Διαδικτυακή Συνέλευση (Zoom)\n**Σύνδεσμος:** {project.assembly_zoom_link}"
            elif project.assembly_location:
                location_info = f"\n**Τοποθεσία:** {project.assembly_location}"
        else:
            return

        today = project.created_at.date() if hasattr(project, 'created_at') else assembly_date
        title = f"Σύγκληση Γενικής Συνέλευσης - {assembly_date.strftime('%d/%m/%Y')}"

        # Εύρεση υπάρχουσας ανακοίνωσης (μόνο όσες σχετίζονται ήδη με έργα)
        existing_announcement = (
            Announcement.objects
            .filter(
                building=project.building,
                title=title,
                projects__isnull=False,
            )
            .distinct()
            .first()
        )

        if existing_announcement:
            projects_for_description = list(existing_announcement.projects.all())

            if not any(p.id == project.id for p in projects_for_description):
                projects_for_description.append(project)
                existing_announcement.projects.add(project)

            # Αναδόμηση περιγραφής με βάση όλα τα συνδεδεμένα έργα
            projects_for_description = sorted(
                projects_for_description,
                key=lambda p: p.created_at or timezone.now()
            )

            existing_announcement.description = _build_assembly_description(
                projects_for_description,
                assembly_date,
                assembly_time_str,
                location_info,
            )
            if not existing_announcement.start_date:
                existing_announcement.start_date = today
            existing_announcement.end_date = assembly_date
            existing_announcement.updated_at = timezone.now()
            existing_announcement.save(update_fields=['description', 'start_date', 'end_date', 'updated_at'])

            publish_building_event(
                building_id=project.building_id,
                event_type="announcement.updated",
                payload={
                    "id": existing_announcement.id,
                    "title": existing_announcement.title,
                    "is_urgent": existing_announcement.is_urgent,
                },
            )
            return

        # Αν δεν υπάρχει, δημιουργούμε νέα ανακοίνωση
        announcement = Announcement.objects.create(
            building=project.building,
            author=project.created_by,
            title=title,
            description=_build_assembly_description([project], assembly_date, assembly_time_str, location_info),
            published=True,
            is_active=True,
            is_urgent=True,
            priority=20,
            start_date=today,
            end_date=assembly_date,
        )

        announcement.projects.add(project)

        publish_building_event(
            building_id=project.building_id,
            event_type="announcement.created",
            payload={
                "id": announcement.id,
                "title": announcement.title,
                "is_urgent": announcement.is_urgent,
            },
        )

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
                event_date=timezone.make_aware(
                    timezone.datetime.combine(assembly_date, timezone.datetime.min.time())
                ) if assembly_date else None,
                related_project_id=project.id
            )
        except Exception:
            pass  # Αν δεν υπάρχει το NotificationEventService, συνεχίζουμε

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create assembly announcement for project {project.id}: {e}")


def create_project_vote(project: Project):
    """Δημιουργεί αυτόματα ψηφοφορία για έγκριση έργου"""
    try:
        from votes.models import Vote
        
        # Έλεγχος αν υπάρχει ήδη ψηφοφορία για αυτό το έργο
        existing_vote = Vote.objects.filter(
            project=project,
            is_active=True
        ).first()
        
        if existing_vote:
            # Αν υπάρχει ήδη ενεργή ψηφοφορία, δεν δημιουργούμε νέα
            return
        
        # Προσδιορισμός end_date: προτεραιότητα σε general_assembly_date, μετά deadline, μετά None
        end_date = None
        if project.general_assembly_date:
            end_date = project.general_assembly_date
        elif project.deadline:
            end_date = project.deadline
        
        # Δημιουργία νέας ψηφοφορίας
        vote = Vote.objects.create(
            building=project.building,
            project=project,
            creator=project.created_by,
            title=f"Έγκριση Έργου: {project.title}",
            description=f"""Ψηφοφορία για την έγκριση του έργου "{project.title}".

**Περιγραφή:** {project.description or 'Δεν έχει δοθεί περιγραφή'}

{f'**Εκτιμώμενο Κόστος:** €{project.estimated_cost:,.2f}' if project.estimated_cost else '**Εκτιμώμενο Κόστος:** Δεν έχει καθοριστεί'}

{f'**Ημερομηνία Γενικής Συνελεύσης:** {project.general_assembly_date.strftime("%d/%m/%Y")}' if project.general_assembly_date else ''}

{f'**Προθεσμία Ολοκλήρωσης:** {project.deadline.strftime("%d/%m/%Y")}' if project.deadline else ''}

Όλοι οι ιδιοκτήτες καλούνται να συμμετάσχουν στην ψηφοφορία για την έγκριση του έργου.""",
            start_date=project.created_at.date(),
            end_date=end_date,
            is_active=True,
            is_urgent=True,
            min_participation=0,  # Default - μπορεί να αλλάξει από τον διαχειριστή
        )
        
        # Ενημέρωση με WebSocket
        publish_building_event(
            building_id=project.building_id,
            event_type="vote.created",
            payload={
                "id": vote.id,
                "title": vote.title,
                "project_id": str(project.id),
                "is_urgent": vote.is_urgent,
            },
        )
        
    except Exception as e:
        # Log the error but don't fail the project creation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create vote for project {project.id}: {e}")


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

        # Προτεραιότητα: linked_assembly > general_assembly_date
        assembly_date = None
        if project.linked_assembly:
            assembly_date = project.linked_assembly.scheduled_date
        elif project.general_assembly_date:
            assembly_date = project.general_assembly_date
        
        if not assembly_date:
            return

        # Έλεγχος αν η ημερομηνία έχει περάσει
        if assembly_date < timezone.now().date():
            # Βρες την ανακοίνωση της συνέλευσης
            announcements = Announcement.objects.filter(
                building=project.building,
                title__icontains="Σύγκληση Γενικής Συνέλευσης",
                end_date=assembly_date,
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


@receiver(post_save, sender=Project)
def sync_project_to_scheduled_maintenance(sender, instance: Project, created, **kwargs):
    """
    ⚙️ DUAL-DIRECTION SYNC: Project → ScheduledMaintenance
    Όταν ενημερώνεται ένα Project, συγχρονίζει τα payment fields στο ScheduledMaintenance
    """
    # Αποφυγή άπειρου loop
    if hasattr(instance, '_syncing_to_maintenance'):
        return

    # Μόνο αν το Project έχει linked ScheduledMaintenance
    try:
        from maintenance.models import ScheduledMaintenance

        scheduled_maintenance = ScheduledMaintenance.objects.filter(
            linked_project=instance
        ).first()

        if not scheduled_maintenance:
            return

        # Flag για αποφυγή άπειρου loop
        scheduled_maintenance._syncing = True

        # Ενημέρωση ScheduledMaintenance fields από Project
        updated = False

        if scheduled_maintenance.payment_method != instance.payment_method:
            scheduled_maintenance.payment_method = instance.payment_method
            updated = True

        if scheduled_maintenance.installments != instance.installments:
            scheduled_maintenance.installments = instance.installments
            updated = True

        if scheduled_maintenance.advance_payment != instance.advance_payment:
            scheduled_maintenance.advance_payment = instance.advance_payment
            updated = True

        if scheduled_maintenance.payment_terms != instance.payment_terms:
            scheduled_maintenance.payment_terms = instance.payment_terms
            updated = True

        if scheduled_maintenance.total_cost != instance.final_cost:
            scheduled_maintenance.total_cost = instance.final_cost
            updated = True

        if updated:
            scheduled_maintenance.save(update_fields=[
                'payment_method', 'installments', 'advance_payment',
                'payment_terms', 'total_cost'
            ])
            print(f"✅ Synced Project #{instance.id} payment fields to ScheduledMaintenance #{scheduled_maintenance.id}")

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to sync Project to ScheduledMaintenance for project {instance.id}: {e}")
    finally:
        # Καθαρισμός flag
        if 'scheduled_maintenance' in locals() and hasattr(scheduled_maintenance, '_syncing'):
            delattr(scheduled_maintenance, '_syncing')


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


@receiver(pre_delete, sender=Project)
def cleanup_project_related_objects(sender, instance: Project, **kwargs):
    """
    Καθαρισμός ΟΛΩΝ των συνδεδεμένων objects όταν διαγράφεται ένα Project:
    - Ανακοινώσεις (Notifications)
    - Ψηφοφορίες (Votes) 
    - Δαπάνες (Expenses) που δεν έχουν πληρωθεί
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # 1. Διαγραφή Ανακοινώσεων
        try:
            from notifications.models import NotificationEvent
            project_notifications = NotificationEvent.objects.filter(
                building=instance.building,
                title__icontains=instance.title
            )
            notif_count = project_notifications.count()
            if notif_count > 0:
                project_notifications.delete()
                logger.info(f"✅ Διαγράφηκαν {notif_count} ανακοινώσεις για project '{instance.title}'")
        except Exception as e:
            logger.error(f"❌ Σφάλμα διαγραφής ανακοινώσεων: {e}")
        
        # 2. Διαγραφή Ψηφοφοριών
        try:
            # Προσπάθεια import voting module (αν υπάρχει)
            try:
                from voting.models import Vote
                project_votes = Vote.objects.filter(
                    building=instance.building,
                    title__icontains=instance.title
                )
                votes_count = project_votes.count()
                if votes_count > 0:
                    project_votes.delete()
                    logger.info(f"✅ Διαγράφηκαν {votes_count} ψηφοφορίες για project '{instance.title}'")
            except ImportError:
                logger.info("ℹ️ Voting module δεν βρέθηκε - παράλειψη")
        except Exception as e:
            logger.error(f"❌ Σφάλμα διαγραφής ψηφοφοριών: {e}")
        
        # 3. Διαγραφή Δαπανών (ΜΟΝΟ αν δεν έχουν πληρωθεί)
        try:
            from financial.models import Expense
            project_expenses = Expense.objects.filter(project=instance)
            
            # Έλεγχος για πληρωμένες δαπάνες
            expenses_with_payments = []
            for exp in project_expenses:
                # Έλεγχος αν υπάρχουν receipts από maintenance
                try:
                    if exp.linked_service_receipts.exists():
                        expenses_with_payments.append(exp)
                except:
                    pass
            
            if expenses_with_payments:
                logger.warning(
                    f"⚠️ ΠΡΟΣΤΑΣΙΑ: {len(expenses_with_payments)} δαπάνες με πληρωμές δεν διαγράφονται"
                )
            else:
                expenses_count = project_expenses.count()
                if expenses_count > 0:
                    project_expenses.delete()
                    logger.info(f"✅ Διαγράφηκαν {expenses_count} δαπάνες για project '{instance.title}'")
        except Exception as e:
            logger.error(f"❌ Σφάλμα διαγραφής δαπανών: {e}")
        
        logger.info(f"✅ Cleanup ολοκληρώθηκε για project '{instance.title}' (ID: {instance.id})")
        
    except Exception as e:
        logger.error(f"❌ Σφάλμα γενικού cleanup για project {instance.id}: {e}")
