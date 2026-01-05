import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context, get_tenant_model, get_public_schema_name

from .models import EmailWebhookEvent

logger = logging.getLogger(__name__)


def _resolve_status(event_type: str) -> str | None:
    if not event_type:
        return None
    normalized = event_type.lower()
    if "delivered" in normalized:
        return "delivered"
    if "bounce" in normalized and "soft" in normalized:
        return "bounced_soft"
    if "bounce" in normalized:
        return "bounced_hard"
    if "blocked" in normalized:
        return "blocked"
    if "complaint" in normalized or "spam" in normalized:
        return "complaint"
    if "failed" in normalized or "error" in normalized:
        return "failed_immediate"
    return None


@shared_task
def process_mailersend_webhook_events(batch_size: int = 200) -> dict[str, int]:
    """
    Process MailerSend webhook events from the public schema and update tenant batches.
    """
    processed = 0
    updated = 0
    skipped = 0

    public_schema = get_public_schema_name()
    TenantModel = get_tenant_model()

    with schema_context(public_schema):
        events = (
            EmailWebhookEvent.objects
            .filter(provider="mailersend", processed_at__isnull=True)
            .order_by("received_at")[:batch_size]
        )

        for event in events:
            status = _resolve_status(event.event_type or "")
            if not status:
                event.processed_at = timezone.now()
                event.save(update_fields=["processed_at"])
                skipped += 1
                continue

            message_id = (event.message_id or "").strip()
            email = (event.email or "").strip()
            final_status = status
            finalized_at = timezone.now()
            error_message = None
            if status in {"blocked", "complaint", "bounced_soft", "bounced_hard", "failed_immediate"}:
                error_message = event.event_type or "provider_event"

            updated_any = False
            for tenant in TenantModel.objects.exclude(schema_name=public_schema):
                with schema_context(tenant.schema_name):
                    from notifications.models import EmailBatchRecipient

                    qs = EmailBatchRecipient.objects.filter(
                        status__in=["sent_to_provider", "unknown_final"]
                    )
                    if message_id:
                        qs = qs.filter(provider_message_id=message_id)
                    elif email:
                        qs = qs.filter(email=email, sent_at__gte=timezone.now() - timedelta(days=7))
                    else:
                        continue

                    if not qs.exists():
                        continue

                    update_fields = {
                        "status": final_status,
                        "finalized_at": finalized_at,
                    }
                    if error_message:
                        update_fields["error_message"] = error_message
                    qs.update(**update_fields)
                    updated_any = True
                    updated += 1
                    break

            event.processed_at = timezone.now()
            event.save(update_fields=["processed_at"])
            processed += 1

            if not updated_any:
                skipped += 1

    summary = {"processed": processed, "updated": updated, "skipped": skipped}
    logger.info("MailerSend webhook processing: %s", summary)
    return summary


@shared_task
def finalize_email_batches(report_window_minutes: int = 30) -> dict[str, int]:
    """
    Mark remaining sent_to_provider entries as unknown_final after the report window.
    """
    TenantModel = get_tenant_model()
    public_schema = get_public_schema_name()
    now = timezone.now()
    cutoff = now - timedelta(minutes=report_window_minutes)

    total_updated = 0
    tenants_processed = 0

    for tenant in TenantModel.objects.exclude(schema_name=public_schema):
        with schema_context(tenant.schema_name):
            from notifications.models import EmailBatchRecipient

            updated = EmailBatchRecipient.objects.filter(
                status="sent_to_provider",
                sent_at__isnull=False,
                sent_at__lte=cutoff,
            ).update(status="unknown_final", finalized_at=now)
            total_updated += updated
            tenants_processed += 1

    summary = {"tenants": tenants_processed, "updated": total_updated}
    logger.info("Email batch finalization: %s", summary)
    return summary
