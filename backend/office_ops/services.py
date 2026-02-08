from __future__ import annotations

from datetime import date
from decimal import Decimal
import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from buildings.models import Building
from financial.monthly_charge_service import MonthlyChargeService
from financial.services import FinancialDashboardService
from office_finance.models import OfficeIncome, OfficeIncomeCategory

from .models import (
    BulkJob,
    BulkJobError,
    BulkJobItem,
    BulkJobItemStatus,
    BulkJobStatus,
    BulkOperationType,
)

logger = logging.getLogger(__name__)


def resolve_target_month(month: str | None) -> tuple[date, str]:
    if month:
        try:
            year, mon = map(int, month.split("-"))
            if mon < 1 or mon > 12:
                raise ValueError("Invalid month")
            month_date = date(year, mon, 1)
            return month_date, f"{year:04d}-{mon:02d}"
        except Exception as exc:
            raise ValidationError({"month": f"Invalid month format ({month}): {exc}"})

    today = timezone.now().date()
    month_date = date(today.year, today.month, 1)
    return month_date, month_date.strftime("%Y-%m")


def _target_buildings(job: BulkJob):
    queryset = Building.objects.all().order_by("id")
    if job.building_id:
        queryset = queryset.filter(id=job.building_id)
    return queryset


def _quantize_amount(amount: Decimal | float | int) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"))


def _estimate_reserve_fund_amount(building: Building, target_month: date) -> Decimal:
    if not MonthlyChargeService._should_charge_reserve_fund(building, target_month):
        return Decimal("0.00")

    if building.reserve_fund_goal and building.reserve_fund_duration_months:
        duration = Decimal(str(building.reserve_fund_duration_months or 0))
        if duration <= 0:
            return Decimal("0.00")
        return _quantize_amount(Decimal(str(building.reserve_fund_goal)) / duration)

    contribution_per_apartment = Decimal(str(building.reserve_contribution_per_apartment or 0))
    apartments_count = building.apartments.count()
    return _quantize_amount(contribution_per_apartment * Decimal(apartments_count))


def _estimate_management_fee_amount(building: Building, target_month: date) -> Decimal:
    if not MonthlyChargeService._should_charge_management_fees(building, target_month):
        return Decimal("0.00")

    fee_per_apartment = Decimal(str(building.management_fee_per_apartment or 0))
    apartments_count = building.apartments.count()
    return _quantize_amount(fee_per_apartment * Decimal(apartments_count))


def _record_error(job: BulkJob, message: str, item: BulkJobItem | None = None, error_code: str = ""):
    BulkJobError.objects.create(
        job=job,
        item=item,
        error_code=error_code,
        message=message,
        details={
            "operation_type": job.operation_type,
            "month": job.month,
        },
    )


def _clear_existing_preview(job: BulkJob):
    job.items.all().delete()
    job.errors.all().delete()


def build_dry_run(job: BulkJob) -> BulkJob:
    target_month, normalized_month = resolve_target_month(job.month or None)

    _clear_existing_preview(job)

    for building in _target_buildings(job):
        validation_errors: list[str] = []
        status = BulkJobItemStatus.VALIDATED
        amount = Decimal("0.00")
        payload: dict = {
            "building_name": building.name,
            "month": normalized_month,
        }

        if job.operation_type == BulkOperationType.ISSUE_MONTHLY_CHARGES:
            management_amount = _estimate_management_fee_amount(building, target_month)
            reserve_amount = _estimate_reserve_fund_amount(building, target_month)
            amount = _quantize_amount(management_amount + reserve_amount)

            payload.update(
                {
                    "management_fees_amount": float(management_amount),
                    "reserve_fund_amount": float(reserve_amount),
                }
            )

            if amount <= 0:
                status = BulkJobItemStatus.SKIPPED
                validation_errors.append(
                    "No eligible monthly charges for this month (already generated or not configured)."
                )

        elif job.operation_type == BulkOperationType.CREATE_MANAGEMENT_FEE_INCOMES:
            apartments_count = building.apartments.count()
            fee_per_apartment = Decimal(str(building.management_fee_per_apartment or 0))
            amount = _quantize_amount(fee_per_apartment * Decimal(apartments_count))

            payload.update(
                {
                    "apartments_count": apartments_count,
                    "fee_per_apartment": float(fee_per_apartment),
                }
            )

            if apartments_count <= 0:
                status = BulkJobItemStatus.SKIPPED
                validation_errors.append("Building has no apartments.")
            elif fee_per_apartment <= 0:
                status = BulkJobItemStatus.SKIPPED
                validation_errors.append("Building has no management fee per apartment configured.")

        elif job.operation_type == BulkOperationType.EXPORT_DEBT_REPORT:
            debt_report = FinancialDashboardService(building.id).get_debt_report(month=normalized_month)
            total_debt = Decimal(str(debt_report.get("summary", {}).get("total_debt") or 0))
            total_debtors = int(debt_report.get("summary", {}).get("total_debtors") or 0)
            amount = _quantize_amount(total_debt)

            payload.update(
                {
                    "total_debtors": total_debtors,
                    "buckets": debt_report.get("summary", {}).get("buckets", {}),
                }
            )

            if total_debtors == 0:
                status = BulkJobItemStatus.SKIPPED
                validation_errors.append("No debtors found for selected period.")

        else:
            status = BulkJobItemStatus.FAILED
            validation_errors.append(f"Unsupported operation type: {job.operation_type}")

        BulkJobItem.objects.create(
            job=job,
            building=building,
            entity_type="building",
            entity_id=str(building.id),
            status=status,
            amount=amount,
            payload=payload,
            validation_errors=validation_errors,
        )

    counts = {
        "validated": job.items.filter(status=BulkJobItemStatus.VALIDATED).count(),
        "skipped": job.items.filter(status=BulkJobItemStatus.SKIPPED).count(),
        "failed": job.items.filter(status=BulkJobItemStatus.FAILED).count(),
        "total_items": job.items.count(),
    }
    estimated_total_amount = (
        job.items.filter(status=BulkJobItemStatus.VALIDATED).aggregate(total=Sum("amount"))["total"]
        or Decimal("0.00")
    )

    job.month = normalized_month
    job.status = BulkJobStatus.PREVIEWED
    job.dry_run_completed = True
    job.summary = {
        **(job.summary or {}),
        "dry_run": {
            **counts,
            "estimated_total_amount": float(estimated_total_amount),
        },
    }
    job.save(update_fields=["month", "status", "dry_run_completed", "summary", "updated_at"])
    return job


def _merge_job_summary(job: BulkJob, patch: dict) -> dict:
    summary = dict(job.summary or {})
    summary.update(patch)
    job.summary = summary
    return summary


def _get_or_create_management_income_category() -> OfficeIncomeCategory:
    category = OfficeIncomeCategory.objects.filter(
        category_type="management_fee_monthly",
        is_active=True,
    ).order_by("id").first()

    if category:
        return category

    return OfficeIncomeCategory.objects.create(
        name="Αμοιβή Διαχείρισης (Bulk)",
        group_type="building_fees",
        category_type="management_fee_monthly",
        icon="wallet",
        color="emerald",
        description="Auto-created category for bulk management fee income jobs.",
        is_active=True,
        is_system=True,
        links_to_management_expense=True,
    )


def _execute_issue_monthly_charges(item: BulkJobItem, target_month: date) -> dict:
    if not item.building_id:
        raise ValidationError("Bulk item has no building scope.")

    result = MonthlyChargeService.create_monthly_charges(item.building, target_month)
    return {
        "transactions_created": int(result.get("transactions_created", 0)),
        "management_fees_created": bool(result.get("management_fees_created", False)),
        "management_fees_amount": float(result.get("management_fees_amount", 0)),
        "reserve_fund_created": bool(result.get("reserve_fund_created", False)),
        "reserve_fund_amount": float(result.get("reserve_fund_amount", 0)),
    }


def _execute_create_management_income(job: BulkJob, item: BulkJobItem, target_month: date) -> dict:
    if not item.building_id:
        raise ValidationError("Bulk item has no building scope.")

    category = _get_or_create_management_income_category()

    invoice_number = f"BULK-{job.id.hex[:8]}-{item.building_id}-{target_month.strftime('%Y%m')}"
    existing = OfficeIncome.objects.filter(invoice_number=invoice_number).first()

    if existing:
        return {
            "income_id": existing.id,
            "created": False,
            "invoice_number": invoice_number,
            "amount": float(existing.amount),
        }

    income = OfficeIncome.objects.create(
        title=f"Αμοιβή Διαχείρισης {item.building.name} {target_month.strftime('%m/%Y')}",
        description=(
            "Bulk-generated management fee income entry from Office Ops Bulk Center."
        ),
        amount=item.amount,
        date=target_month,
        category=category,
        building=item.building,
        status="pending",
        recurrence="monthly",
        client_name=item.building.name,
        invoice_number=invoice_number,
        notes=f"Generated by bulk job {job.id}",
        created_by=job.requested_by,
    )

    return {
        "income_id": income.id,
        "created": True,
        "invoice_number": invoice_number,
        "amount": float(income.amount),
    }


def _execute_export_debt_report(item: BulkJobItem, month_str: str) -> dict:
    if not item.building_id:
        raise ValidationError("Bulk item has no building scope.")

    report = FinancialDashboardService(item.building_id).get_debt_report(month=month_str)
    return {
        "summary": report.get("summary", {}),
        "items_count": len(report.get("items", [])),
    }


def _execute_items(job: BulkJob, items_queryset):
    target_month, normalized_month = resolve_target_month(job.month or None)

    job.status = BulkJobStatus.RUNNING
    job.started_at = timezone.now()
    job.finished_at = None
    job.save(update_fields=["status", "started_at", "finished_at", "updated_at"])

    for item in items_queryset:
        try:
            with transaction.atomic():
                if job.operation_type == BulkOperationType.ISSUE_MONTHLY_CHARGES:
                    execution_result = _execute_issue_monthly_charges(item, target_month)
                    transactions_created = int(execution_result.get("transactions_created") or 0)
                    item.status = (
                        BulkJobItemStatus.EXECUTED
                        if transactions_created > 0
                        else BulkJobItemStatus.SKIPPED
                    )
                    item.result = execution_result

                elif job.operation_type == BulkOperationType.CREATE_MANAGEMENT_FEE_INCOMES:
                    execution_result = _execute_create_management_income(job, item, target_month)
                    item.status = BulkJobItemStatus.EXECUTED
                    item.result = execution_result

                elif job.operation_type == BulkOperationType.EXPORT_DEBT_REPORT:
                    execution_result = _execute_export_debt_report(item, normalized_month)
                    item.status = BulkJobItemStatus.EXECUTED
                    item.result = execution_result

                else:
                    raise ValidationError(f"Unsupported operation type: {job.operation_type}")

                item.executed_at = timezone.now()
                item.save(update_fields=["status", "result", "executed_at", "updated_at"])

        except Exception as exc:
            logger.exception("Bulk item execution failed", exc_info=exc)
            item.status = BulkJobItemStatus.FAILED
            item.result = {"error": str(exc)}
            item.save(update_fields=["status", "result", "updated_at"])
            _record_error(
                job,
                message=str(exc),
                item=item,
                error_code=exc.__class__.__name__,
            )

    executed_count = job.items.filter(status=BulkJobItemStatus.EXECUTED).count()
    failed_count = job.items.filter(status=BulkJobItemStatus.FAILED).count()
    skipped_count = job.items.filter(status=BulkJobItemStatus.SKIPPED).count()

    if failed_count > 0 and executed_count == 0:
        final_status = BulkJobStatus.FAILED
    elif failed_count > 0:
        final_status = BulkJobStatus.PARTIAL
    else:
        final_status = BulkJobStatus.COMPLETED

    job.status = final_status
    job.finished_at = timezone.now()
    job.summary = {
        **(job.summary or {}),
        "execution": {
            "executed": executed_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "finished_at": job.finished_at.isoformat(),
        },
    }
    job.save(update_fields=["status", "finished_at", "summary", "updated_at"])

    return job


def _finalize_without_validated_items(job: BulkJob) -> BulkJob:
    executed_count = job.items.filter(status=BulkJobItemStatus.EXECUTED).count()
    failed_count = job.items.filter(status=BulkJobItemStatus.FAILED).count()
    skipped_count = job.items.filter(status=BulkJobItemStatus.SKIPPED).count()

    if failed_count > 0 and executed_count == 0:
        final_status = BulkJobStatus.FAILED
    elif failed_count > 0:
        final_status = BulkJobStatus.PARTIAL
    else:
        final_status = BulkJobStatus.COMPLETED

    job.status = final_status
    job.finished_at = timezone.now()
    _merge_job_summary(
        job,
        {
            "execution": {
                "executed": executed_count,
                "failed": failed_count,
                "skipped": skipped_count,
                "finished_at": job.finished_at.isoformat(),
                "note": "No validated items were available for execution.",
            }
        },
    )
    job.save(update_fields=["status", "finished_at", "summary", "updated_at"])
    return job


def execute_job(job: BulkJob, item_ids: list[str] | None = None) -> BulkJob:
    if not job.dry_run_completed:
        raise ValidationError("Dry-run is required before execution.")

    queryset = job.items.select_related("building").filter(status=BulkJobItemStatus.VALIDATED)
    if item_ids:
        queryset = queryset.filter(id__in=item_ids)

    if not queryset.exists():
        return _finalize_without_validated_items(job)

    return _execute_items(job, queryset)


def retry_failed_items(job: BulkJob, item_ids: list[str] | None = None) -> BulkJob:
    queryset = job.items.select_related("building").filter(status=BulkJobItemStatus.FAILED)
    if item_ids:
        queryset = queryset.filter(id__in=item_ids)

    failed_items = list(queryset)
    if not failed_items:
        raise ValidationError("No failed items available for retry.")

    for item in failed_items:
        item.status = BulkJobItemStatus.VALIDATED
        item.retry_count = item.retry_count + 1
        item.save(update_fields=["status", "retry_count", "updated_at"])

    return execute_job(job, item_ids=[str(item.id) for item in failed_items])


def queue_job_execution(
    job: BulkJob,
    *,
    schema_name: str,
    mode: str,
    item_ids: list[str] | None = None,
) -> str | None:
    """
    Queue bulk job processing through Celery.

    Returns:
        task_id if a new task was queued, None when job is already running.
    """
    normalized_mode = (mode or "").strip().lower()
    if normalized_mode not in {"execute", "retry"}:
        raise ValidationError({"mode": f"Unsupported queue mode: {mode}"})

    normalized_item_ids = [str(item_id) for item_id in (item_ids or [])]

    with transaction.atomic():
        locked_job = BulkJob.objects.select_for_update().get(id=job.id)

        if normalized_mode == "execute" and not locked_job.dry_run_completed:
            raise ValidationError("Dry-run is required before execution.")

        if locked_job.status == BulkJobStatus.CANCELLED:
            raise ValidationError("Cancelled jobs cannot be executed.")

        if locked_job.status == BulkJobStatus.RUNNING:
            return None

        if normalized_mode == "retry":
            failed_queryset = locked_job.items.filter(status=BulkJobItemStatus.FAILED)
            if normalized_item_ids:
                failed_queryset = failed_queryset.filter(id__in=normalized_item_ids)
            if not failed_queryset.exists():
                raise ValidationError("No failed items available for retry.")

        locked_job.status = BulkJobStatus.RUNNING
        locked_job.started_at = timezone.now()
        locked_job.finished_at = None
        _merge_job_summary(
            locked_job,
            {
                "queue": {
                    "mode": normalized_mode,
                    "queued_at": locked_job.started_at.isoformat(),
                    "schema_name": schema_name,
                    "item_ids": normalized_item_ids,
                }
            },
        )
        locked_job.save(update_fields=["status", "started_at", "finished_at", "summary", "updated_at"])

    from .tasks import process_bulk_job_task

    try:
        async_result = process_bulk_job_task.delay(
            job_id=str(job.id),
            schema_name=schema_name,
            mode=normalized_mode,
            item_ids=normalized_item_ids,
        )
    except Exception as exc:
        locked_job = BulkJob.objects.filter(id=job.id).first()
        if locked_job:
            locked_job.status = BulkJobStatus.FAILED
            locked_job.finished_at = timezone.now()
            _merge_job_summary(
                locked_job,
                {
                    "queue": {
                        "mode": normalized_mode,
                        "queued_at": (locked_job.started_at or timezone.now()).isoformat(),
                        "schema_name": schema_name,
                        "item_ids": normalized_item_ids,
                        "error": str(exc),
                    }
                },
            )
            locked_job.save(update_fields=["status", "finished_at", "summary", "updated_at"])
            _record_error(locked_job, message=f"Failed to queue job: {exc}", error_code="QueueError")
        raise ValidationError({"detail": f"Failed to queue bulk job: {exc}"})

    locked_job = BulkJob.objects.filter(id=job.id).first()
    if locked_job:
        summary = dict(locked_job.summary or {})
        queue_summary = dict(summary.get("queue") or {})
        queue_summary["task_id"] = async_result.id
        summary["queue"] = queue_summary
        locked_job.summary = summary
        locked_job.save(update_fields=["summary", "updated_at"])

    return async_result.id
