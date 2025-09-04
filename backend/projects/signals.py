from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Project, Milestone
from todo_management.services import ensure_linked_todo, complete_linked_todo
from core.utils import publish_building_event


@receiver(post_save, sender=Milestone)
def sync_milestone_todo(sender, instance: Milestone, created, **kwargs):
    title = f"Milestone: {instance.title}"
    ensure_linked_todo(
        content_object=instance,
        title=title,
        description=instance.description or "",
        due_at=instance.due_at,
        priority="medium",
        assigned_to=None,
        created_by=instance.created_by,
    )
    if instance.status in {"approved"}:
        complete_linked_todo(content_object=instance)
    publish_building_event(
        building_id=instance.project.building_id,
        event_type="milestone.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "project_id": instance.project_id,
            "title": instance.title,
        },
    )


@receiver(post_save, sender=Project)
def sync_project_summary_todo(sender, instance: Project, created, **kwargs):
    # Optionally maintain a project-level todo for follow-ups
    if instance.status in {"completed", "cancelled"}:
        complete_linked_todo(content_object=instance)
    else:
        ensure_linked_todo(
            content_object=instance,
            title=f"Project: {instance.title}",
            description=instance.description or "",
            due_at=instance.end_date,
            priority="medium",
            assigned_to=instance.created_by,
            created_by=instance.created_by,
        )
    publish_building_event(
        building_id=instance.building_id,
        event_type="project.updated",
        payload={
            "id": instance.id,
            "status": instance.status,
            "title": instance.title,
        },
    )


