from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django_tenants.utils import schema_context

from core.emailing import send_templated_email
from tenants.models import Domain

from .models import AdContract

logger = logging.getLogger(__name__)


def _frontend_base_for_schema(tenant_schema: str) -> str:
    """
    Resolve a tenant-aware frontend base URL using tenants.Domain when possible.
    Falls back to settings.FRONTEND_URL.
    """
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    try:
        with schema_context("public"):
            d = (
                Domain.objects.filter(tenant__schema_name=tenant_schema)
                .order_by("-is_primary", "id")
                .first()
            )
            if d and getattr(d, "domain", None):
                return f"https://{d.domain}".rstrip("/")
    except Exception:
        pass
    return base


def _get_building_payload(*, tenant_schema: str, building_id: int) -> dict:
    with schema_context(tenant_schema):
        from buildings.models import Building

        b = Building.objects.filter(id=building_id).first()
        if not b:
            return {"id": building_id, "name": f"Κτίριο #{building_id}", "address": "", "city": "", "postal_code": ""}
        return {
            "id": b.id,
            "name": b.name,
            "address": b.address,
            "city": b.city,
            "postal_code": b.postal_code,
        }


def send_trial_started_email(*, contract: AdContract) -> bool:
    lead = contract.lead
    building = _get_building_payload(tenant_schema=contract.tenant_schema, building_id=contract.building_id)
    frontend = _frontend_base_for_schema(contract.tenant_schema)
    manage_url = f"{frontend}/advertise/manage/{contract.manage_token}"

    subject = f"{getattr(settings, 'EMAIL_SUBJECT_PREFIX', '')}Ξεκίνησε η δωρεάν δοκιμή σας (1 μήνας)"
    return send_templated_email(
        to=lead.email,
        subject=subject,
        template_html="emails/ad_portal_trial_started.html",
        context={
            "contract": contract,
            "lead": lead,
            "building": building,
            "manage_url": manage_url,
        },
        sender_user=None,
    )


def send_trial_reminder_email(*, contract: AdContract, days_left: int) -> bool:
    lead = contract.lead
    building = _get_building_payload(tenant_schema=contract.tenant_schema, building_id=contract.building_id)
    frontend = _frontend_base_for_schema(contract.tenant_schema)
    manage_url = f"{frontend}/advertise/manage/{contract.manage_token}"

    subject = f"{getattr(settings, 'EMAIL_SUBJECT_PREFIX', '')}Η δοκιμή σας λήγει σε {days_left} ημέρες"
    return send_templated_email(
        to=lead.email,
        subject=subject,
        template_html="emails/ad_portal_trial_reminder.html",
        context={
            "contract": contract,
            "lead": lead,
            "building": building,
            "manage_url": manage_url,
            "days_left": days_left,
        },
        sender_user=None,
    )


def send_trial_ended_email(*, contract: AdContract) -> bool:
    lead = contract.lead
    building = _get_building_payload(tenant_schema=contract.tenant_schema, building_id=contract.building_id)
    frontend = _frontend_base_for_schema(contract.tenant_schema)
    manage_url = f"{frontend}/advertise/manage/{contract.manage_token}"

    subject = f"{getattr(settings, 'EMAIL_SUBJECT_PREFIX', '')}Η δοκιμή έληξε — ενεργοποιήστε πληρωμή για συνέχεια"
    return send_templated_email(
        to=lead.email,
        subject=subject,
        template_html="emails/ad_portal_trial_ended.html",
        context={
            "contract": contract,
            "lead": lead,
            "building": building,
            "manage_url": manage_url,
        },
        sender_user=None,
    )


def send_payment_success_email(*, contract: AdContract) -> bool:
    lead = contract.lead
    building = _get_building_payload(tenant_schema=contract.tenant_schema, building_id=contract.building_id)
    frontend = _frontend_base_for_schema(contract.tenant_schema)
    manage_url = f"{frontend}/advertise/manage/{contract.manage_token}"

    subject = f"{getattr(settings, 'EMAIL_SUBJECT_PREFIX', '')}Η διαφήμισή σας ενεργοποιήθηκε"
    return send_templated_email(
        to=lead.email,
        subject=subject,
        template_html="emails/ad_portal_payment_success.html",
        context={
            "contract": contract,
            "lead": lead,
            "building": building,
            "manage_url": manage_url,
        },
        sender_user=None,
    )


def send_payment_failed_email(*, contract: AdContract) -> bool:
    lead = contract.lead
    building = _get_building_payload(tenant_schema=contract.tenant_schema, building_id=contract.building_id)
    frontend = _frontend_base_for_schema(contract.tenant_schema)
    manage_url = f"{frontend}/advertise/manage/{contract.manage_token}"

    subject = f"{getattr(settings, 'EMAIL_SUBJECT_PREFIX', '')}Αποτυχία πληρωμής — απαιτείται ενέργεια"
    return send_templated_email(
        to=lead.email,
        subject=subject,
        template_html="emails/ad_portal_payment_failed.html",
        context={
            "contract": contract,
            "lead": lead,
            "building": building,
            "manage_url": manage_url,
        },
        sender_user=None,
    )


