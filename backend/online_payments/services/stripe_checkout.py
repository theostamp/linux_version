import logging
from typing import Dict, Any

import stripe
from django.conf import settings
from django.db import connection

from online_payments.models import Charge, PaymentAttempt, PaymentAttemptStatus

logger = logging.getLogger(__name__)


def _frontend_url() -> str:
    return getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")


def create_checkout_for_charge(*, charge: Charge, customer_email: str | None = None) -> Dict[str, Any]:
    """
    Creates a Stripe Checkout Session for a given Charge.
    Returns dict with checkout_url + provider_session_id.

    NOTE: Payment truth comes from webhooks (not from success redirect).
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Stripe expects amounts in cents for Checkout price_data.
    amount_cents = int(round(float(charge.amount) * 100))

    tenant_schema = connection.schema_name
    metadata: Dict[str, str] = {
        "tenant_schema": str(tenant_schema),
        "charge_id": str(charge.id),
        "building_id": str(charge.building_id),
        "apartment_id": str(charge.apartment_id),
        "category": str(charge.category),
        "period": str(charge.period),
    }

    success_url = f"{_frontend_url()}/(dashboard)/online-payments/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{_frontend_url()}/(dashboard)/online-payments/cancel"

    session_data: Dict[str, Any] = {
        "mode": "payment",
        "line_items": [
            {
                "quantity": 1,
                "price_data": {
                    "currency": charge.currency.lower(),
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"Οφειλή {charge.period}",
                        "description": charge.description or f"Charge {charge.id}",
                    },
                },
            }
        ],
        "metadata": metadata,
        "client_reference_id": str(charge.id),
        "success_url": success_url,
        "cancel_url": cancel_url,
    }

    if customer_email:
        session_data["customer_email"] = customer_email

    # Create session (mock mode uses a fake URL via StripeService, but we keep it simple here).
    session = stripe.checkout.Session.create(**session_data)
    session_id = session["id"]
    url = session.get("url")

    # Create attempt in our DB
    PaymentAttempt.objects.create(
        charge=charge,
        building=charge.building,
        provider="stripe",
        provider_session_id=session_id,
        status=PaymentAttemptStatus.CREATED,
        amount=charge.amount,
        currency=charge.currency,
        routed_to=charge.compute_routed_to(),
    )

    # Move charge to pending
    if charge.status == "unpaid":
        charge.status = "pending"
        charge.save(update_fields=["status", "updated_at"])

    logger.info(f"[ONLINE_PAYMENTS] Created Stripe checkout session {session_id} for charge {charge.id}")
    return {"checkout_url": url, "provider_session_id": session_id}


