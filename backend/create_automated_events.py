#!/usr/bin/env python3
"""
Management command για αυτοματοποιημένη δημιουργία events.

Χρήση:
    docker cp create_automated_events.py linux_version-backend-1:/app/
    docker exec -it linux_version-backend-1 python /app/create_automated_events.py
    
Λειτουργίες:
1. Καθυστερημένα κοινόχρηστα (>1 μήνας)
2. Υπενθύμιση έκδοσης κοινοχρήστων (1η κάθε μήνα)  
3. Πληρωμές υπηρεσιών maintenance
"""

import os
import sys
import django
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction
from maintenance.models import ScheduledMaintenance, PaymentInstallment
from events.models import Event


def create_overdue_common_expense_events(dry_run=False, building_id=None):
    """Δημιουργεί events για καθυστερημένα κοινόχρηστα >1 μήνας"""
    print("📋 Έλεγχος καθυστερημένων κοινοχρήστων...")
    
    created_events = []
    one_month_ago = timezone.now() - timedelta(days=30)
    
    # Βρες κτίρια για επεξεργασία
    buildings = Building.objects.all()
    if building_id:
        buildings = buildings.filter(id=building_id)
        
    for building in buildings:
        # Βρες διαμερίσματα με καθυστερημένα κοινόχρηστα
        overdue_apartments = []
        
        for apartment in building.apartments.all():
            # Χρήση του current_balance από το apartment
            balance = apartment.current_balance or 0
            
            # Έλεγχος αν υπάρχει οφειλή
            if balance < 0:  # Αρνητικό υπόλοιπο σημαίνει οφειλή
                overdue_apartments.append({
                    'apartment': apartment,
                    'balance': abs(balance),  # Εμφάνιση θετικού ποσού
                    'last_payment_date': None  # Θα το βελτιώσουμε αργότερα
                })
        
        # Δημιουργία event αν υπάρχουν καθυστερήσεις
        if overdue_apartments:
            # Έλεγχος αν υπάρχει ήδη παρόμοιο event για αυτό το κτίριο
            existing_event = Event.objects.filter(
                building=building,
                event_type='payment_delay',
                status__in=['pending', 'in_progress'],
                created_at__gte=timezone.now() - timedelta(days=7)  # Μέσα στην τελευταία εβδομάδα
            ).exists()
            
            if not existing_event:
                apartment_list = ", ".join([f"{apt['apartment'].number}" for apt in overdue_apartments[:5]])
                if len(overdue_apartments) > 5:
                    apartment_list += f" (+{len(overdue_apartments)-5} ακόμα)"
                
                total_overdue = sum([apt['balance'] for apt in overdue_apartments])
                
                event_data = {
                    'title': f'Καθυστερημένα Κοινόχρηστα - {building.name}',
                    'description': f'''Εντοπίστηκαν {len(overdue_apartments)} διαμερίσματα με καθυστερημένα κοινόχρηστα άνω του 1 μήνα.

Διαμερίσματα: {apartment_list}
Συνολικό ποσό καθυστέρησης: €{total_overdue:.2f}

Απαιτείται επικοινωνία με τους ιδιοκτήτες για τακτοποίηση των οφειλών.

📊 **Ενέργειες:**
🔗 [Προβολή Οικονομικών](http://demo.localhost:3001/financial)
🔗 [Διαχείριση Διαμερισμάτων](http://demo.localhost:3001/apartments)
🔗 [Έκδοση Κοινοχρήστων](http://demo.localhost:3001/financial/common-expenses)''',
                    'event_type': 'payment_delay',
                    'priority': 'high',
                    'building': building,
                    'building_name': building.name,
                    'scheduled_date': timezone.now(),
                    'due_date': timezone.now() + timedelta(days=7)
                }
                
                if not dry_run:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    admin_user = User.objects.filter(is_staff=True).first()
                    
                    if admin_user:
                        event = Event.objects.create(
                            title=event_data['title'],
                            description=event_data['description'],
                            event_type=event_data['event_type'],
                            priority=event_data['priority'],
                            building=event_data['building'],
                            scheduled_date=event_data['scheduled_date'],
                            due_date=event_data['due_date'],
                            created_by=admin_user
                        )
                        
                        # Σύνδεση με διαμερίσματα που αφορά
                        for apt in overdue_apartments:
                            event.apartments.add(apt['apartment'])
                
                created_events.append(event_data)
    
    return created_events


def create_monthly_reminder_events(dry_run=False, building_id=None):
    """Δημιουργεί events για υπενθύμιση έκδοσης κοινοχρήστων κάθε 1η του μήνα"""
    print("📅 Έλεγχος υπενθυμίσεων κοινοχρήστων...")
    
    created_events = []
    today = date.today()
    
    # Έλεγχος αν είμαστε στην 1η του μήνα ή κοντά (πρώτες 3 μέρες)
    if today.day <= 3:
        buildings = Building.objects.all()
        if building_id:
            buildings = buildings.filter(id=building_id)
            
        for building in buildings:
            # Έλεγχος αν υπάρχει ήδη reminder για αυτό το μήνα
            existing_event = Event.objects.filter(
                building=building,
                event_type='reminder',
                title__icontains='Έκδοση Κοινοχρήστων',
                scheduled_date__year=today.year,
                scheduled_date__month=today.month
            ).exists()
            
            if not existing_event:
                # Υπολογισμός προηγούμενου μήνα
                prev_month = today.replace(day=1) - timedelta(days=1)
                
                event_data = {
                    'title': f'Έκδοση Κοινοχρήστων {prev_month.strftime("%B %Y")} - {building.name}',
                    'description': f'''Υπενθύμιση για την έκδοση των κοινοχρήστων του {prev_month.strftime("%B %Y")}.

Βήματα:
1. Συλλογή και επεξεργασία δαπανών μήνα
2. Υπολογισμός κατανομής ανά διαμέρισμα
3. Έκδοση και αποστολή λογαριασμών
4. Ενημέρωση ενοίκων/ιδιοκτητών

Προθεσμία ολοκλήρωσης: έως {today + timedelta(days=5)}

📊 **Ενέργειες:**
🔗 [Διαχείριση Δαπανών](http://demo.localhost:3001/financial/expenses)
🔗 [Έκδοση Κοινοχρήστων](http://demo.localhost:3001/financial/common-expenses)
🔗 [Προβολή Οικονομικών](http://demo.localhost:3001/financial)
🔗 [Λίστα Διαμερισμάτων](http://demo.localhost:3001/apartments)''',
                    'event_type': 'reminder',
                    'priority': 'medium',
                    'building': building,
                    'building_name': building.name,
                    'scheduled_date': timezone.make_aware(
                        datetime.combine(today, datetime.min.time())
                    ),
                    'due_date': timezone.make_aware(
                        datetime.combine(today + timedelta(days=5), datetime.min.time())
                    )
                }
                
                if not dry_run:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    admin_user = User.objects.filter(is_staff=True).first()
                    
                    if admin_user:
                        Event.objects.create(
                            title=event_data['title'],
                            description=event_data['description'],
                            event_type=event_data['event_type'],
                            priority=event_data['priority'],
                            building=event_data['building'],
                            scheduled_date=event_data['scheduled_date'],
                            due_date=event_data['due_date'],
                            created_by=admin_user
                        )
                
                created_events.append(event_data)
    
    return created_events


def create_maintenance_payment_events(dry_run=False, building_id=None):
    """Δημιουργεί events για πληρωμές υπηρεσιών maintenance"""
    print("🔧 Έλεγχος maintenance payments...")
    
    created_events = []
    
    # Βρες installments που πλησιάζουν η έχουν περάσει την ημερομηνία πληρωμής
    upcoming_threshold = timezone.now().date() + timedelta(days=5)  # 5 μέρες μπροστά
    
    installments = PaymentInstallment.objects.select_related(
        'payment_schedule__scheduled_maintenance__building',
        'payment_schedule__scheduled_maintenance__contractor'
    ).filter(
        status='pending',
        due_date__lte=upcoming_threshold
    )
    
    if building_id:
        installments = installments.filter(
            payment_schedule__scheduled_maintenance__building_id=building_id
        )
    
    for installment in installments:
        maintenance = installment.payment_schedule.scheduled_maintenance
        
        # Έλεγχος αν υπάρχει ήδη event για αυτό το installment
        existing_event = Event.objects.filter(
            building=maintenance.building,
            event_type='maintenance',
            status__in=['pending', 'in_progress']
        ).filter(
            description__icontains=f'Δόση: #{installment.installment_number}'
        ).filter(
            description__icontains=maintenance.title[:20]  # Μέρος του τίτλου για αναγνώριση
        ).exists()
        
        if not existing_event:
            is_overdue = installment.due_date < timezone.now().date()
            priority = 'urgent' if is_overdue else 'high'
            
            event_data = {
                'title': f'Πληρωμή Maintenance - {maintenance.title}',
                'description': f'''{'⚠️ ΕΚΠΡΟΘΕΣΜΗ ' if is_overdue else ''}Πληρωμή δόσης maintenance.

Έργο: {maintenance.title}
Εργολάβος: {maintenance.contractor.name if maintenance.contractor else 'Δεν καθορίστηκε'}
Δόση: #{installment.installment_number} από {installment.payment_schedule.installment_count}
Ποσό: €{installment.amount:.2f}
Ημερομηνία λήξης: {installment.due_date}
{'🔴 Εκπρόθεσμη από: ' + str((timezone.now().date() - installment.due_date).days) + ' ημέρες' if is_overdue else ''}

Στοιχεία πληρωμής:
- Πληρωμή: {installment.payment_schedule.payment_type}
- Τύπος πληρωμής: {installment.payment_schedule.payment_type}

📊 **Ενέργειες:**
🔗 [Προβολή Maintenance](http://demo.localhost:3001/maintenance)
🔗 [Λεπτομέρειες Έργου](http://demo.localhost:3001/maintenance/scheduled/{maintenance.id})
🔗 [Διαχείριση Δαπανών](http://demo.localhost:3001/financial/expenses)
🔗 [Προμηθευτές](http://demo.localhost:3001/suppliers)''',
                'event_type': 'maintenance',
                'priority': priority,
                'building': maintenance.building,
                'building_name': maintenance.building.name,
                'scheduled_date': timezone.make_aware(
                    datetime.combine(installment.due_date, datetime.min.time())
                ) if not is_overdue else timezone.now(),
                'due_date': timezone.make_aware(
                    datetime.combine(installment.due_date + timedelta(days=3), datetime.min.time())
                ) if not is_overdue else timezone.now() + timedelta(days=1),
                'contact_phone': maintenance.contractor.phone if maintenance.contractor else '',
                'contact_email': maintenance.contractor.email if maintenance.contractor else ''
            }
            
            if not dry_run:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                admin_user = User.objects.filter(is_staff=True).first()
                
                if admin_user:
                    Event.objects.create(
                        title=event_data['title'],
                        description=event_data['description'],
                        event_type=event_data['event_type'],
                        priority=event_data['priority'],
                        building=event_data['building'],
                        scheduled_date=event_data['scheduled_date'],
                        due_date=event_data['due_date'],
                        created_by=admin_user,
                        contact_phone=event_data.get('contact_phone', ''),
                        contact_email=event_data.get('contact_email', '')
                    )
            
            created_events.append(event_data)
    
    return created_events


def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Δημιουργεί αυτοματοποιημένα events')
    parser.add_argument('--building', type=int, help='ID κτιρίου (προεπιλογή: όλα)')
    parser.add_argument('--dry-run', action='store_true', help='Εμφάνιση χωρίς αποθήκευση')
    
    args = parser.parse_args()
    
    with schema_context('demo'):
        print("🔄 Έναρξη αυτοματοποιημένης δημιουργίας events...")
        
        created_events = []
        
        # 1. Καθυστερημένα κοινόχρηστα
        overdue_events = create_overdue_common_expense_events(args.dry_run, args.building)
        created_events.extend(overdue_events)
        
        # 2. Υπενθύμιση έκδοσης κοινοχρήστων
        monthly_events = create_monthly_reminder_events(args.dry_run, args.building)
        created_events.extend(monthly_events)
        
        # 3. Maintenance payments events
        maintenance_events = create_maintenance_payment_events(args.dry_run, args.building)
        created_events.extend(maintenance_events)
        
        # Summary
        if args.dry_run:
            print(f"🔍 DRY RUN: Θα δημιουργηθούν {len(created_events)} events")
        else:
            print(f"✅ Δημιουργήθηκαν {len(created_events)} νέα events")
            
        for event in created_events:
            status_icon = "🔍" if args.dry_run else "✅"
            print(f"  {status_icon} {event['title']} - {event['building_name']}")


if __name__ == '__main__':
    main()