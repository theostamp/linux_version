from __future__ import annotations

from typing import Optional

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from .models import TodoItem, TodoCategory, TodoLink


User = get_user_model()


def _infer_category_name_for_object(content_object) -> str:
    model_name = content_object.__class__.__name__.lower()
    if model_name in {"maintenanceticket", "workorder", "scheduledmaintenance"}:
        return "Maintenance"
    if model_name in {"project", "milestone", "contract", "offer"}:
        return "Projects"
    return "General"


def _ensure_category(building, name: str) -> TodoCategory:
    category, _ = TodoCategory.objects.get_or_create(
        building=building,
        name=name,
        defaults={"color": "blue"},
    )
    return category


def _get_building_from_object(obj):
    """Infer building from object or its obvious parents.

    Supports objects that either:
    - have a direct `building` FK, or
    - reference a parent with a building, like `ticket.building` or `project.building`.
    """
    if hasattr(obj, "building") and getattr(obj, "building") is not None:
        return obj.building

    # Common parent relations that carry building
    parent_attrs = [
        "ticket",  # WorkOrder -> MaintenanceTicket -> building
        "project",  # Milestone -> Project -> building
        "offer",  # if needed in future via offer.project.building
        "contract",  # if needed
    ]
    for attr in parent_attrs:
        if hasattr(obj, attr):
            parent = getattr(obj, attr)
            if parent is not None:
                # direct building on parent
                if hasattr(parent, "building") and getattr(parent, "building") is not None:
                    return parent.building
                # one more hop: e.g., milestone.project.building
                if hasattr(parent, "project"):
                    project = getattr(parent, "project")
                    if hasattr(project, "building") and getattr(project, "building") is not None:
                        return project.building

    raise ValueError("Linked object must have a 'building' relation")


def _resolve_actor_for_object(content_object, created_by: Optional[User], assigned_to: Optional[User]) -> User:
    """Choose a user to attribute as created_by for the Todo.

    Preference order:
    1) explicit created_by
    2) explicit assigned_to
    3) object's own reporter/created_by
    4) parent's reporter/created_by (ticket, project)
    5) first available superuser/staff/any user
    """
    if created_by:
        return created_by
    if assigned_to:
        return assigned_to

    # Look on the object itself
    for attr in ["reporter", "created_by"]:
        if hasattr(content_object, attr) and getattr(content_object, attr) is not None:
            return getattr(content_object, attr)

    # Look on known parents
    parent_attrs = ["ticket", "project", "offer", "contract"]
    for parent_attr in parent_attrs:
        if hasattr(content_object, parent_attr):
            parent = getattr(content_object, parent_attr)
            if parent is None:
                continue
            for attr in ["reporter", "created_by"]:
                if hasattr(parent, attr) and getattr(parent, attr) is not None:
                    return getattr(parent, attr)

    # Fallback to a system user
    user = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_staff=True).first() or User.objects.first()
    if user is None:
        raise RuntimeError("No user available to set as created_by for TodoItem")
    return user


@transaction.atomic
def ensure_linked_todo(
    *,
    content_object,
    title: str,
    description: str = "",
    due_at=None,
    priority: str = "medium",
    assigned_to: Optional[User] = None,
    created_by: Optional[User] = None,
) -> TodoItem:
    """Create or update a TodoItem linked to the given domain object.

    - Uses TodoLink(content_type, object_id) to avoid duplicates
    - Updates due_date/assignment/priority if existing
    - Creates TodoCategory if needed per building and object type
    """

    # Infer building even for nested objects like WorkOrder and Milestone
    building = _get_building_from_object(content_object)
    actor = _resolve_actor_for_object(content_object, created_by, assigned_to)

    # Find or create link
    ct = ContentType.objects.get_for_model(content_object.__class__)
    link = TodoLink.objects.select_related("todo").filter(
        content_type=ct, object_id=content_object.pk
    ).first()

    category_name = _infer_category_name_for_object(content_object)
    category = _ensure_category(building, category_name)

    if link is None:
        todo = TodoItem.objects.create(
            title=title,
            description=description or "",
            category=category,
            building=building,
            priority=priority,
            due_date=due_at,
            created_by=actor,
            assigned_to=assigned_to,
        )
        link = TodoLink.objects.create(
            content_type=ct,
            object_id=content_object.pk,
            todo=todo,
            primary_due_at=due_at,
        )
        return todo

    # Update existing todo
    todo = link.todo
    changed = False

    if title and todo.title != title:
        todo.title = title
        changed = True
    if description is not None and todo.description != description:
        todo.description = description
        changed = True
    if due_at != todo.due_date:
        todo.due_date = due_at
        link.primary_due_at = due_at
        link.save(update_fields=["primary_due_at"])
        changed = True
    if assigned_to and todo.assigned_to_id != (assigned_to.id if assigned_to else None):
        todo.assigned_to = assigned_to
        changed = True
    if priority and todo.priority != priority:
        todo.priority = priority
        changed = True
    if todo.category_id != category.id:
        todo.category = category
        changed = True

    if changed:
        todo.save()
    return todo


def complete_linked_todo(*, content_object) -> Optional[TodoItem]:
    """Mark linked todo as completed if exists."""
    ct = ContentType.objects.get_for_model(content_object.__class__)
    link = TodoLink.objects.select_related("todo").filter(
        content_type=ct, object_id=content_object.pk
    ).first()
    if not link:
        return None
    todo = link.todo
    if todo.status != "completed":
        todo.complete()
    return todo

from typing import Dict

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import TodoCategory, TodoItem


def sync_financial_overdues(building_id: int, actor) -> Dict[str, int]:
    """Create TODOs for apartments with negative balance (debts) for a building.

    Returns a dict with created/skipped/total counts.
    """
    from decimal import Decimal
    from apartments.models import Apartment

    # Ensure actor exists
    if actor is None:
        User = get_user_model()
        actor = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_staff=True).first()
        if actor is None:
            raise RuntimeError("No suitable actor user found to attribute created_by")

    category, _ = TodoCategory.objects.get_or_create(
        building_id=building_id,
        name="Ληγμένες Πληρωμές",
        defaults={
            "icon": "alert-triangle",
            "color": "red",
            "description": "Αυτόματα δημιουργημένα TODOs για οφειλές διαμερισμάτων",
        },
    )

    apartments = Apartment.objects.filter(building_id=building_id, current_balance__lt=0)
    created = 0
    skipped_existing = 0
    now = timezone.now()

    for apartment in apartments:
        debt_amount: Decimal = (apartment.current_balance or Decimal("0")) * Decimal("-1")
        exists = TodoItem.objects.filter(
            building_id=building_id,
            apartment=apartment,
            status__in=["pending", "in_progress"],
            tags__contains=["financial_overdue"],
        ).exists()
        if exists:
            skipped_existing += 1
            continue

        priority = "urgent" if debt_amount > Decimal("100.00") else "high"
        TodoItem.objects.create(
            title=f"Ληγμένη πληρωμή: Διαμέρισμα {apartment.number}",
            description=(
                f"Το διαμέρισμα {apartment.number} έχει οφειλή {debt_amount:.2f}€. "
                f"Επικοινωνία: {apartment.occupant_name} {apartment.occupant_phone or ''}"
            ).strip(),
            category=category,
            building_id=building_id,
            apartment=apartment,
            priority=priority,
            status="pending",
            due_date=now,
            created_by=actor,
            tags=["financial_overdue", f"apartment:{apartment.id}"]
        )
        created += 1

    return {
        "created": created,
        "skipped": skipped_existing,
        "total_apartments_with_debt": apartments.count(),
    }


def sync_maintenance_schedule(building_id: int, actor) -> Dict[str, int]:
    """Create TODOs from ScheduledMaintenance records for a building.

    Returns a dict with created/skipped/total counts.
    """
    from maintenance.models import ScheduledMaintenance

    # Ensure actor exists
    if actor is None:
        User = get_user_model()
        actor = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_staff=True).first()
        if actor is None:
            raise RuntimeError("No suitable actor user found to attribute created_by")

    category, _ = TodoCategory.objects.get_or_create(
        building_id=building_id,
        name="Συντηρήσεις",
        defaults={
            "icon": "wrench",
            "color": "orange",
            "description": "Αυτόματα TODOs από προγραμματισμένες συντηρήσεις",
        },
    )

    maint_qs = ScheduledMaintenance.objects.filter(building_id=building_id).exclude(status="completed")

    created = 0
    skipped = 0

    for maint in maint_qs:
        exists = TodoItem.objects.filter(
            building_id=building_id,
            status__in=["pending", "in_progress"],
            tags__contains=[f"maintenance:{maint.id}"]
        ).exists()
        if exists:
            skipped += 1
            continue

        # Determine priority from maintenance priority
        priority = "urgent" if maint.priority == "urgent" else ("high" if maint.priority == "high" else "medium")

        # Build due datetime from date
        if maint.scheduled_date:
            from datetime import datetime
            due_dt = timezone.make_aware(datetime.combine(maint.scheduled_date, datetime.min.time()))
        else:
            due_dt = timezone.now()

        TodoItem.objects.create(
            title=f"Συντήρηση: {maint.title}",
            description=(maint.description or "").strip(),
            category=category,
            building_id=building_id,
            apartment=None,
            priority=priority,
            status="pending",
            due_date=due_dt,
            created_by=actor,
            tags=["maintenance", f"maintenance:{maint.id}"]
        )
        created += 1

    return {
        "created": created,
        "skipped": skipped,
        "total_scheduled": maint_qs.count(),
    }


