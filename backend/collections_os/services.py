from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apartments.models import Apartment
from financial.services import FinancialDashboardService
from notifications.services import NotificationService

from .models import DunningChannel, DunningEvent, DunningEventStatus, DunningPolicy, DunningRun, DunningRunStatus

logger = logging.getLogger(__name__)


def _resolve_recipient(apartment: Apartment, channel: str) -> str:
    """
    Resolve primary recipient value depending on the selected channel.
    """
    if channel in {DunningChannel.EMAIL, DunningChannel.PUSH}:
        return apartment.tenant_email or apartment.owner_email or ""
    if channel in {DunningChannel.SMS, DunningChannel.VIBER}:
        return apartment.tenant_phone or apartment.owner_phone or ""
    return ""


def _filter_candidates_by_policy(items: list[dict[str, Any]], policy: DunningPolicy) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for item in items:
        days_overdue = int(item.get("days_overdue") or 0)
        if days_overdue < policy.min_days_overdue:
            continue
        if policy.max_days_overdue is not None and days_overdue > policy.max_days_overdue:
            continue
        filtered.append(item)
    return filtered


def get_candidates_for_policy(policy: DunningPolicy, month: str | None = None) -> list[dict[str, Any]]:
    service = FinancialDashboardService(policy.building_id)
    debt_report = service.get_debt_report(month=month)
    items = debt_report.get("items", [])
    return _filter_candidates_by_policy(items, policy)


@transaction.atomic
def initialize_run_events(run: DunningRun, apartment_ids: list[int] | None = None) -> tuple[int, int]:
    """
    Create queued/skipped events for all run candidates.

    Returns:
        tuple(total_candidates, total_skipped)
    """
    candidates = get_candidates_for_policy(run.policy, month=run.month or None)
    if apartment_ids:
        apartment_id_set = set(apartment_ids)
        candidates = [item for item in candidates if item.get("apartment_id") in apartment_id_set]

    candidate_apartment_ids = [item.get("apartment_id") for item in candidates if item.get("apartment_id")]
    apartments = Apartment.objects.in_bulk(candidate_apartment_ids)

    skipped_count = 0

    for item in candidates:
        apartment_id = item.get("apartment_id")
        apartment = apartments.get(apartment_id)
        if not apartment:
            continue

        recipient = _resolve_recipient(apartment, run.policy.channel)
        status = DunningEventStatus.QUEUED if recipient else DunningEventStatus.SKIPPED
        if status == DunningEventStatus.SKIPPED:
            skipped_count += 1

        DunningEvent.objects.create(
            run=run,
            policy=run.policy,
            building_id=run.building_id,
            apartment=apartment,
            channel=run.policy.channel,
            status=status,
            recipient=recipient,
            days_overdue=int(item.get("days_overdue") or 0),
            amount_due=Decimal(str(item.get("current_balance") or "0")),
            error_message="" if recipient else "Missing contact for selected channel",
            payload=item,
        )

    run.total_candidates = len(candidates)
    run.total_skipped = skipped_count
    run.metadata = {
        **(run.metadata or {}),
        "queued_events": max(0, len(candidates) - skipped_count),
    }
    run.save(update_fields=["total_candidates", "total_skipped", "metadata", "updated_at"])
    return run.total_candidates, run.total_skipped


def _notification_type_for_channel(channel: str) -> str:
    if channel == DunningChannel.SMS:
        return "sms"
    if channel == DunningChannel.PUSH:
        return "push"
    if channel == DunningChannel.VIBER:
        return "viber"
    return "email"


def _resolve_sender_user(run: DunningRun):
    if run.triggered_by_id:
        return run.triggered_by

    user_model = get_user_model()
    return (
        user_model.objects.filter(is_superuser=True).order_by("id").first()
        or user_model.objects.filter(is_staff=True).order_by("id").first()
        or user_model.objects.order_by("id").first()
    )


def _build_event_content(event: DunningEvent) -> tuple[str, str, str]:
    month_label = event.run.month or timezone.now().strftime("%Y-%m")
    amount_label = f"{event.amount_due:.2f}€"
    subject = f"Υπενθύμιση Οφειλής {month_label} - Διαμ. {event.apartment.number}"
    body = (
        f"Υπενθύμιση οφειλής για το διαμέρισμα {event.apartment.number}.\n"
        f"Ληξιπρόθεσμο ποσό: {amount_label}.\n"
        f"Ημέρες καθυστέρησης: {event.days_overdue}.\n"
        "Παρακαλούμε για άμεση τακτοποίηση."
    )
    sms_body = (
        f"Υπενθύμιση οφειλής {month_label} για διαμ. {event.apartment.number}: "
        f"{amount_label}, {event.days_overdue} ημέρες καθυστέρηση."
    )
    return subject, body, sms_body


def _finalize_run(run: DunningRun) -> DunningRun:
    total_sent = run.events.filter(status=DunningEventStatus.SENT).count()
    total_failed = run.events.filter(status=DunningEventStatus.FAILED).count()
    total_skipped = run.events.filter(status=DunningEventStatus.SKIPPED).count()

    if total_failed > 0 and total_sent == 0:
        status_value = DunningRunStatus.FAILED
    else:
        status_value = DunningRunStatus.COMPLETED

    metadata = dict(run.metadata or {})
    metadata["dispatch_summary"] = {
        "sent": total_sent,
        "failed": total_failed,
        "skipped": total_skipped,
        "completed_with_failures": bool(total_failed > 0 and total_sent > 0),
        "finished_at": timezone.now().isoformat(),
    }

    run.total_sent = total_sent
    run.total_failed = total_failed
    run.total_skipped = total_skipped
    run.status = status_value
    run.finished_at = timezone.now()
    run.metadata = metadata
    run.save(
        update_fields=[
            "total_sent",
            "total_failed",
            "total_skipped",
            "status",
            "finished_at",
            "metadata",
            "updated_at",
        ]
    )
    return run


def dispatch_run_events(run: DunningRun) -> DunningRun:
    """
    Dispatch queued dunning events and mark run completion.
    """
    sender_user = _resolve_sender_user(run)
    if not sender_user:
        raise ValueError("No sender user available for dunning notification dispatch.")

    queued_events = run.events.select_related("apartment", "building").filter(status=DunningEventStatus.QUEUED)

    for event in queued_events.iterator():
        try:
            subject, body, sms_body = _build_event_content(event)
            notification = NotificationService.create_notification(
                building=run.building,
                created_by=sender_user,
                subject=subject,
                body=body,
                sms_body=sms_body,
                notification_type=_notification_type_for_channel(event.channel),
                priority="normal",
                scheduled_at=None,
                template=None,
            )
            NotificationService.add_recipients(notification, apartment_ids=[event.apartment_id], send_to_all=False)
            result = NotificationService.send_notification(notification)

            sent_count = int(result.get("successful") or 0)
            if sent_count > 0:
                event.status = DunningEventStatus.SENT
                event.provider_message_id = str(notification.id)
                event.error_code = ""
                event.error_message = ""
                event.sent_at = timezone.now()
            else:
                event.status = DunningEventStatus.FAILED
                event.error_code = "NotificationDeliveryFailed"
                event.error_message = f"No successful deliveries ({event.channel})"

            event.save(
                update_fields=[
                    "status",
                    "provider_message_id",
                    "error_code",
                    "error_message",
                    "sent_at",
                ]
            )
        except Exception as exc:
            logger.exception("Dunning event dispatch failed: event=%s run=%s", event.id, run.id)
            event.status = DunningEventStatus.FAILED
            event.error_code = exc.__class__.__name__
            event.error_message = str(exc)
            event.save(update_fields=["status", "error_code", "error_message"])

    return _finalize_run(run)


def queue_run_dispatch(run: DunningRun, *, schema_name: str) -> str | None:
    """
    Queue dunning run dispatch in Celery.

    Returns:
        task_id if queued, None when there are no queued events.
    """
    with transaction.atomic():
        locked_run = DunningRun.objects.select_for_update().get(id=run.id)
        metadata = dict(locked_run.metadata or {})

        if locked_run.status == DunningRunStatus.CANCELLED:
            raise ValueError("Cancelled dunning run cannot be dispatched.")

        if (
            locked_run.status == DunningRunStatus.RUNNING
            and metadata.get("dispatch_task_id")
            and not locked_run.finished_at
        ):
            return None

        queued_events = locked_run.events.filter(status=DunningEventStatus.QUEUED).count()
        if queued_events == 0:
            sent_count = locked_run.events.filter(status=DunningEventStatus.SENT).count()
            failed_count = locked_run.events.filter(status=DunningEventStatus.FAILED).count()
            skipped_count = locked_run.events.filter(status=DunningEventStatus.SKIPPED).count()
            locked_run.status = (
                DunningRunStatus.FAILED if failed_count > 0 and sent_count == 0 else DunningRunStatus.COMPLETED
            )
            locked_run.finished_at = timezone.now()
            locked_run.total_sent = sent_count
            locked_run.total_failed = failed_count
            locked_run.total_skipped = skipped_count
            metadata["dispatch_summary"] = {
                "sent": sent_count,
                "failed": failed_count,
                "skipped": skipped_count,
                "completed_with_failures": bool(failed_count > 0 and sent_count > 0),
                "finished_at": locked_run.finished_at.isoformat(),
                "note": "No queued events to dispatch.",
            }
            locked_run.metadata = metadata
            locked_run.save(
                update_fields=[
                    "status",
                    "finished_at",
                    "total_sent",
                    "total_failed",
                    "total_skipped",
                    "metadata",
                    "updated_at",
                ]
            )
            return None

        locked_run.status = DunningRunStatus.RUNNING
        locked_run.finished_at = None
        metadata["dispatch_queued_at"] = timezone.now().isoformat()
        metadata["dispatch_schema"] = schema_name
        locked_run.metadata = metadata
        locked_run.save(update_fields=["status", "finished_at", "metadata", "updated_at"])

    from .tasks import dispatch_dunning_run_task

    try:
        async_result = dispatch_dunning_run_task.delay(
            run_id=str(run.id),
            schema_name=schema_name,
        )
    except Exception as exc:
        locked_run = DunningRun.objects.filter(id=run.id).first()
        if locked_run:
            locked_run.status = DunningRunStatus.FAILED
            locked_run.finished_at = timezone.now()
            metadata = dict(locked_run.metadata or {})
            metadata["dispatch_error"] = {
                "message": str(exc),
                "failed_at": locked_run.finished_at.isoformat(),
            }
            locked_run.metadata = metadata
            locked_run.save(update_fields=["status", "finished_at", "metadata", "updated_at"])
        raise

    locked_run = DunningRun.objects.filter(id=run.id).first()
    if locked_run:
        metadata = dict(locked_run.metadata or {})
        metadata["dispatch_task_id"] = async_result.id
        locked_run.metadata = metadata
        locked_run.save(update_fields=["metadata", "updated_at"])

    return async_result.id
