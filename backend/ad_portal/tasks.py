import logging

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from ad_portal.models import AdContract, AdContractStatus, AdEvent
from ad_portal.email_service import (
    send_payment_failed_email,
    send_payment_success_email,
    send_trial_ended_email,
    send_trial_reminder_email,
    send_trial_started_email,
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_ad_portal_trial_started_email_task(self, contract_id: int):
    try:
        with schema_context("public"):
            contract = AdContract.objects.select_related("lead", "placement_type").get(id=contract_id)
            return bool(send_trial_started_email(contract=contract))
    except Exception as exc:
        logger.exception("[AD_PORTAL] Trial started email failed. Retrying…")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_ad_portal_trial_reminder_email_task(self, contract_id: int, days_left: int):
    try:
        with schema_context("public"):
            contract = AdContract.objects.select_related("lead", "placement_type").get(id=contract_id)
            return bool(send_trial_reminder_email(contract=contract, days_left=days_left))
    except Exception as exc:
        logger.exception("[AD_PORTAL] Trial reminder email failed. Retrying…")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_ad_portal_trial_ended_email_task(self, contract_id: int):
    try:
        with schema_context("public"):
            contract = AdContract.objects.select_related("lead", "placement_type").get(id=contract_id)
            return bool(send_trial_ended_email(contract=contract))
    except Exception as exc:
        logger.exception("[AD_PORTAL] Trial ended email failed. Retrying…")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_ad_portal_payment_success_email_task(self, contract_id: int):
    try:
        with schema_context("public"):
            contract = AdContract.objects.select_related("lead", "placement_type").get(id=contract_id)
            return bool(send_payment_success_email(contract=contract))
    except Exception as exc:
        logger.exception("[AD_PORTAL] Payment success email failed. Retrying…")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_ad_portal_payment_failed_email_task(self, contract_id: int):
    try:
        with schema_context("public"):
            contract = AdContract.objects.select_related("lead", "placement_type").get(id=contract_id)
            return bool(send_payment_failed_email(contract=contract))
    except Exception as exc:
        logger.exception("[AD_PORTAL] Payment failed email failed. Retrying…")
        raise self.retry(exc=exc, countdown=60)


@shared_task
def check_ad_portal_trials_daily():
    """
    Daily job:
    - send reminders at 7/3/1 days before trial end
    - mark expired trials + send trial ended email (once)
    """
    now = timezone.now()
    reminder_days = {7, 3, 1}
    processed = 0

    with schema_context("public"):
        qs = AdContract.objects.select_related("lead", "placement_type").filter(
            status=AdContractStatus.TRIAL_ACTIVE,
            trial_ends_at__isnull=False,
        )
        for c in qs.iterator():
            if not c.trial_ends_at:
                continue

            if now >= c.trial_ends_at:
                # Expire + notify once
                if not AdEvent.objects.filter(contract=c, event_type="trial_ended_email_sent").exists():
                    try:
                        send_trial_ended_email(contract=c)
                        AdEvent.objects.create(
                            event_type="trial_ended_email_sent",
                            tenant_schema=c.tenant_schema,
                            building_id=c.building_id,
                            contract=c,
                            metadata={},
                        )
                    except Exception as e:
                        logger.warning("[AD_PORTAL] Failed sending trial ended email: %s", e)
                if c.status == AdContractStatus.TRIAL_ACTIVE:
                    c.status = AdContractStatus.TRIAL_EXPIRED
                    c.save(update_fields=["status", "updated_at"])
                processed += 1
                continue

            days_left = int((c.trial_ends_at - now).total_seconds() / 86400) + 1
            if days_left in reminder_days:
                if AdEvent.objects.filter(contract=c, event_type="trial_reminder_email_sent", metadata__days_left=days_left).exists():
                    continue
                try:
                    send_trial_reminder_email(contract=c, days_left=days_left)
                    AdEvent.objects.create(
                        event_type="trial_reminder_email_sent",
                        tenant_schema=c.tenant_schema,
                        building_id=c.building_id,
                        contract=c,
                        metadata={"days_left": days_left},
                    )
                    processed += 1
                except Exception as e:
                    logger.warning("[AD_PORTAL] Failed sending trial reminder email: %s", e)

    return f"Processed {processed} trial notifications"


