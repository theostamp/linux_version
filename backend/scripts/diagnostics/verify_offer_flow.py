#!/usr/bin/env python
import os
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project, Offer
from maintenance.models import ScheduledMaintenance
from financial.models import Expense

print("\n🔍 ΕΠΑΛΗΘΕΥΣΗ ΡΟΗΣ OFFER → PROJECT → EXPENSE")
print("=" * 60)

with schema_context('demo'):
    # Έλεγχος Projects και Offers
    projects = Project.objects.all()
    offers = Offer.objects.filter(status='accepted')
    scheduled_maintenances = ScheduledMaintenance.objects.all()
    
    print(f"\n📊 ΣΥΝΟΨΗ ΔΕΔΟΜΕΝΩΝ:")
    print(f"  • Projects: {projects.count()}")
    print(f"  • Accepted Offers: {offers.count()}")
    print(f"  • ScheduledMaintenances: {scheduled_maintenances.count()}")
    
    # Έλεγχος συνδεσιμότητας
    for offer in offers:
        print(f"\n🎯 OFFER #{offer.id}: {offer.contractor_name}")
        print(f"  • Project: {offer.project.title}")
        print(f"  • Amount: {offer.amount}€")
        
        # Έλεγχος ScheduledMaintenance
        sm = ScheduledMaintenance.objects.filter(linked_project=offer.project).first()
        if sm:
            print(f"  ✅ ScheduledMaintenance #{sm.id} found")
            
            # Έλεγχος Expenses
            expenses = Expense.objects.filter(
                notes__icontains=f'προγραμματισμένο έργο #{sm.id}'
            )
            print(f"  ✅ {expenses.count()} Expenses created")
            
            # Λεπτομέρειες δαπανών
            for exp in expenses[:3]:  # Δείξε τις πρώτες 3
                print(f"     - {exp.title}: {exp.amount}€")
        else:
            print(f"  ❌ NO ScheduledMaintenance found!")
            
print("\n✅ ΕΠΑΛΗΘΕΥΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ")
