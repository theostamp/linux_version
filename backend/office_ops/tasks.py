from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone
from django_tenants.utils import schema_context

from .models import BulkJob, BulkJobStatus
from .services import execute_job, retry_failed_items

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def process_bulk_job_task(
    self,
    *,
    job_id: str,
    schema_name: str,
    mode: str = "execute",
    item_ids: list[str] | None = None,
):
    """
    Process queued bulk jobs in tenant schema context.
    """
    with schema_context(schema_name):
        job = BulkJob.objects.filter(id=job_id).first()
        if not job:
            logger.warning("Bulk job %s not found in schema %s", job_id, schema_name)
            return {"job_id": job_id, "schema_name": schema_name, "status": "missing"}

        try:
            if mode == "retry":
                retry_failed_items(job, item_ids=item_ids or None)
            else:
                execute_job(job, item_ids=item_ids or None)
        except Exception as exc:
            logger.exception("Bulk job task failed: job=%s schema=%s mode=%s", job_id, schema_name, mode)
            job.status = BulkJobStatus.FAILED
            job.finished_at = timezone.now()
            summary = dict(job.summary or {})
            summary["task_error"] = {
                "mode": mode,
                "message": str(exc),
                "failed_at": job.finished_at.isoformat(),
            }
            job.summary = summary
            job.save(update_fields=["status", "finished_at", "summary", "updated_at"])

            if self.request.retries < self.max_retries:
                raise self.retry(exc=exc, countdown=60)

            return {
                "job_id": str(job.id),
                "schema_name": schema_name,
                "status": "failed",
                "error": str(exc),
            }

        job.refresh_from_db(fields=["status", "finished_at", "summary"])
        return {
            "job_id": str(job.id),
            "schema_name": schema_name,
            "status": job.status,
            "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        }
