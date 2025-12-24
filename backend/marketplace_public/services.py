from __future__ import annotations

from decimal import Decimal
from typing import Tuple

from .models import MarketplaceCommissionPolicy, MarketplaceProvider


def get_effective_commission_rates(provider: MarketplaceProvider) -> Tuple[Decimal, Decimal, Decimal]:
    """
    Returns (base_rate, featured_bonus, effective_rate).

    Rules:
    - Base rate: category policy base, unless provider has override (default_commission_rate_percent).
    - Featured bonus: category policy featured bonus, unless provider has override.
    - Effective: base + (featured ? bonus : 0).
    """

    policy = MarketplaceCommissionPolicy.objects.filter(service_type=provider.service_type, is_active=True).first()

    base = Decimal("0.00")
    bonus = Decimal("0.00")

    if policy:
        base = policy.base_commission_rate_percent or base
        bonus = policy.featured_bonus_commission_rate_percent or bonus

    # Provider overrides
    if provider.default_commission_rate_percent is not None:
        base = provider.default_commission_rate_percent
    if provider.featured_bonus_commission_rate_percent_override is not None:
        bonus = provider.featured_bonus_commission_rate_percent_override

    effective = base + (bonus if provider.is_featured else Decimal("0.00"))
    return base, bonus, effective


