"""
Celery Tasks for Assembly Email Reminders

Πρόγραμμα αποστολής υπενθυμίσεων:
1. Επόμενη ημέρα από convening (αρχική ειδοποίηση)
2. 7 ημέρες πριν τη συνέλευση
3. 3 ημέρες πριν τη συνέλευση
4. 1 ημέρα πριν τη συνέλευση
5. Πρωί της ημέρας της συνέλευσης (09:00)
"""

import logging
from datetime import timedelta, datetime, time
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django_tenants.utils import schema_context, get_tenant_model
from typing import Optional
from notifications.multichannel_service import (
    MultiChannelNotificationService,
    RecipientChannels,
)
from notifications.providers.base import ChannelType

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_assembly_reminder_task(
    self,
    assembly_id: str,
    reminder_type: str,
    schema_name: Optional[str] = None
):
    """
    Αποστολή υπενθύμισης για συγκεκριμένη συνέλευση.

    Args:
        assembly_id: UUID της συνέλευσης
        reminder_type: Τύπος υπενθύμισης ('initial', '7days', '3days', '1day', 'sameday')
        schema_name: Schema του tenant
    """
    from assemblies.models import Assembly
    from assemblies.email_service import send_assembly_reminders_batch

    if not schema_name:
        logger.error("No schema_name provided for assembly reminder task")
        return {'error': 'No schema_name provided'}

    try:
        with schema_context(schema_name):
            try:
                assembly = Assembly.objects.get(id=assembly_id)
            except Assembly.DoesNotExist:
                logger.warning(f"Assembly {assembly_id} not found in schema {schema_name}")
                return {'error': 'Assembly not found'}

            # Check if already sent
            field_name = f'email_{reminder_type}_sent'
            if getattr(assembly, field_name, False):
                logger.info(f"Reminder {reminder_type} already sent for assembly {assembly_id}")
                return {'skipped': True, 'reason': 'Already sent'}

            # Check if assembly is still valid for reminders
            if assembly.status in ['cancelled', 'completed', 'adjourned']:
                logger.info(f"Assembly {assembly_id} is {assembly.status}, skipping reminder")
                return {'skipped': True, 'reason': f'Assembly is {assembly.status}'}

            # Send reminders with appropriate tone
            logger.info(f"Sending {reminder_type} reminder for assembly {assembly_id} in schema {schema_name}")

            results = send_assembly_reminders_batch(assembly, reminder_type)

            # Mark as sent
            setattr(assembly, field_name, True)
            setattr(assembly, f'email_{reminder_type}_sent_at', timezone.now())
            assembly.save(update_fields=[field_name, f'email_{reminder_type}_sent_at'])

            logger.info(f"Sent {reminder_type} reminder for assembly {assembly_id}: {results}")
            return results

    except Exception as exc:
        logger.exception(f"Failed to send {reminder_type} reminder for assembly {assembly_id}")
        raise self.retry(exc=exc, countdown=120)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_same_day_assembly_reminder(self, assembly_id: str, schema_name: str):
    """
    Στέλνει same-day reminder (email + Viber αν διαθέσιμο) για συνέλευση.
    Περιλαμβάνει ώρα, τοποθεσία και υπενθύμιση pre-voting (αν είναι ενεργό).
    """
    from assemblies.models import Assembly

    try:
        with schema_context(schema_name):
            assembly = (
                Assembly.objects.select_related('building')
                .prefetch_related('attendees__user', 'agenda_items')
                .get(id=assembly_id)
            )

            recipients: list[RecipientChannels] = []
            users_for_push = []
            seen_user_ids = set()

            for attendee in assembly.attendees.select_related("user"):
                user = attendee.user
                email = user.email if user and user.email else None

                viber_id = None
                if user and hasattr(user, "viber_subscription"):
                    sub = user.viber_subscription
                    if sub and getattr(sub, "is_subscribed", False):
                        viber_id = sub.viber_user_id

                if user and user.id not in seen_user_ids:
                    users_for_push.append(user)
                    seen_user_ids.add(user.id)

                if not email and not viber_id:
                    continue

                recipients.append(
                    RecipientChannels(
                        email=email,
                        viber_id=viber_id,
                    )
                )

            if not recipients and not users_for_push:
                return f"No recipients with email/Viber/push for assembly {assembly_id}"

            date_str = assembly.scheduled_date.strftime("%d/%m/%Y") if assembly.scheduled_date else ""
            time_str = assembly.scheduled_time.strftime("%H:%M") if assembly.scheduled_time else ""
            location = assembly.location or "Θα ανακοινωθεί"

            has_pre_voting = assembly.is_pre_voting_active or assembly.agenda_items.filter(
                item_type='voting',
                allows_pre_voting=True
            ).exists()

            pre_voting_line = (
                "\n\nPre-voting: Μπορείτε να ψηφίσετε ηλεκτρονικά πριν τη συνέλευση μέσα από την εφαρμογή."
                if has_pre_voting else ""
            )

            # Links για συμμετοχή
            app_url = getattr(settings, 'FRONTEND_URL', '').rstrip('/') or ''
            assembly_url = f"{app_url}/assemblies/{assembly.id}" if app_url else ""

            subject = "ΣΗΜΕΡΑ: Υπενθύμιση Γενικής Συνέλευσης"
            message_lines = [
                "ΣΗΜΕΡΑ: Γενική Συνέλευση",
                "",
                f"Ημερομηνία: {date_str}",
                f"Ώρα: {time_str}",
                f"Τοποθεσία: {location}",
            ]

            if has_pre_voting:
                message_lines.append("Pre-voting: Μπορείτε να ψηφίσετε ηλεκτρονικά πριν τη συνέλευση μέσα από την εφαρμογή.")
            if assembly_url:
                message_lines.append(f"Συμμετοχή / λεπτομέρειες: {assembly_url}")

            message = "\n".join(message_lines)

            successful = 0
            if recipients:
                service = MultiChannelNotificationService()
                results = service.send_bulk(
                    recipients=recipients,
                    subject=subject,
                    message=message,
                    channels=[ChannelType.EMAIL, ChannelType.VIBER],
                )
                successful = sum(1 for r in results if r.any_success)

            if users_for_push:
                try:
                    from notifications.webpush_service import WebPushService
                    from notifications.push_service import PushNotificationService

                    push_body = message.replace("\n", " ").strip()[:150]
                    for user in users_for_push:
                        WebPushService.send_to_user(
                            user=user,
                            title=subject,
                            body=push_body,
                            data={
                                'type': 'assembly_reminder',
                                'reminder_type': 'sameday',
                                'assembly_id': str(assembly.id),
                                'url': f"/assemblies/{assembly.id}",
                            },
                        )
                        PushNotificationService.send_to_user(
                            user=user,
                            title=subject,
                            body=push_body,
                            data={
                                'type': 'assembly_reminder',
                                'reminder_type': 'sameday',
                                'assembly_id': str(assembly.id),
                            }
                        )
                except Exception as push_error:
                    logger.warning(
                        "Push failed for same-day assembly reminder %s: %s",
                        assembly.id,
                        push_error,
                    )

            return f"Same-day reminder sent for assembly {assembly_id}: success={successful}/{len(recipients)}"

    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_agenda_item_decision_notification(self, agenda_item_id: str, schema_name: str):
    """
    Στέλνει ειδοποίηση (Email + Viber) στους ενοίκους για την απόφαση ενός θέματος.
    """
    from assemblies.models import AgendaItem

    try:
        with schema_context(schema_name):
            item = (
                AgendaItem.objects.select_related('assembly', 'assembly__building')
                .prefetch_related('assembly__attendees__user')
                .get(id=agenda_item_id)
            )

            if not item.decision:
                return f"No decision for item {agenda_item_id}, skipping notification"

            recipients: list[RecipientChannels] = []
            users_for_push = []
            seen_user_ids = set()

            for attendee in item.assembly.attendees.select_related("user"):
                user = attendee.user
                email = user.email if user and user.email else None

                viber_id = None
                if user and hasattr(user, "viber_subscription"):
                    sub = user.viber_subscription
                    if sub and getattr(sub, "is_subscribed", False):
                        viber_id = sub.viber_user_id

                if user and user.id not in seen_user_ids:
                    users_for_push.append(user)
                    seen_user_ids.add(user.id)

                if not email and not viber_id:
                    continue

                recipients.append(
                    RecipientChannels(
                        email=email,
                        viber_id=viber_id,
                    )
                )

            if not recipients and not users_for_push:
                return f"No recipients for decision notification {agenda_item_id}"

            subject = f"Απόφαση Συνέλευσης: {item.title}"

            # Map decision type to display string
            decision_display = dict(AgendaItem._meta.get_field('decision_type').choices).get(
                item.decision_type, item.decision_type
            )

            message = (
                f"Λήφθηκε νέα απόφαση στη Γενική Συνέλευση:\n\n"
                f"**Θέμα:** {item.title}\n"
                f"**Κατάσταση:** {decision_display}\n"
                f"**Απόφαση:** {item.decision}\n\n"
                f"Κτίριο: {item.assembly.building.name}\n"
                f"Ημερομηνία: {item.assembly.scheduled_date.strftime('%d/%m/%Y')}"
            )

            successful = 0
            if recipients:
                service = MultiChannelNotificationService()
                results = service.send_bulk(
                    recipients=recipients,
                    subject=subject,
                    message=message,
                    channels=[ChannelType.EMAIL, ChannelType.VIBER],
                )
                successful = sum(1 for r in results if r.any_success)

            if users_for_push:
                try:
                    from notifications.webpush_service import WebPushService
                    from notifications.push_service import PushNotificationService

                    push_body = message.replace("\n", " ").strip()[:150]
                    for user in users_for_push:
                        WebPushService.send_to_user(
                            user=user,
                            title=subject,
                            body=push_body,
                            data={
                                'type': 'assembly_decision',
                                'assembly_id': str(item.assembly.id),
                                'agenda_item_id': str(item.id),
                                'url': f"/assemblies/{item.assembly.id}",
                            },
                        )
                        PushNotificationService.send_to_user(
                            user=user,
                            title=subject,
                            body=push_body,
                            data={
                                'type': 'assembly_decision',
                                'assembly_id': str(item.assembly.id),
                                'agenda_item_id': str(item.id),
                            }
                        )
                except Exception as push_error:
                    logger.warning(
                        "Push failed for assembly decision %s: %s",
                        item.id,
                        push_error,
                    )

            return f"Decision notification sent for item {agenda_item_id}: success={successful}/{len(recipients)}"

    except Exception as exc:
        raise self.retry(exc=exc, countdown=120)


@shared_task
def check_and_send_assembly_reminders():
    """
    Celery Beat task - εκτελείται κάθε ώρα.
    Ελέγχει ποιες συνελεύσεις χρειάζονται υπενθύμιση.
    """
    from assemblies.models import Assembly

    TenantModel = get_tenant_model()
    today = timezone.now().date()
    now = timezone.now()

    sent_count = 0

    # Iterate through all tenants
    for tenant in TenantModel.objects.exclude(schema_name='public'):
        try:
            with schema_context(tenant.schema_name):
                # Get assemblies that might need reminders
                assemblies = Assembly.objects.filter(
                    status__in=['scheduled', 'convened'],
                    scheduled_date__gte=today
                ).select_related('building')

                for assembly in assemblies:
                    days_until = (assembly.scheduled_date - today).days

                    # Initial reminder (day after convening)
                    if assembly.status == 'convened' and not assembly.email_initial_sent:
                        if assembly.invitation_sent_at:
                            convened_date = assembly.invitation_sent_at.date()
                            if today > convened_date:
                                send_assembly_reminder_task.delay(
                                    str(assembly.id),
                                    'initial',
                                    tenant.schema_name
                                )
                                sent_count += 1
                                continue

                    # 7 days reminder
                    if days_until == 7 and not assembly.email_7days_sent:
                        send_assembly_reminder_task.delay(
                            str(assembly.id),
                            '7days',
                            tenant.schema_name
                        )
                        sent_count += 1
                        continue

                    # 3 days reminder
                    if days_until == 3 and not assembly.email_3days_sent:
                        send_assembly_reminder_task.delay(
                            str(assembly.id),
                            '3days',
                            tenant.schema_name
                        )
                        sent_count += 1
                        continue

                    # 1 day reminder
                    if days_until == 1 and not assembly.email_1day_sent:
                        send_assembly_reminder_task.delay(
                            str(assembly.id),
                            '1day',
                            tenant.schema_name
                        )
                        sent_count += 1
                        continue

                    # Same day reminder (only send in the morning, 8-10 AM)
                    if days_until == 0 and not assembly.email_sameday_sent:
                        current_hour = now.hour
                        if 8 <= current_hour <= 10:
                            send_assembly_reminder_task.delay(
                                str(assembly.id),
                                'sameday',
                                tenant.schema_name
                            )
                            sent_count += 1

        except Exception as e:
            logger.exception(f"Error processing tenant {tenant.schema_name}: {e}")
            continue

    logger.info(f"Assembly reminder check complete. Scheduled {sent_count} reminder tasks.")
    return {'scheduled_tasks': sent_count}


@shared_task
def check_and_send_pre_voting_open_reminders():
    """
    Celery Beat task - εκτελείται καθημερινά.
    Στέλνει email υπενθύμιση την ημέρα που ανοίγει το pre-voting (pre_voting_start_date).
    """
    from assemblies.models import Assembly

    TenantModel = get_tenant_model()
    today = timezone.now().date()

    scheduled = 0

    for tenant in TenantModel.objects.exclude(schema_name='public'):
        try:
            with schema_context(tenant.schema_name):
                assemblies = Assembly.objects.filter(
                    status__in=['scheduled', 'convened'],
                    pre_voting_enabled=True,
                    pre_voting_start_date=today,
                ).select_related('building')

                for assembly in assemblies:
                    if getattr(assembly, 'email_pre_voting_open_sent', False):
                        continue

                    send_assembly_reminder_task.delay(
                        str(assembly.id),
                        'pre_voting_open',
                        tenant.schema_name,
                    )
                    scheduled += 1

        except Exception as e:
            logger.exception(f"Error processing tenant {tenant.schema_name} for pre-voting-open reminders: {e}")
            continue

    logger.info(f"Pre-voting-open reminder check complete. Scheduled {scheduled} reminder tasks.")
    return {'scheduled_tasks': scheduled}


@shared_task
def schedule_assembly_email_series(assembly_id: str, schema_name: str):
    """
    Προγραμματίζει όλη τη σειρά emails για μια συνέλευση.
    Καλείται όταν η συνέλευση γίνει 'convened'.

    Args:
        assembly_id: UUID της συνέλευσης
        schema_name: Schema του tenant
    """
    from assemblies.models import Assembly
    from datetime import datetime, timedelta

    try:
        with schema_context(schema_name):
            try:
                assembly = Assembly.objects.get(id=assembly_id)
            except Assembly.DoesNotExist:
                logger.warning(f"Assembly {assembly_id} not found")
                return {'error': 'Assembly not found'}

            today = timezone.now().date()
            tomorrow = today + timedelta(days=1)
            assembly_date = assembly.scheduled_date

            scheduled_tasks = []

            # Calculate when each reminder should be sent
            # All reminders are sent at 09:00
            target_time = time(9, 0)

            # 1. Initial reminder - tomorrow at 09:00
            initial_dt = datetime.combine(tomorrow, target_time)
            initial_dt = timezone.make_aware(initial_dt)

            # Only schedule if tomorrow is before the assembly
            if tomorrow < assembly_date:
                send_assembly_reminder_task.apply_async(
                    args=[str(assembly.id), 'initial', schema_name],
                    eta=initial_dt
                )
                scheduled_tasks.append(f'initial: {initial_dt}')

            # 2. 7 days before
            seven_days_before = assembly_date - timedelta(days=7)
            if seven_days_before > tomorrow:
                dt = datetime.combine(seven_days_before, target_time)
                dt = timezone.make_aware(dt)
                send_assembly_reminder_task.apply_async(
                    args=[str(assembly.id), '7days', schema_name],
                    eta=dt
                )
                scheduled_tasks.append(f'7days: {dt}')

            # 3. 3 days before
            three_days_before = assembly_date - timedelta(days=3)
            if three_days_before > tomorrow:
                dt = datetime.combine(three_days_before, target_time)
                dt = timezone.make_aware(dt)
                send_assembly_reminder_task.apply_async(
                    args=[str(assembly.id), '3days', schema_name],
                    eta=dt
                )
                scheduled_tasks.append(f'3days: {dt}')

            # 4. 1 day before
            one_day_before = assembly_date - timedelta(days=1)
            if one_day_before >= tomorrow:
                dt = datetime.combine(one_day_before, target_time)
                dt = timezone.make_aware(dt)
                send_assembly_reminder_task.apply_async(
                    args=[str(assembly.id), '1day', schema_name],
                    eta=dt
                )
                scheduled_tasks.append(f'1day: {dt}')

            # 5. Same day morning
            dt = datetime.combine(assembly_date, target_time)
            dt = timezone.make_aware(dt)
            send_assembly_reminder_task.apply_async(
                args=[str(assembly.id), 'sameday', schema_name],
                eta=dt
            )
            scheduled_tasks.append(f'sameday: {dt}')

            logger.info(f"Scheduled email series for assembly {assembly_id}: {scheduled_tasks}")
            return {'scheduled': scheduled_tasks}

    except Exception as e:
        logger.exception(f"Failed to schedule email series for assembly {assembly_id}")
        return {'error': str(e)}


@shared_task
def send_vote_confirmation_task(
    attendee_id: int,
    vote_ids: list,
    schema_name: str
):
    """
    Αποστολή επιβεβαίωσης ψήφου.

    Args:
        attendee_id: ID του attendee
        vote_ids: Λίστα με IDs των ψήφων
        schema_name: Schema του tenant
    """
    from assemblies.models import AssemblyAttendee, AssemblyVote
    from assemblies.email_service import send_vote_confirmation_email

    try:
        with schema_context(schema_name):
            attendee = AssemblyAttendee.objects.select_related(
                'user', 'assembly', 'assembly__building'
            ).get(id=attendee_id)

            votes = list(AssemblyVote.objects.filter(id__in=vote_ids).select_related('agenda_item'))

            if votes:
                send_vote_confirmation_email(attendee, votes)
                return {'sent': True, 'votes_count': len(votes)}

            return {'sent': False, 'reason': 'No votes found'}

    except AssemblyAttendee.DoesNotExist:
        logger.warning(f"Attendee {attendee_id} not found")
        return {'error': 'Attendee not found'}
    except Exception as e:
        logger.exception(f"Failed to send vote confirmation for attendee {attendee_id}")
        return {'error': str(e)}
