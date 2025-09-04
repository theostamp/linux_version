from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import MaintenanceTicket, WorkOrder
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


