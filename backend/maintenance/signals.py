from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import datetime

from .models import MaintenanceTicket, WorkOrder, ServiceReceipt, ScheduledMaintenance
from financial.models import Expense
from todo_management.services import ensure_linked_todo, complete_linked_todo
from core.utils import publish_building_event
from announcements.models import Announcement
from users.services import EmailService
import logging

logger = logging.getLogger(__name__)


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
    
    # Handle resolution logic (email and kiosk announcement)
    if instance.status in {"completed", "closed"}:
        complete_linked_todo(content_object=instance)
        
        # Check if we already handled this resolution to avoid duplicates
        # We can use a simple check or a cache, but for now let's just do it
        # ideally we only want to do this once when it transition to completed/closed
        
        # Create Kiosk Announcement
        try:
            # Validity: 3 days
            start_date = timezone.now().date()
            end_date = start_date + timezone.timedelta(days=3)
            
            # Find an author (manager or staff or reporter as fallback)
            author = instance.assignee or instance.reporter
            
            # Check if an announcement already exists for this ticket to avoid spam
            announcement_title = f"Αποκατάσταση: {instance.title}"
            if not Announcement.objects.filter(building=instance.building, title=announcement_title, created_at__gt=timezone.now() - timezone.timedelta(days=1)).exists():
                Announcement.objects.create(
                    building=instance.building,
                    author=author,
                    title=announcement_title,
                    description=f"Η βλάβη '{instance.title}' αποκαταστάθηκε επιτυχώς. Σας ευχαριστούμε για την υπομονή σας.",
                    start_date=start_date,
                    end_date=end_date,
                    published=True,
                    is_active=True,
                    is_urgent=False, # It will show up in normal announcements
                    priority=10 # Higher priority to be seen
                )
                logger.info(f"Created kiosk announcement for resolved ticket {instance.id}")
        except Exception as e:
            logger.error(f"Error creating kiosk announcement for ticket {instance.id}: {e}")

        # Send Email Notification
        if instance.reporter and instance.reporter.email:
            try:
                EmailService.send_maintenance_resolved_email(instance)
                logger.info(f"Sent resolution email for ticket {instance.id} to {instance.reporter.email}")
            except Exception as e:
                logger.error(f"Error sending resolution email for ticket {instance.id}: {e}")

    elif instance.status == "cancelled":
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


# -----------------------
# ScheduledMaintenance -> Event sync for calendar integration
# -----------------------

@receiver(post_save, sender=ScheduledMaintenance)
def create_or_update_maintenance_event(sender, instance, created, **kwargs):
    """
    Δημιουργεί ή ενημερώνει αυτόματα event όταν δημιουργείται/ενημερώνεται scheduled maintenance
    """
    from events.models import Event
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Get admin user for event creation
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        return
    
    # Map maintenance priority to event priority
    priority_map = {
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
        'urgent': 'urgent'
    }
    
    # Map maintenance status to event status
    status_map = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'cancelled': 'cancelled'
    }
    
    # Create description with details
    description = f"""Προγραμματισμένη συντήρηση: {instance.title}

📋 **Λεπτομέρειες:**
- Προτεραιότητα: {instance.get_priority_display() if hasattr(instance, 'get_priority_display') else instance.priority}
- Κατάσταση: {instance.get_status_display() if hasattr(instance, 'get_status_display') else instance.status}
- Εργολάβος: {instance.contractor.name if instance.contractor else 'Δεν έχει οριστεί'}
- Κόστος: €{instance.total_cost or instance.estimated_cost or 0:.2f}
- Τοποθεσία: {instance.location or 'Όλο το κτίριο'}

{instance.description or 'Χωρίς περιγραφή'}

📊 **Ενέργειες:**
🔗 [Προβολή Maintenance](http://demo.localhost:3001/maintenance)
🔗 [Λεπτομέρειες Έργου](http://demo.localhost:3001/maintenance/scheduled/{instance.id})
🔗 [Επεξεργασία](http://demo.localhost:3001/maintenance/scheduled/{instance.id}/edit)"""
    
    # Convert scheduled_date to datetime if it's a date
    if instance.scheduled_date:
        if isinstance(instance.scheduled_date, datetime):
            scheduled_datetime = instance.scheduled_date
        else:
            # Convert date to datetime at start of day
            scheduled_datetime = datetime.combine(instance.scheduled_date, datetime.min.time())
            if timezone.is_naive(scheduled_datetime):
                scheduled_datetime = timezone.make_aware(scheduled_datetime)
    else:
        scheduled_datetime = timezone.now()
    
    # Try to find existing event for this maintenance
    try:
        existing_event = Event.objects.filter(
            notes__contains=f'maintenance_id:{instance.id}'
        ).first()
        
        if existing_event:
            # Update existing event
            existing_event.title = f'🔧 {instance.title}'
            existing_event.description = description
            existing_event.priority = priority_map.get(instance.priority, 'medium')
            existing_event.status = status_map.get(instance.status, 'pending')
            existing_event.scheduled_date = scheduled_datetime
            if instance.contractor:
                existing_event.contact_phone = instance.contractor.phone or ''
                existing_event.contact_email = instance.contractor.email or ''
            existing_event.save()
        else:
            # Create new event
            Event.objects.create(
                title=f'🔧 {instance.title}',
                description=description,
                event_type='maintenance',
                priority=priority_map.get(instance.priority, 'medium'),
                status=status_map.get(instance.status, 'pending'),
                building=instance.building,
                scheduled_date=scheduled_datetime,
                created_by=admin_user,
                notes=f'maintenance_id:{instance.id}',  # Store reference in notes
                contact_phone=instance.contractor.phone if instance.contractor else '',
                contact_email=instance.contractor.email if instance.contractor else ''
            )
    except Exception as e:
        # Log error but don't break the save
        print(f"Error creating/updating event for maintenance {instance.id}: {e}")


@receiver(post_save, sender=ScheduledMaintenance)
def sync_scheduled_maintenance_to_project(sender, instance, created, **kwargs):
    """
    When a ScheduledMaintenance is saved, update the linked Project with payment data
    """
    if not instance.linked_project:
        return

    # Avoid infinite loop - check if we're already syncing
    if hasattr(instance, '_syncing'):
        return

    try:
        project = instance.linked_project

        # Flag to avoid infinite recursion
        project._syncing = True

        # Update project fields from scheduled maintenance
        updated = False

        if project.payment_method != instance.payment_method:
            project.payment_method = instance.payment_method
            updated = True

        if project.installments != instance.installments:
            project.installments = instance.installments
            updated = True

        if project.advance_payment != instance.advance_payment:
            project.advance_payment = instance.advance_payment
            updated = True

        if project.payment_terms != instance.payment_terms:
            project.payment_terms = instance.payment_terms
            updated = True

        if project.final_cost != instance.total_cost:
            project.final_cost = instance.total_cost
            updated = True

        if updated:
            project.save(update_fields=['payment_method', 'installments', 'advance_payment', 'payment_terms', 'final_cost'])
            print(f"Synced ScheduledMaintenance #{instance.id} payment fields to Project #{project.id}")

    except Exception as e:
        print(f"Error syncing ScheduledMaintenance to Project: {e}")
    finally:
        # Clean up the flag
        if hasattr(project, '_syncing'):
            delattr(project, '_syncing')


@receiver(post_delete, sender=ScheduledMaintenance)
def delete_maintenance_event(sender, instance, **kwargs):
    """
    Διαγράφει το αντίστοιχο event όταν διαγράφεται scheduled maintenance
    """
    from events.models import Event
    
    try:
        Event.objects.filter(
            notes__contains=f'maintenance_id:{instance.id}'
        ).delete()
    except Exception as e:
        # Log error but don't break the delete
        print(f"Error deleting event for maintenance {instance.id}: {e}")

