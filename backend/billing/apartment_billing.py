"""
Per-apartment billing sync (Web per apartment + Premium add-on per apartment).

This module bridges tenant-schema building counts to Stripe subscription item quantities.
It is intentionally "safe-by-default":
- If Stripe is not configured, it will no-op without crashing (useful for local dev).
- If tenant/subscription linkage is missing, it returns a structured error.

Billing model:
- web_per_apartment (quantity = total_apartments)
- premium_addon_per_apartment (quantity = premium_apartments)

Assumptions:
- Billable apartments count is derived from Building.apartments_count (includes empty/archived).
- Premium apartments count is derived from buildings where Building.premium_enabled=True.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import logging

from django.conf import settings
from django.db import transaction
from django_tenants.utils import schema_context

from tenants.models import Client
from buildings.models import Building
from .models import UserSubscription
from .integrations.stripe import StripeService

logger = logging.getLogger(__name__)


@dataclass
class ApartmentBillingCounts:
    total_apartments: int
    premium_apartments: int


def _get_price_id_web_per_apartment() -> str:
    return getattr(settings, 'STRIPE_WEB_PER_APARTMENT_PRICE_ID', 'price_web_per_apartment_dev')


def _get_price_id_premium_addon_per_apartment() -> str:
    return getattr(settings, 'STRIPE_PREMIUM_ADDON_PER_APARTMENT_PRICE_ID', 'price_premium_addon_per_apartment_dev')


def calculate_counts_for_tenant_schema(schema_name: str) -> ApartmentBillingCounts:
    """
    Compute billable apartment counts inside a tenant schema.
    """
    with schema_context(schema_name):
        # Avoid heavy ORM aggregation with conditional sums because this is small.
        total_apartments = 0
        premium_apartments = 0
        for b in Building.objects.only('apartments_count', 'premium_enabled'):
            count = int(b.apartments_count or 0)
            total_apartments += count
            if bool(b.premium_enabled):
                premium_apartments += count

    return ApartmentBillingCounts(
        total_apartments=total_apartments,
        premium_apartments=premium_apartments,
    )


@transaction.atomic
def sync_subscription_items_for_tenant(
    *,
    tenant: Client,
    subscription: UserSubscription,
    proration_behavior: str = 'create_prorations',
) -> dict:
    """
    Sync Stripe subscription items quantities based on tenant building counts.

    Returns:
        dict with keys: ok, counts, stripe, error(optional)
    """
    if not tenant or not getattr(tenant, 'schema_name', None):
        return {'ok': False, 'error': 'Missing tenant schema_name'}

    if not subscription or not subscription.stripe_subscription_id:
        return {'ok': False, 'error': 'Missing stripe_subscription_id'}

    counts = calculate_counts_for_tenant_schema(tenant.schema_name)

    # Feature flag: allow running the new per-apartment model in parallel with legacy billing.
    # When disabled, we only record counts (no Stripe mutations).
    if not bool(getattr(settings, 'PER_APARTMENT_BILLING_ENABLED', False)):
        subscription.billing_total_apartments = counts.total_apartments
        subscription.billing_premium_apartments = counts.premium_apartments
        subscription.save(update_fields=['billing_total_apartments', 'billing_premium_apartments', 'updated_at'])
        return {
            'ok': True,
            'counts': counts.__dict__,
            'stripe': {'ok': True, 'skipped': True, 'reason': 'PER_APARTMENT_BILLING_ENABLED is false'},
        }

    # Stripe price IDs (configurable via env/settings)
    price_web = _get_price_id_web_per_apartment()
    price_premium = _get_price_id_premium_addon_per_apartment()

    # Stripe quantities: keep web >= 1 to avoid edge cases during trial/setup (no charge until trial ends).
    web_qty = max(1, counts.total_apartments)
    premium_qty = max(0, counts.premium_apartments)

    stripe_result = StripeService.ensure_per_apartment_subscription_items(
        subscription_id=subscription.stripe_subscription_id,
        web_price_id=price_web,
        premium_price_id=price_premium,
        web_quantity=web_qty,
        premium_quantity=premium_qty,
        proration_behavior=proration_behavior,
        remove_other_items=True,
    )

    if not stripe_result.get('ok'):
        return {
            'ok': False,
            'counts': counts.__dict__,
            'stripe': stripe_result,
            'error': stripe_result.get('error') or 'Stripe sync failed',
        }

    # Persist IDs + last synced counts for visibility & future delta-based sync
    subscription.stripe_subscription_item_id_web = stripe_result.get('web_item_id') or subscription.stripe_subscription_item_id_web
    subscription.stripe_subscription_item_id_premium = stripe_result.get('premium_item_id') or subscription.stripe_subscription_item_id_premium
    subscription.billing_total_apartments = counts.total_apartments
    subscription.billing_premium_apartments = counts.premium_apartments
    subscription.save(
        update_fields=[
            'stripe_subscription_item_id_web',
            'stripe_subscription_item_id_premium',
            'billing_total_apartments',
            'billing_premium_apartments',
            'updated_at',
        ]
    )

    return {
        'ok': True,
        'counts': counts.__dict__,
        'stripe': stripe_result,
    }


