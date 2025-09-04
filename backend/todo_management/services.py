from __future__ import annotations

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


