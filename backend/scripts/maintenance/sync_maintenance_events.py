#!/usr/bin/env python3
"""
Script για συγχρονισμό όλων των ScheduledMaintenance με Events στο ημερολόγιο

Χρήση:
    docker cp sync_maintenance_events.py linux_version-backend-1:/app/
    docker exec linux_version-backend-1 python /app/sync_maintenance_events.py
"""

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from maintenance.models import ScheduledMaintenance
from events.models import Event
from django.contrib.auth import get_user_model

User = get_user_model()


def sync_all_maintenances():
    """Συγχρονίζει όλα τα ScheduledMaintenance με Events"""
    
    with schema_context('demo'):
        print("🔄 Έναρξη συγχρονισμού Maintenance με Events...")
        
        admin_user = User.objects.filter(is_staff=True).first()
        if not admin_user:
            print("❌ Δεν βρέθηκε admin user")
            return
        
        maintenances = ScheduledMaintenance.objects.all()
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for maintenance in maintenances:
            # Check if event already exists
            existing_event = Event.objects.filter(
                notes__contains=f'maintenance_id:{maintenance.id}'
            ).first()
            
            # Convert scheduled_date to datetime
            if maintenance.scheduled_date:
                if isinstance(maintenance.scheduled_date, datetime):
                    scheduled_datetime = maintenance.scheduled_date
                else:
                    scheduled_datetime = datetime.combine(maintenance.scheduled_date, datetime.min.time())
                    if timezone.is_naive(scheduled_datetime):
                        scheduled_datetime = timezone.make_aware(scheduled_datetime)
            else:
                scheduled_datetime = timezone.now()
            
            # Map status
            status_map = {
                'pending': 'pending',
                'in_progress': 'in_progress',
                'completed': 'completed',
                'cancelled': 'cancelled'
            }
            
            # Map priority
            priority_map = {
                'low': 'low',
                'medium': 'medium',
                'high': 'high',
                'urgent': 'urgent'
            }
            
            # Create description
            description = f"""Προγραμματισμένη συντήρηση: {maintenance.title}

📋 **Λεπτομέρειες:**
- Προτεραιότητα: {maintenance.priority}
- Κατάσταση: {maintenance.status}
- Εργολάβος: {maintenance.contractor.name if maintenance.contractor else 'Χωρίς συνεργείο'}
- Κόστος: €{maintenance.total_cost or maintenance.estimated_cost or 0:.2f}
- Τοποθεσία: {maintenance.location or 'Όλο το κτίριο'}
- Διάρκεια: {maintenance.estimated_duration or 'Δεν καθορίστηκε'}

{maintenance.description or 'Χωρίς περιγραφή'}

📊 **Ενέργειες:**
🔗 [Προβολή Maintenance](http://demo.localhost:3001/maintenance)
🔗 [Λεπτομέρειες Έργου](http://demo.localhost:3001/maintenance/scheduled/{maintenance.id})
🔗 [Επεξεργασία](http://demo.localhost:3001/maintenance/scheduled/{maintenance.id}/edit)"""
            
            if existing_event:
                # Update existing event
                existing_event.title = f'🔧 {maintenance.title}'
                existing_event.description = description
                existing_event.priority = priority_map.get(maintenance.priority, 'medium')
                existing_event.status = status_map.get(maintenance.status, 'pending')
                existing_event.scheduled_date = scheduled_datetime
                if maintenance.contractor:
                    existing_event.contact_phone = maintenance.contractor.phone or ''
                    existing_event.contact_email = maintenance.contractor.email or ''
                existing_event.save()
                updated_count += 1
                print(f"  📝 Updated: {maintenance.title}")
            else:
                # Create new event
                Event.objects.create(
                    title=f'🔧 {maintenance.title}',
                    description=description,
                    event_type='maintenance',
                    priority=priority_map.get(maintenance.priority, 'medium'),
                    status=status_map.get(maintenance.status, 'pending'),
                    building=maintenance.building,
                    scheduled_date=scheduled_datetime,
                    created_by=admin_user,
                    notes=f'maintenance_id:{maintenance.id}',
                    contact_phone=maintenance.contractor.phone if maintenance.contractor else '',
                    contact_email=maintenance.contractor.email if maintenance.contractor else ''
                )
                created_count += 1
                print(f"  ✅ Created: {maintenance.title} - {scheduled_datetime.date()}")
        
        print(f"\n📊 Αποτελέσματα:")
        print(f"  ✅ Δημιουργήθηκαν: {created_count} νέα events")
        print(f"  📝 Ενημερώθηκαν: {updated_count} events")
        print(f"  ⏭️  Παραλείφθηκαν: {skipped_count} events")
        print(f"\n✨ Ο συγχρονισμός ολοκληρώθηκε!")


if __name__ == '__main__':
    sync_all_maintenances()