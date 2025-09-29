from __future__ import annotations

from celery import shared_task
from django_tenants.utils import schema_context


@shared_task
def sync_todos_building(building_id: int, schema: str = "demo", skip_financial: bool = False, skip_maintenance: bool = False) -> dict:
    from .services import sync_financial_overdues, sync_maintenance_schedule

    with schema_context(schema):
        result: dict = {"building_id": building_id, "schema": schema, "sections": {}}
        if not skip_financial:
            result["sections"]["financial"] = sync_financial_overdues(building_id=building_id, actor=None)
        if not skip_maintenance:
            result["sections"]["maintenance"] = sync_maintenance_schedule(building_id=building_id, actor=None)
        return result


