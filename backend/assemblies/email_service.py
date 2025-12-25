"""
Assembly Email Service
Υπηρεσία αποστολής email για συνελεύσεις και ψηφοφορίες.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from datetime import timedelta
import logging
import hashlib
import hmac
import base64

from .models import Assembly, AgendaItem, AssemblyAttendee, AssemblyVote
from core.emailing import extract_legacy_body_html, send_templated_email

logger = logging.getLogger(__name__)


def generate_secure_vote_token(attendee_id, assembly_id) -> str:
    """
    Δημιουργεί ασφαλές token για email voting.
    Το token επιβεβαιώνει την ταυτότητα του ψηφοφόρου.
    Supports both UUID and integer IDs.
    """
    secret = settings.SECRET_KEY
    # Convert to string in case of UUID
    attendee_str = str(attendee_id)
    assembly_str = str(assembly_id)
    
    message = f"{attendee_str}:{assembly_str}:{timezone.now().date()}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).digest()
    # Use only alphanumeric characters to avoid splitting issues
    token = base64.urlsafe_b64encode(signature).decode()[:32].replace('_', 'X').replace('-', 'Y')
    return f"{attendee_str}_{assembly_str}_{token}"


def verify_vote_token(token: str) -> tuple[str, str] | None:
    """
    Επαληθεύει το token ψηφοφορίας.
    Επιστρέφει (attendee_id, assembly_id) ως strings ή None αν είναι άκυρο.
    """
    try:
        # Split only on first 2 underscores to handle UUIDs with hyphens
        parts = token.split('_')
        if len(parts) < 3:
            return None
        
        # For UUIDs, the format is: uuid_uuid_signature
        # UUIDs have format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (no underscores)
        # So we can safely split by underscore
        attendee_id = parts[0]
        assembly_id = parts[1]
        # Join remaining parts in case signature had underscores (shouldn't happen now)
        provided_signature = '_'.join(parts[2:])
        
        # Regenerate expected signature
        secret = settings.SECRET_KEY
        message = f"{attendee_id}:{assembly_id}:{timezone.now().date()}"
        expected_signature = hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        expected_token = base64.urlsafe_b64encode(expected_signature).decode()[:32].replace('_', 'X').replace('-', 'Y')
        
        if hmac.compare_digest(provided_signature, expected_token):
            return (attendee_id, assembly_id)
        
        return None
    except (ValueError, IndexError):
        return None


def get_vote_url(attendee: AssemblyAttendee, assembly: Assembly) -> str:
    """Δημιουργεί το URL για ψηφοφορία μέσω email."""
    token = generate_secure_vote_token(attendee.id, assembly.id)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://app.newconcierge.gr')
    return f"{frontend_url}/vote-by-email/{token}"


# Email tone configurations per reminder type
EMAIL_TONES = {
    'initial': {
        'subject_prefix': '🗳️',
        'subject_text': 'Η ψήφος σας μετράει',
        'header_title': 'Η ψήφος σας μετράει',
        'tone': 'informative',
        'greeting_extra': 'Σας ενημερώνουμε για την επερχόμενη Γενική Συνέλευση.',
        'cta_text': 'Ψηφίστε Τώρα',
    },
    '7days': {
        'subject_prefix': '📋',
        'subject_text': 'Ευγενική Υπενθύμιση',
        'header_title': 'Ευγενική Υπενθύμιση',
        'tone': 'gentle',
        'greeting_extra': 'Θα θέλαμε να σας υπενθυμίσουμε την επερχόμενη Γενική Συνέλευση.',
        'cta_text': 'Ψηφίστε Ηλεκτρονικά',
    },
    '3days': {
        'subject_prefix': '📋',
        'subject_text': 'Ευγενική Υπενθύμιση',
        'header_title': 'Ευγενική Υπενθύμιση',
        'tone': 'gentle',
        'greeting_extra': 'Σας υπενθυμίζουμε ότι η Γενική Συνέλευση πλησιάζει. Η συμμετοχή σας είναι σημαντική!',
        'cta_text': 'Ψηφίστε Τώρα',
    },
    '1day': {
        'subject_prefix': '⏰',
        'subject_text': 'Τελευταία Υπενθύμιση',
        'header_title': 'Τελευταία Υπενθύμιση',
        'tone': 'urgent',
        'greeting_extra': 'Η Γενική Συνέλευση είναι αύριο! Αν δεν μπορείτε να παρευρεθείτε, ψηφίστε τώρα ηλεκτρονικά.',
        'cta_text': 'Ψηφίστε Άμεσα',
    },
    'sameday': {
        'subject_prefix': '🔔',
        'subject_text': 'Σήμερα η Συνέλευση',
        'header_title': 'Σήμερα η Συνέλευση!',
        'tone': 'urgent',
        'greeting_extra': 'Η Γενική Συνέλευση είναι σήμερα! Τελευταία ευκαιρία για ηλεκτρονική ψηφοφορία.',
        'cta_text': 'Ψήφισε τώρα',
    },
    'pre_voting_open': {
        'subject_prefix': '🗳️',
        'subject_text': 'Άνοιξε το pre-voting',
        'header_title': 'Άνοιξε το Pre-voting!',
        'tone': 'informative',
        'greeting_extra': (
            'Άνοιξε η ηλεκτρονική ψηφοφορία (pre-voting) για την επερχόμενη Γενική Συνέλευση. '
            'Αν δεν μπορείτε να παρευρεθείτε, μπορείτε να ψηφίσετε εξ αποστάσεως (μέσω email) για τα θέματα που σας αφορούν.'
        ),
        'cta_text': 'Ψηφίστε μέσω email',
    },
}


def send_assembly_reminder_email(
    attendee: AssemblyAttendee,
    assembly: Assembly,
    include_voting: bool = True,
    skip_if_voted: bool = True,
    reminder_type: str = 'initial'
) -> bool | None:
    """
    Στέλνει email υπενθύμισης για τη συνέλευση.
    
    Args:
        attendee: Ο συμμετέχων
        assembly: Η συνέλευση
        include_voting: Αν θα περιλαμβάνει links για ψηφοφορία
        skip_if_voted: Αν θα παραλείπει όσους έχουν ψηφίσει σε όλα
        reminder_type: Τύπος υπενθύμισης ('initial', '7days', '3days', '1day', 'sameday')
    
    Returns:
        True αν στάλθηκε επιτυχώς
        False αν απέτυχε
        None αν παραλείφθηκε (ήδη ψήφισε)
    """
    try:
        # Get email tone configuration
        tone_config = EMAIL_TONES.get(reminder_type, EMAIL_TONES['initial'])
        
        # Get user email
        user = attendee.user
        if not user or not user.email:
            logger.warning(f"No email for attendee {attendee.id}")
            return False
        
        # Get voting items
        voting_items = list(assembly.agenda_items.filter(
            item_type='voting',
            allows_pre_voting=True
        ).order_by('order'))
        
        # Check if already voted on all items
        voted_item_ids = set(
            AssemblyVote.objects.filter(
                attendee=attendee
            ).values_list('agenda_item_id', flat=True)
        )
        
        pending_votes = [item for item in voting_items if item.id not in voted_item_ids]
        
        # Skip if user has voted on all items and skip_if_voted is True
        if skip_if_voted and voting_items and not pending_votes:
            logger.info(
                f"Skipping reminder for attendee {attendee.id} - already voted on all items"
            )
            return None  # Indicates skipped, not failed
        
        # Generate vote URL if voting is included AND voting is currently allowed.
        # Note: vote-by-email endpoint is intended for pre-voting or in-progress assemblies.
        can_vote_online_now = bool(assembly.is_pre_voting_active or assembly.status == 'in_progress')
        vote_url = (
            get_vote_url(attendee, assembly)
            if include_voting and pending_votes and can_vote_online_now
            else None
        )
        
        # Calculate days until assembly
        today = timezone.now().date()
        assembly_date = assembly.scheduled_date
        days_until = (assembly_date - today).days

        # Pre-voting window status (for friendlier messaging)
        pre_voting_state = 'disabled'
        pre_voting_start = None
        pre_voting_end = None
        if getattr(assembly, 'pre_voting_enabled', False):
            pre_voting_start = assembly.pre_voting_start_date or assembly.scheduled_date
            pre_voting_end = assembly.pre_voting_end_date or (
                assembly.scheduled_date + timedelta(days=3) if assembly.scheduled_date else None
            )
            if assembly.is_pre_voting_active:
                pre_voting_state = 'active'
            elif pre_voting_start and today < pre_voting_start:
                pre_voting_state = 'not_started'
            elif pre_voting_end and today > pre_voting_end:
                pre_voting_state = 'ended'
            else:
                # Fallback for edge-cases where dates are missing/inconsistent
                pre_voting_state = 'inactive'
        
        # Prepare voting items with individual vote links
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://app.newconcierge.gr')
        voting_items_with_links = []
        for item in voting_items:
            item_data = {
                'id': item.id,
                'title': item.title,
                'description': item.description or '',
                'order': item.order,
                'is_pending': item.id not in voted_item_ids,
                'linked_vote': None,
                'vote_url': None,
                'vote_type': 'email',  # 'email' or 'direct'
            }
            
            # Αν το item έχει linked_vote, χρησιμοποιούμε το direct vote URL
            if item.linked_vote:
                item_data['linked_vote'] = {
                    'id': item.linked_vote.id,
                    'title': item.linked_vote.title,
                }
                # Direct vote URL για το συγκεκριμένο vote
                if can_vote_online_now:
                    item_data['vote_url'] = f"{frontend_url}/votes/{item.linked_vote.id}"
                    item_data['vote_type'] = 'direct'
            elif can_vote_online_now and item.id not in voted_item_ids:
                # Αν δεν έχει linked_vote, χρησιμοποιούμε το γενικό email vote URL
                item_data['vote_url'] = vote_url
                item_data['vote_type'] = 'email'
            
            voting_items_with_links.append(item_data)
        
        # Prepare context with tone configuration
        context = {
            'attendee': attendee,
            'user': user,
            'assembly': assembly,
            'building': assembly.building,
            'agenda_items': list(assembly.agenda_items.order_by('order')),
            'voting_items': voting_items,
            'voting_items_with_links': voting_items_with_links,
            'pending_votes': pending_votes,
            'voted_count': len(voting_items) - len(pending_votes),
            'total_voting_items': len(voting_items),
            'has_pending_votes': len(pending_votes) > 0,
            'vote_url': vote_url,
            'can_vote_online_now': can_vote_online_now,
            'pre_voting_state': pre_voting_state,
            'pre_voting_start': pre_voting_start,
            'pre_voting_end': pre_voting_end,
            'days_until': days_until,
            'is_today': days_until == 0,
            'is_tomorrow': days_until == 1,
            'frontend_url': frontend_url,
            'assembly_url': f"{frontend_url}/assemblies/{assembly.id}",
            'now': timezone.now(),
            # Tone-specific content
            'reminder_type': reminder_type,
            'tone': tone_config['tone'],
            'header_title': tone_config['header_title'],
            'greeting_extra': tone_config['greeting_extra'],
            'cta_text': tone_config['cta_text'],
            'is_gentle_reminder': reminder_type in ['7days', '3days'],
            'is_urgent': reminder_type in ['1day', 'sameday'],
        }
        
        # Render email with tone-specific subject
        subject = f"{tone_config['subject_prefix']} {tone_config['subject_text']} - {assembly.title}"
        
        legacy_html = render_to_string('assemblies/emails/reminder.html', context)
        send_templated_email(
            to=user.email,
            subject=subject,
            template_html="emails/wrapper.html",
            context={
                "body_html": extract_legacy_body_html(html=legacy_html),
                "wrapper_title": subject,
            },
            user=user,
            building_manager_id=getattr(assembly.building, "manager_id", None),
        )
        
        logger.info(f"Sent assembly reminder to {user.email} for assembly {assembly.id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send assembly reminder: {e}")
        return False


def send_vote_confirmation_email(
    attendee: AssemblyAttendee,
    votes: list[AssemblyVote]
) -> bool:
    """
    Στέλνει email επιβεβαίωσης μετά την ψηφοφορία.
    
    Args:
        attendee: Ο ψηφοφόρος
        votes: Οι ψήφοι που καταχωρήθηκαν
    
    Returns:
        True αν στάλθηκε επιτυχώς
    """
    try:
        user = attendee.user
        if not user or not user.email:
            return False
        
        assembly = attendee.assembly
        
        # Prepare vote summary
        vote_summary = []
        for vote in votes:
            vote_summary.append({
                'item_title': vote.agenda_item.title,
                'item_order': vote.agenda_item.order,
                'vote_display': vote.get_vote_display(),
                'mills': vote.mills,
                'voted_at': vote.voted_at,
            })
        
        context = {
            'user': user,
            'attendee': attendee,
            'assembly': assembly,
            'building': assembly.building,
            'votes': vote_summary,
            'total_mills': sum(v['mills'] for v in vote_summary),
            'voted_at': timezone.now(),
            'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://app.newconcierge.gr'),
            'assembly_url': f"{getattr(settings, 'FRONTEND_URL', 'https://app.newconcierge.gr')}/assemblies/{assembly.id}",
        }
        
        subject = f"✅ Επιβεβαίωση ψήφου - {assembly.title}"
        
        legacy_html = render_to_string('assemblies/emails/vote_confirmation.html', context)
        send_templated_email(
            to=user.email,
            subject=subject,
            template_html="emails/wrapper.html",
            context={
                "body_html": extract_legacy_body_html(html=legacy_html),
                "wrapper_title": subject,
            },
            user=user,
            building_manager_id=getattr(assembly.building, "manager_id", None),
        )
        
        logger.info(f"Sent vote confirmation to {user.email} for assembly {assembly.id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send vote confirmation: {e}")
        return False


def send_assembly_reminders_batch(
    assembly: Assembly,
    reminder_type: str = 'initial'
) -> dict:
    """
    Στέλνει υπενθυμίσεις σε όλους τους συμμετέχοντες.
    Εξαιρεί όσους έχουν ήδη ψηφίσει σε όλα τα θέματα.
    
    Args:
        assembly: Η συνέλευση
        reminder_type: Τύπος υπενθύμισης ('initial', '7days', '3days', '1day', 'sameday')
    
    Returns:
        Dict με στατιστικά αποστολής
    """
    results = {
        'total': 0,
        'sent': 0,
        'failed': 0,
        'skipped_no_email': 0,
        'skipped_already_voted': 0,
        'reminder_type': reminder_type,
    }
    
    # Get all attendees
    attendees = assembly.attendees.select_related('user', 'apartment')
    
    for attendee in attendees:
        results['total'] += 1
        
        # Skip if no user/email
        if not attendee.user or not attendee.user.email:
            results['skipped_no_email'] += 1
            continue
        
        # Send reminder (will return None if already voted on all)
        result = send_assembly_reminder_email(
            attendee, 
            assembly, 
            include_voting=True,
            skip_if_voted=True,
            reminder_type=reminder_type
        )
        
        if result is True:
            results['sent'] += 1
        elif result is None:
            # User already voted on all items - skipped
            results['skipped_already_voted'] += 1
        else:
            results['failed'] += 1
    
    # Get tone label for logging
    tone_label = EMAIL_TONES.get(reminder_type, {}).get('subject_text', reminder_type)
    logger.info(
        f"Assembly {assembly.id} reminders ({tone_label}): "
        f"sent={results['sent']}, skipped_voted={results['skipped_already_voted']}, "
        f"skipped_no_email={results['skipped_no_email']}, failed={results['failed']}"
    )
    return results


def schedule_assembly_reminders(assembly: Assembly):
    """
    Προγραμματίζει υπενθυμίσεις για τη συνέλευση.
    Καλείται όταν η συνέλευση γίνει 'convened'.
    
    Στέλνει:
    - Επόμενη ημέρα (αρχική ειδοποίηση)
    - 7 ημέρες πριν
    - 3 ημέρες πριν (υπενθύμιση)
    - 1 ημέρα πριν (τελική υπενθύμιση)
    - Την ημέρα (πρωί)
    """
    # This is now handled by Celery tasks (assemblies.tasks.schedule_assembly_email_series)
    # Triggered automatically by signal when assembly status changes to 'convened'
    
    today = timezone.now().date()
    assembly_date = assembly.scheduled_date
    days_until = (assembly_date - today).days
    
    if days_until == 7:
        return send_assembly_reminders_batch(assembly, 7)
    elif days_until == 3:
        return send_assembly_reminders_batch(assembly, 3)
    elif days_until == 1:
        return send_assembly_reminders_batch(assembly, 1)
    elif days_until == 0:
        return send_assembly_reminders_batch(assembly, 0)
    
    return None


def queue_vote_confirmation(attendee: AssemblyAttendee, votes: list[AssemblyVote]):
    """
    Προσθέτει task για αποστολή επιβεβαίωσης ψήφου στο Celery queue.
    Αντί να στέλνει άμεσα, δημιουργεί async task.
    
    Args:
        attendee: Ο ψηφοφόρος
        votes: Λίστα με τις ψήφους
    """
    try:
        from django.db import connection
        from .tasks import send_vote_confirmation_task
        
        schema_name = connection.schema_name
        vote_ids = [v.id for v in votes]
        
        send_vote_confirmation_task.delay(attendee.id, vote_ids, schema_name)
        
        logger.info(f"Queued vote confirmation for attendee {attendee.id}")
        
    except Exception as e:
        # Fallback to sync send if Celery fails
        logger.warning(f"Failed to queue confirmation, sending sync: {e}")
        send_vote_confirmation_email(attendee, votes)

