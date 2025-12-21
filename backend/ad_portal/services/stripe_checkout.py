from __future__ import annotations

import logging
from typing import Any, Dict

import stripe
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from ad_portal.models import AdBillingKind, AdBillingRecord, AdBillingStatus, AdContract, AdContractStatus

logger = logging.getLogger(__name__)


def create_checkout_for_ad_manual(*, contract: AdContract, success_url: str, cancel_url: str) -> Dict[str, Any]:
    """
    One-time monthly purchase (manual renewal).
    Returns dict with checkout_url + provider_session_id.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY

    placement = contract.placement_type
    amount_cents = int(round(float(placement.monthly_price_eur) * 100))

    metadata: Dict[str, str] = {
        "ad_contract_id": str(contract.id),
        "tenant_schema": str(contract.tenant_schema),
        "building_id": str(contract.building_id),
        "placement": str(placement.code),
        "billing_kind": "manual",
    }

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "eur",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"Διαφήμιση ({placement.display_name})",
                        "description": f"Κτίριο #{contract.building_id} • {placement.code}",
                    },
                },
            }
        ],
        metadata=metadata,
        client_reference_id=str(contract.id),
        success_url=success_url,
        cancel_url=cancel_url,
    )

    session_id = session["id"]
    url = session.get("url")

    AdBillingRecord.objects.create(
        contract=contract,
        kind=AdBillingKind.MANUAL,
        status=AdBillingStatus.CREATED,
        amount_eur=placement.monthly_price_eur,
        currency="EUR",
        stripe_checkout_session_id=session_id,
        raw_summary={"mode": "payment"},
    )

    logger.info(f"[AD_PORTAL] Created manual checkout session {session_id} for contract {contract.id}")
    return {"checkout_url": url, "provider_session_id": session_id}


def create_checkout_for_ad_subscription(*, contract: AdContract, success_url: str, cancel_url: str) -> Dict[str, Any]:
    """
    Auto-renew monthly subscription (recommended).
    Returns dict with checkout_url + provider_session_id.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY

    placement = contract.placement_type
    amount_cents = int(round(float(placement.monthly_price_eur) * 100))

    metadata: Dict[str, str] = {
        "ad_contract_id": str(contract.id),
        "tenant_schema": str(contract.tenant_schema),
        "building_id": str(contract.building_id),
        "placement": str(placement.code),
        "billing_kind": "subscription",
    }

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "eur",
                    "unit_amount": amount_cents,
                    "recurring": {"interval": "month"},
                    "product_data": {
                        "name": f"Διαφήμιση ({placement.display_name})",
                        "description": f"Κτίριο #{contract.building_id} • {placement.code}",
                    },
                },
            }
        ],
        metadata=metadata,
        subscription_data={"metadata": metadata},
        client_reference_id=str(contract.id),
        success_url=success_url,
        cancel_url=cancel_url,
    )

    session_id = session["id"]
    url = session.get("url")

    AdBillingRecord.objects.create(
        contract=contract,
        kind=AdBillingKind.SUBSCRIPTION,
        status=AdBillingStatus.CREATED,
        amount_eur=placement.monthly_price_eur,
        currency="EUR",
        stripe_checkout_session_id=session_id,
        raw_summary={"mode": "subscription"},
    )

    logger.info(f"[AD_PORTAL] Created subscription checkout session {session_id} for contract {contract.id}")
    return {"checkout_url": url, "provider_session_id": session_id}


def mark_contract_paid_period(*, contract: AdContract, period_end=None, payment_meta: Dict[str, Any] | None = None):
    """
    Updates contract for paid access.
    """
    now = timezone.now()
    contract.status = AdContractStatus.ACTIVE_PAID
    contract.last_payment_at = now
    if period_end:
        contract.active_until = period_end
    elif not contract.active_until or contract.active_until < now:
        contract.active_until = now + timedelta(days=30)  # fallback
    contract.save(update_fields=["status", "last_payment_at", "active_until", "updated_at"])

    if payment_meta:
        logger.info(f"[AD_PORTAL] Paid period for contract {contract.id}: {payment_meta}")


