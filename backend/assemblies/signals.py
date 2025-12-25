"""
Assembly Signals
Αυτόματες ενέργειες για συνελεύσεις
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from datetime import datetime, time, timedelta
import logging

from .models import Assembly, AgendaItem, AssemblyAttendee, AssemblyVote

logger = logging.getLogger(__name__)


def _build_assembly_topic(project):
    """Βοηθητική συνάρτηση για δημιουργία περιγραφής θέματος"""
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


def _build_assembly_description_for_projects(projects, assembly_date, assembly_time_str, location_info):
    """Δημιουργεί περιγραφή ανακοίνωσης συνέλευσης με θέματα από έργα"""
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


@receiver(post_save, sender=AssemblyVote)
def update_assembly_quorum_on_vote(sender, instance, **kwargs):
    """
    Ενημέρωση απαρτίας όταν καταχωρείται/ενημερώνεται ψήφος.
    Η απαρτία μετράει παρόντες ΚΑΙ όσους έχουν ψηφίσει (pre-vote/live/proxy).
    """
    try:
        instance.agenda_item.assembly.check_quorum()
    except Exception as e:
        logger.warning(f"Failed to update quorum after vote {instance.id}: {e}")


@receiver(post_save, sender=AgendaItem)
def create_vote_for_voting_item(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία Vote για voting agenda items
    """
    if not created:
        return
    
    if instance.item_type != 'voting':
        return
    
    if instance.linked_vote:
        return
    
    # Import here to avoid circular imports
    try:
        from .services import VoteIntegrationService
        service = VoteIntegrationService(instance)
        service.create_linked_vote()
    except Exception as e:
        # Log but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to create linked vote for agenda item {instance.id}: {e}")


@receiver(post_save, sender=Assembly)
def initialize_attendees_from_apartments(sender, instance, created, **kwargs):
    """
    Δημιουργία attendee records για όλα τα διαμερίσματα όταν δημιουργείται συνέλευση
    """
    if not created:
        return
    
    # Skip if already has attendees
    if instance.attendees.exists():
        return
    
    try:
        from apartments.models import Apartment
        
        apartments = Apartment.objects.filter(building=instance.building)
        
        attendees_to_create = []
        for apartment in apartments:
            attendee = AssemblyAttendee(
                assembly=instance,
                apartment=apartment,
                user=apartment.owner_user or apartment.tenant_user,
                mills=getattr(apartment, 'participation_mills', 0) or getattr(apartment, 'mills', 0) or 0
            )
            attendees_to_create.append(attendee)
        
        AssemblyAttendee.objects.bulk_create(attendees_to_create)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to initialize attendees for assembly {instance.id}: {e}")


@receiver(pre_save, sender=Assembly)
def calculate_total_building_mills(sender, instance, **kwargs):
    """
    Υπολογισμός συνολικών μιλεσίμων κτιρίου αν δεν έχει οριστεί
    """
    if instance.total_building_mills == 1000 and instance.building:
        try:
            from django.db.models import Sum
            from apartments.models import Apartment
            total = Apartment.objects.filter(
                building=instance.building
            ).aggregate(
                total=Sum('participation_mills')
            )['total'] or 0
            
            if total > 0:
                instance.total_building_mills = total
        except Exception:
            pass


@receiver(post_save, sender=Assembly)
def set_default_pre_voting_dates(sender, instance, created, **kwargs):
    """
    Ορισμός default pre-voting dates
    """
    if not created:
        return
    
    if not instance.pre_voting_enabled:
        return
    
    if instance.pre_voting_start_date or instance.pre_voting_end_date:
        return
    
    from datetime import timedelta
    
    # Default: Pre-voting starts 7 days before, ends 1 day before
    instance.pre_voting_start_date = instance.scheduled_date - timedelta(days=7)
    instance.pre_voting_end_date = instance.scheduled_date - timedelta(days=1)
    
    instance.save(update_fields=['pre_voting_start_date', 'pre_voting_end_date'])


@receiver(post_save, sender=AssemblyAttendee)
def update_assembly_quorum_on_checkin(sender, instance, **kwargs):
    """
    Ενημέρωση απαρτίας όταν κάποιος κάνει check-in
    """
    if instance.is_present:
        # Update is handled in the check_in method
        # This is a backup in case of direct save
        instance.assembly.check_quorum()


# Track previous status for assembly status change detection
_assembly_previous_status = {}

@receiver(pre_save, sender=Assembly)
def track_assembly_status_change(sender, instance, **kwargs):
    """
    Παρακολούθηση αλλαγής status για trigger email scheduling
    """
    if instance.pk:
        try:
            old_instance = Assembly.objects.get(pk=instance.pk)
            _assembly_previous_status[instance.pk] = old_instance.status
        except Assembly.DoesNotExist:
            pass


@receiver(post_save, sender=Assembly)
def create_announcement_for_assembly(sender, instance, created, **kwargs):
    """
    Αυτόματη δημιουργία ανακοίνωσης όταν δημιουργείται συνέλευση με συνδεδεμένα έργα
    """
    if not created:
        return
    
    # Έλεγχος αν η συνέλευση έχει συνδεδεμένα έργα
    linked_projects = instance.linked_projects.all()
    if not linked_projects.exists():
        return
    
    try:
        from announcements.models import Announcement
        from core.utils import publish_building_event
        
        assembly_date = instance.scheduled_date
        assembly_time_str = instance.scheduled_time.strftime('%H:%M') if instance.scheduled_time else '20:00'
        
        location_info = ""
        if instance.is_online and instance.meeting_link:
            location_info = f"\n**Τρόπος Συμμετοχής:** Διαδικτυακή Συνέλευση (Zoom)\n**Σύνδεσμος:** {instance.meeting_link}"
        elif instance.location:
            location_info = f"\n**Τοποθεσία:** {instance.location}"
        
        today = timezone.now().date()
        title = f"Σύγκληση Γενικής Συνέλευσης - {assembly_date.strftime('%d/%m/%Y')}"
        
        # Εύρεση υπάρχουσας ανακοίνωσης για αυτή την ημερομηνία
        existing_announcement = (
            Announcement.objects
            .filter(
                building=instance.building,
                title=title,
                projects__isnull=False,
            )
            .distinct()
            .first()
        )
        
        if existing_announcement:
            # Ενημέρωση υπάρχουσας ανακοίνωσης με τα νέα έργα
            projects_for_description = list(existing_announcement.projects.all())
            
            for project in linked_projects:
                if not any(p.id == project.id for p in projects_for_description):
                    projects_for_description.append(project)
                    existing_announcement.projects.add(project)
            
            # Αναδόμηση περιγραφής
            projects_for_description = sorted(
                projects_for_description,
                key=lambda p: p.created_at or timezone.now()
            )
            
            existing_announcement.description = _build_assembly_description_for_projects(
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
            
            # Σύνδεση με Assembly
            instance.linked_announcement = existing_announcement
            instance.save(update_fields=['linked_announcement'])
            
            publish_building_event(
                building_id=instance.building_id,
                event_type="announcement.updated",
                payload={
                    "id": existing_announcement.id,
                    "title": existing_announcement.title,
                    "is_urgent": existing_announcement.is_urgent,
                },
            )
        else:
            # Δημιουργία νέας ανακοίνωσης
            # Χρειάζεται author - χρησιμοποιούμε τον creator του πρώτου έργου
            first_project = linked_projects.first()
            author = first_project.created_by
            if not author:
                # Αν δεν υπάρχει creator, χρησιμοποιούμε τον πρώτο διαθέσιμο user
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    author = User.objects.filter(tenant=instance.building.tenant).first()
                except:
                    pass
            
            announcement = Announcement.objects.create(
                building=instance.building,
                author=author,
                title=title,
                description=_build_assembly_description_for_projects(
                    list(linked_projects),
                    assembly_date,
                    assembly_time_str,
                    location_info,
                ),
                published=True,
                is_active=True,
                is_urgent=True,
                priority=20,
                start_date=today,
                end_date=assembly_date,
            )
            
            # Σύνδεση με έργα
            announcement.projects.set(linked_projects)
            
            # Σύνδεση με Assembly
            instance.linked_announcement = announcement
            instance.save(update_fields=['linked_announcement'])
            
            publish_building_event(
                building_id=instance.building_id,
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
                    building=instance.building,
                    title=f"Γενική Συνέλευση: {instance.title}",
                    description=f"Σύγκληση γενικής συνέλευσης στις {assembly_date.strftime('%d/%m/%Y')} για συζήτηση και έγκριση έργων.",
                    url=f"/assemblies/{instance.id}",
                    is_urgent=True,
                    icon='📋',
                    event_date=timezone.make_aware(
                        timezone.datetime.combine(assembly_date, timezone.datetime.min.time())
                    ) if assembly_date else None,
                )
            except Exception:
                pass  # Αν δεν υπάρχει το NotificationEventService, συνεχίζουμε
        
    except Exception as e:
        logger.error(f"Failed to create announcement for assembly {instance.id}: {e}")


@receiver(post_save, sender=Assembly)
def schedule_emails_on_convened(sender, instance, created, **kwargs):
    """
    Προγραμματισμός email reminders όταν η συνέλευση γίνει 'convened'
    """
    if created:
        return
    
    # Get previous status
    previous_status = _assembly_previous_status.pop(instance.pk, None)
    
    # Check if status just changed to 'convened'
    if previous_status != 'convened' and instance.status == 'convened':
        try:
            # Get current tenant schema
            from django.db import connection
            schema_name = connection.schema_name
            
            # Schedule the email series
            from .tasks import schedule_assembly_email_series
            schedule_assembly_email_series.delay(str(instance.id), schema_name)
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Scheduled email series for assembly {instance.id} (convened)")
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to schedule emails for assembly {instance.id}: {e}")


@receiver(post_save, sender=Assembly)
def send_initial_notifications_on_creation(sender, instance: Assembly, created, **kwargs):
    """
    Στέλνει άμεσα ειδοποιήσεις (email + Viber αν είναι ενεργό) όταν δημιουργείται συνέλευση.
    Χρησιμοποιεί MultiChannelNotificationService ώστε να επιλέγει διαθέσιμα κανάλια για κάθε χρήστη.
    Παραλείπει αν έχει ήδη σταλεί πρόσκληση (invitation_sent=True).
    """
    if not created:
        return

    if instance.invitation_sent:
        return

    def _send():
        try:
            from notifications.multichannel_service import (
                MultiChannelNotificationService,
                RecipientChannels,
            )
            from notifications.providers.base import ChannelType
            from assemblies.tasks import send_same_day_assembly_reminder

            recipients: list[RecipientChannels] = []

            for attendee in instance.attendees.select_related("user"):
                user = attendee.user
                email = user.email if user and user.email else None

                viber_id = None
                if user and hasattr(user, "viber_subscription"):
                    sub = user.viber_subscription
                    if sub and getattr(sub, "is_subscribed", False):
                        viber_id = sub.viber_user_id

                # Αν δεν έχουμε κανένα κανάλι, προσπερνάμε
                if not email and not viber_id:
                    continue

                recipients.append(
                    RecipientChannels(
                        email=email,
                        viber_id=viber_id,
                    )
                )

            if not recipients:
                logger.info(
                    "[Assembly Notifications] No recipients with email or Viber for assembly %s",
                    instance.id,
                )
                return

            date_str = instance.scheduled_date.strftime("%d/%m/%Y") if instance.scheduled_date else ""
            time_str = (
                instance.scheduled_time.strftime("%H:%M")
                if instance.scheduled_time
                else ""
            )
            location = instance.location or "Θα ανακοινωθεί"
            title = instance.title

            subject = f"Γενική Συνέλευση: {title}"
            message = (
                f"Πρόσκληση σε Γενική Συνέλευση\n\n"
                f"Τίτλος: {title}\n"
                f"Ημερομηνία: {date_str} {time_str}\n"
                f"Τοποθεσία: {location}\n\n"
                f"Παρακαλούμε για την παρουσία σας ή/και τη συμμετοχή μέσω ψηφοφορίας."
            )

            service = MultiChannelNotificationService()
            results = service.send_bulk(
                recipients=recipients,
                subject=subject,
                message=message,
                channels=[ChannelType.EMAIL, ChannelType.VIBER],
            )

            successful = sum(1 for r in results if r.any_success)
            logger.info(
                "[Assembly Notifications] Sent initial notifications for assembly %s (success=%s / total=%s)",
                instance.id,
                successful,
                len(results),
            )

            # Μαρκάρουμε ότι στάλθηκε η πρόσκληση
            instance.invitation_sent = True
            instance.invitation_sent_at = timezone.now()
            # Δεν αλλάζουμε status εδώ για να μην συγκρουστεί με άλλα flows
            instance.save(update_fields=["invitation_sent", "invitation_sent_at"])

            # Προγραμματισμός same-day reminder (email/Viber) μόνο αν η ημερομηνία είναι μελλοντική
            if instance.scheduled_date:
                today = timezone.localdate()
                sched_date = instance.scheduled_date
                if sched_date > today:
                    # Υπολογισμός ώρας αποστολής: 3 ώρες πριν την έναρξη, αλλιώς 09:00 τοπική ώρα
                    send_at = datetime.combine(sched_date, time(9, 0, 0, tzinfo=timezone.get_current_timezone()))
                    if instance.scheduled_time:
                        start_dt = datetime.combine(
                            sched_date,
                            instance.scheduled_time,
                            tzinfo=timezone.get_current_timezone()
                        )
                        candidate = start_dt - timedelta(hours=3)
                        if candidate > timezone.now():
                            send_at = candidate
                    # Προγραμματισμός Celery task με schema name
                    from django.db import connection
                    schema_name = connection.schema_name
                    send_same_day_assembly_reminder.apply_async(
                        args=[str(instance.id), schema_name],
                        eta=send_at
                    )

        except Exception as e:
            logger.error(
                "[Assembly Notifications] Failed to send initial notifications for assembly %s: %s",
                instance.id,
                e,
            )

    # Μετά το commit ώστε να έχουν δημιουργηθεί οι attendees
    transaction.on_commit(_send)
