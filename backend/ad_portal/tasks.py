import logging

from celery import shared_task
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from django.db.models import Count
from django.utils import timezone
from django_tenants.utils import schema_context

from ad_portal.models import AdContract, AdContractStatus, AdDailySnapshot, AdEvent, AdLead
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


def _day_bounds(d):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(d, datetime.min.time()), tz)
    end = start + timedelta(days=1)
    return start, end


@shared_task
def compute_ad_portal_daily_snapshots(days_back: int = 30):
    """
    Compute/Upsert daily snapshots for the last N days (including today).
    Runs in PUBLIC schema (shared app).
    """
    days_back = int(days_back or 30)
    days_back = max(1, min(days_back, 365))

    today = timezone.localdate()
    start_date = today - timedelta(days=days_back - 1)

    event_map = {
        "landing_view": "landing_views",
        "trial_started": "trials_started",
        "manage_view": "manage_views",
        "creative_updated": "creatives_updated",
        "checkout_started": "checkouts_started",
        "payment_success": "payment_success",
        "payment_failed": "payment_failed",
    }

    with schema_context("public"):
        for i in range(days_back):
            d = start_date + timedelta(days=i)
            day_start, day_end = _day_bounds(d)

            # Key: (tenant_schema, building_id, placement_code)
            agg: dict[tuple[str, int | None, str], dict[str, Any]] = defaultdict(
                lambda: {
                    "landing_views": 0,
                    "trials_started": 0,
                    "manage_views": 0,
                    "creatives_updated": 0,
                    "checkouts_started": 0,
                    "payment_success": 0,
                    "payment_failed": 0,
                    "leads_created": 0,
                    "trials_ending": 0,
                }
            )

            # Events (with optional placement from metadata)
            events = (
                AdEvent.objects.filter(created_at__gte=day_start, created_at__lt=day_end)
                .values("tenant_schema", "building_id", "event_type", "metadata__placement")
                .annotate(c=Count("id"))
            )
            for row in events:
                et = row.get("event_type") or ""
                field = event_map.get(et)
                if not field:
                    continue
                tenant_schema = (row.get("tenant_schema") or "").strip()
                building_id = row.get("building_id")
                placement_code = (row.get("metadata__placement") or "").strip()
                key = (tenant_schema, int(building_id) if building_id is not None else None, placement_code)
                agg[key][field] = int(row.get("c") or 0)

                # Also aggregate to placement_code="" (all placements) if this row is per-placement
                if placement_code:
                    key_all = (tenant_schema, int(building_id) if building_id is not None else None, "")
                    agg[key_all][field] = int(agg[key_all][field] or 0) + int(row.get("c") or 0)

            # Leads created (aggregate only)
            leads = (
                AdLead.objects.filter(created_at__gte=day_start, created_at__lt=day_end)
                .values("tenant_schema", "building_id")
                .annotate(c=Count("id"))
            )
            for row in leads:
                tenant_schema = (row.get("tenant_schema") or "").strip()
                building_id = row.get("building_id")
                key_all = (tenant_schema, int(building_id) if building_id is not None else None, "")
                agg[key_all]["leads_created"] = int(row.get("c") or 0)

            # Trials ending (based on trial_ends_at date window)
            trials_ending = (
                AdContract.objects.filter(trial_ends_at__gte=day_start, trial_ends_at__lt=day_end)
                .select_related("placement_type")
                .values("tenant_schema", "building_id", "placement_type__code")
                .annotate(c=Count("id"))
            )
            for row in trials_ending:
                tenant_schema = (row.get("tenant_schema") or "").strip()
                building_id = row.get("building_id")
                placement_code = (row.get("placement_type__code") or "").strip()
                key = (tenant_schema, int(building_id) if building_id is not None else None, placement_code)
                agg[key]["trials_ending"] = int(row.get("c") or 0)
                key_all = (tenant_schema, int(building_id) if building_id is not None else None, "")
                agg[key_all]["trials_ending"] = int(agg[key_all]["trials_ending"] or 0) + int(row.get("c") or 0)

            # Upsert snapshots
            for (tenant_schema, building_id, placement_code), data in agg.items():
                AdDailySnapshot.objects.update_or_create(
                    date=d,
                    tenant_schema=tenant_schema,
                    building_id=building_id,
                    placement_code=placement_code,
                    defaults=data,
                )

    return f"Snapshots computed: {days_back} day(s)"


