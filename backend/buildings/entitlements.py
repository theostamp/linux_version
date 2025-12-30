from datetime import date
from typing import Any, Dict, Optional

from django.utils import timezone


def _coerce_trial_date(value: Optional[Any]) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.split("T")[0])
        except ValueError:
            return None
    return None


def resolve_tenant_state(tenant, today: Optional[date] = None) -> Dict[str, Any]:
    if today is None:
        today = timezone.now().date()

    if not tenant or getattr(tenant, "schema_name", None) == "public":
        return {
            "account_type": None,
            "tenant_is_active": False,
            "tenant_on_trial": False,
            "tenant_paid_until": None,
            "tenant_subscription_active": False,
            "is_office_account": False,
        }

    account_type = getattr(tenant, "account_type", None) or "office"
    tenant_is_active = bool(getattr(tenant, "is_active", False))
    tenant_on_trial = bool(getattr(tenant, "on_trial", False))
    tenant_paid_until = getattr(tenant, "paid_until", None)
    tenant_subscription_active = bool(
        tenant_is_active and (tenant_on_trial or (tenant_paid_until and tenant_paid_until >= today))
    )

    return {
        "account_type": account_type,
        "tenant_is_active": tenant_is_active,
        "tenant_on_trial": tenant_on_trial,
        "tenant_paid_until": tenant_paid_until,
        "tenant_subscription_active": tenant_subscription_active,
        "is_office_account": account_type == "office",
    }


def resolve_building_plan_type(building) -> str:
    premium_enabled = bool(getattr(building, "premium_enabled", False))
    iot_enabled = bool(getattr(building, "iot_enabled", False))
    if premium_enabled:
        return "premium_iot" if iot_enabled else "premium"
    return "web"


def resolve_building_entitlements(building, tenant) -> Dict[str, Any]:
    today = timezone.now().date()
    tenant_state = resolve_tenant_state(tenant, today)

    apartments_count = getattr(building, "apartments_count", 0) or 0
    has_apartments = apartments_count > 0
    trial_ends_at = _coerce_trial_date(getattr(building, "trial_ends_at", None))
    trial_active = bool(trial_ends_at and trial_ends_at >= today)
    premium_selected = bool(getattr(building, "premium_enabled", False))
    iot_selected = bool(getattr(building, "iot_enabled", False))
    plan_type = resolve_building_plan_type(building)

    premium_access = bool(
        tenant_state["is_office_account"]
        and tenant_state["tenant_subscription_active"]
        and premium_selected
        and (trial_active or has_apartments)
    )
    iot_access = bool(premium_access and iot_selected)

    premium_blocked_reason = None
    if (
        tenant_state["is_office_account"]
        and tenant_state["tenant_subscription_active"]
        and not premium_access
    ):
        if not premium_selected:
            premium_blocked_reason = "PREMIUM_REQUIRED"
        elif not has_apartments and not trial_active:
            premium_blocked_reason = "APARTMENTS_REQUIRED"

    return {
        "apartments_count": apartments_count,
        "has_apartments": has_apartments,
        "trial_ends_at": trial_ends_at,
        "trial_active": trial_active,
        "premium_selected": premium_selected,
        "iot_selected": iot_selected,
        "plan_type": plan_type,
        "premium_access": premium_access,
        "iot_access": iot_access,
        "premium_blocked_reason": premium_blocked_reason,
        **tenant_state,
    }
