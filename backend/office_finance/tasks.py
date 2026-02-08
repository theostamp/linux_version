from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from django_tenants.utils import get_tenant_model, schema_context

from users.models import CustomUser

from .services import office_finance_service

logger = logging.getLogger(__name__)


def _office_finance_dashboard_cache_ttl() -> int:
    return int(getattr(settings, 'OFFICE_FINANCE_DASHBOARD_CACHE_TTL', 30) or 30)


def _office_finance_yearly_cache_ttl() -> int:
    return int(getattr(settings, 'OFFICE_FINANCE_YEARLY_CACHE_TTL', 300) or 300)


def _office_finance_dashboard_cache_key(schema_name: str, user_id: int) -> str:
    return f"office-finance:dashboard:v1:{schema_name}:{user_id}"


def _office_finance_yearly_cache_key(schema_name: str, user_id: int, year: int) -> str:
    return f"office-finance:yearly-summary:v1:{schema_name}:{user_id}:{year}"


@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def warm_office_finance_cache(
    self,
    *,
    schema_name: str | None = None,
    year: int | None = None,
):
    """
    Warm Office Finance dashboard/yearly caches for office users.
    """
    if not getattr(settings, 'ENABLE_DASHBOARD_CACHE_WARMER', False):
        return {'status': 'skipped', 'reason': 'dashboard cache warmer disabled'}

    ttl_dashboard = _office_finance_dashboard_cache_ttl()
    ttl_yearly = _office_finance_yearly_cache_ttl()
    if ttl_dashboard <= 0 and ttl_yearly <= 0:
        return {'status': 'skipped', 'reason': 'office finance cache ttl disabled'}

    target_year = int(year) if year else timezone.now().year

    tenant_schemas: list[str] = []
    if schema_name:
        tenant_schemas = [schema_name]
    else:
        tenant_schemas = [
            tenant.schema_name
            for tenant in get_tenant_model().objects.exclude(schema_name='public')
        ]

    tenants_processed = 0
    users_warmed = 0
    failures = 0

    for tenant_schema in tenant_schemas:
        with schema_context(tenant_schema):
            tenants_processed += 1
            user_ids = list(
                CustomUser.objects.filter(is_active=True)
                .filter(Q(is_superuser=True) | Q(role__in=['manager', 'staff']))
                .values_list('id', flat=True)
            )
            if not user_ids:
                continue

            try:
                dashboard_payload = office_finance_service.get_dashboard_data()
                yearly_payload = office_finance_service.get_yearly_summary(year=target_year)
            except Exception as exc:
                failures += 1
                logger.exception(
                    "Office finance cache warm compute failed (schema=%s): %s",
                    tenant_schema,
                    exc,
                )
                continue

            for user_id in user_ids:
                if ttl_dashboard > 0:
                    cache.set(
                        _office_finance_dashboard_cache_key(tenant_schema, user_id),
                        dashboard_payload,
                        ttl_dashboard,
                    )
                if ttl_yearly > 0:
                    cache.set(
                        _office_finance_yearly_cache_key(tenant_schema, user_id, target_year),
                        yearly_payload,
                        ttl_yearly,
                    )
                users_warmed += 1

    return {
        'status': 'ok',
        'tenants_processed': tenants_processed,
        'users_warmed': users_warmed,
        'year': target_year,
        'failures': failures,
    }
