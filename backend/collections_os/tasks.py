from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from .models import DunningRun, DunningRunStatus
from .services import dispatch_run_events

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def dispatch_dunning_run_task(self, *, run_id: str, schema_name: str):
    """
    Dispatch queued dunning events in tenant context.
    """
    with schema_context(schema_name):
        run = DunningRun.objects.select_related("policy", "building", "triggered_by").filter(id=run_id).first()
        if not run:
            logger.warning("Dunning run %s not found in schema %s", run_id, schema_name)
            return {"run_id": run_id, "schema_name": schema_name, "status": "missing"}

        try:
            dispatch_run_events(run)
        except Exception as exc:
            logger.exception("Dunning run dispatch failed: run=%s schema=%s", run_id, schema_name)
            run.status = DunningRunStatus.FAILED
            run.finished_at = timezone.now()
            metadata = dict(run.metadata or {})
            metadata["dispatch_error"] = {
                "message": str(exc),
                "failed_at": run.finished_at.isoformat(),
            }
            run.metadata = metadata
            run.save(update_fields=["status", "finished_at", "metadata", "updated_at"])

            if self.request.retries < self.max_retries:
                raise self.retry(exc=exc, countdown=60)

            return {
                "run_id": str(run.id),
                "schema_name": schema_name,
                "status": "failed",
                "error": str(exc),
            }

        run.refresh_from_db(fields=["status", "finished_at", "total_sent", "total_failed"])
        return {
            "run_id": str(run.id),
            "schema_name": schema_name,
            "status": run.status,
            "total_sent": run.total_sent,
            "total_failed": run.total_failed,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        }
