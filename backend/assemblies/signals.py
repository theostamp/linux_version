"""
Assembly Signals
Αυτόματες ενέργειες για συνελεύσεις
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
import logging

from .models import Assembly, AgendaItem, AssemblyAttendee, AssemblyVote

logger = logging.getLogger(__name__)


@receiver(post_save, sender=AssemblyVote)
def sync_assembly_vote_to_vote_submission(sender, instance, created, **kwargs):
    """
    Συγχρονισμός AssemblyVote -> VoteSubmission (linked vote)
    Όταν κάποιος ψηφίζει σε θέμα συνέλευσης, η ψήφος καταγράφεται 
    και στο linked Vote για ενιαία αποτελέσματα.
    """
    if not created:
        return
    
    try:
        agenda_item = instance.agenda_item
        linked_vote = agenda_item.linked_vote
        
        if not linked_vote:
            logger.debug(f"No linked vote for agenda item {agenda_item.id}, skipping sync")
            return
        
        # Get user from attendee
        user = instance.attendee.user
        if not user:
            logger.warning(f"No user for attendee {instance.attendee.id}, skipping VoteSubmission sync")
            return
        
        # Map AssemblyVote.vote -> VoteSubmission.choice
        vote_mapping = {
            'approve': 'ΝΑΙ',
            'reject': 'ΟΧΙ',
            'abstain': 'ΛΕΥΚΟ',
        }
        choice = vote_mapping.get(instance.vote)
        if not choice:
            logger.warning(f"Unknown vote value '{instance.vote}', skipping sync")
            return
        
        # Map vote_source
        source_mapping = {
            'pre_vote': 'pre_vote',
            'live': 'live',
            'proxy': 'proxy',
        }
        vote_source = source_mapping.get(instance.vote_source, 'app')
        
        # Create or update VoteSubmission
        from votes.models import VoteSubmission
        
        submission, was_created = VoteSubmission.objects.update_or_create(
            vote=linked_vote,
            user=user,
            defaults={
                'choice': choice,
                'vote_source': vote_source,
            }
        )
        
        action = "Created" if was_created else "Updated"
        logger.info(f"{action} VoteSubmission for user {user.email} on vote {linked_vote.id} ({choice}, {vote_source})")
        
    except Exception as e:
        logger.error(f"Error syncing AssemblyVote {instance.id} to VoteSubmission: {e}")


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

