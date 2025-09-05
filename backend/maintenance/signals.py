from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import MaintenanceTicket, WorkOrder, ServiceReceipt
from financial.models import Expense
from todo_management.services import ensure_linked_todo, complete_linked_todo
from core.utils import publish_building_event


@receiver(post_save, sender=MaintenanceTicket)
def sync_ticket_todo(sender, instance: MaintenanceTicket, created, **kwargs):
    title = f"Ticket: {instance.title}"
    ensure_linked_todo(
        content_object=instance,
        title=title,
        description=instance.description or "",
        due_at=instance.sla_due_at,
        priority=instance.priority,
        assigned_to=instance.assignee,
        created_by=instance.reporter,
    )
    if instance.status in {"completed", "closed", "cancelled"}:
        complete_linked_todo(content_object=instance)
    publish_building_event(
        building_id=instance.building_id,
        event_type="ticket.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "priority": instance.priority,
            "title": instance.title,
        },
    )


@receiver(post_save, sender=WorkOrder)
def sync_workorder_todo(sender, instance: WorkOrder, created, **kwargs):
    title = f"WO for: {instance.ticket.title}"
    ensure_linked_todo(
        content_object=instance,
        title=title,
        description=instance.notes or instance.ticket.description or "",
        due_at=instance.scheduled_at,
        priority="high" if instance.status in {"in_progress", "en_route"} else "medium",
        assigned_to=instance.assigned_to,
        created_by=instance.created_by,
    )
    if instance.status in {"done", "verified", "cancelled"}:
        complete_linked_todo(content_object=instance)
    publish_building_event(
        building_id=instance.ticket.building_id,
        event_type="workorder.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "ticket_id": instance.ticket_id,
        },
    )


# -----------------------
# ServiceReceipt -> Expense auto-link & sync (safety net beyond API)
# -----------------------

def _category_for_receipt(receipt: ServiceReceipt) -> str:
    category_map = {
        'cleaning': 'cleaning',
        'elevator': 'elevator_maintenance',
        'heating': 'heating_maintenance',
        'electrical': 'electrical_maintenance',
        'plumbing': 'plumbing_maintenance',
        'security': 'security',
        'landscaping': 'garden_maintenance',
        'maintenance': 'building_maintenance',
        'repair': 'emergency_repair',
        'technical': 'building_maintenance',
    }
    contractor_type = receipt.contractor.service_type if receipt.contractor else 'maintenance'
    return category_map.get(contractor_type, 'building_maintenance')


def _get_or_create_monthly_expense(receipt: ServiceReceipt) -> Expense:
    category = _category_for_receipt(receipt)
    expense_date = receipt.service_date.replace(day=1)
    exp = Expense.objects.filter(
        building=receipt.building,
        category=category,
        date__year=expense_date.year,
        date__month=expense_date.month,
        expense_type='regular',
    ).first()
    if exp:
        return exp
    title = f"Δαπάνη: {(receipt.contractor.name if receipt.contractor else 'Συνεργείο')} - {str(receipt.description)[:40]}"
    return Expense.objects.create(
        building=receipt.building,
        title=title,
        amount=receipt.amount,
        date=expense_date,
        category=category,
        distribution_type='by_participation_mills',
        notes=f"Συνδεδεμένη με απόδειξη ID {receipt.id}",
    )


def _refresh_expense_amount(expense: Expense):
    total = ServiceReceipt.objects.filter(linked_expense=expense).aggregate(models.Sum('amount'))['amount__sum'] or 0
    if total and total > 0:
        if expense.amount != total:
            expense.amount = total
            expense.save(update_fields=['amount'])
    else:
        try:
            expense.delete()
        except Exception:
            pass


@receiver(post_save, sender=ServiceReceipt)
def receipt_autolink_on_save(sender, instance: ServiceReceipt, created, **kwargs):
    try:
        # Ensure linked_expense exists and is correct month/category
        if not instance.service_date or not instance.building_id:
            return
        target = _get_or_create_monthly_expense(instance)
        if instance.linked_expense_id != target.id:
            ServiceReceipt.objects.filter(pk=instance.pk).update(linked_expense=target)
        _refresh_expense_amount(target)
    except Exception:
        # Safety: never break save path via signal
        pass


@receiver(post_delete, sender=ServiceReceipt)
def receipt_cleanup_on_delete(sender, instance: ServiceReceipt, **kwargs):
    try:
        if instance.linked_expense_id:
            exp = Expense.objects.filter(id=instance.linked_expense_id).first()
            if exp:
                _refresh_expense_amount(exp)
    except Exception:
        pass

