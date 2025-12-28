#!/usr/bin/env python
import os
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from maintenance.models import ScheduledMaintenance

print("\n🔧 ΔΙΟΡΘΩΣΗ NOTES ΣΕ ΔΑΠΑΝΕΣ")
print("=" * 60)

with schema_context('demo'):
    # Βρες το ScheduledMaintenance
    sm = ScheduledMaintenance.objects.first()
    if sm:
        print(f"\n✅ Βρέθηκε ScheduledMaintenance #{sm.id}: {sm.title}")
        
        # Βρες τις σχετικές δαπάνες
        expenses = Expense.objects.filter(title__icontains='Αντικατάσταση Λέβητα')
        print(f"📊 Βρέθηκαν {expenses.count()} δαπάνες")
        
        # Ενημέρωση notes
        updated = 0
        for exp in expenses:
            if 'προγραμματισμένο έργο' not in (exp.notes or '').lower():
                old_notes = exp.notes or ''
                exp.notes = f"Προγραμματισμένο έργο #{sm.id}. {old_notes}"
                exp.save()
                updated += 1
                print(f"  ✅ Ενημερώθηκε: {exp.title}")
        
        print(f"\n📝 Ενημερώθηκαν {updated} δαπάνες με reference στο ScheduledMaintenance")
        
        # Επαλήθευση
        print("\n🔍 ΕΠΑΛΗΘΕΥΣΗ:")
        for exp in expenses[:3]:
            print(f"  • {exp.title}")
            print(f"    Notes: {exp.notes[:100]}")
    else:
        print("❌ Δεν βρέθηκε ScheduledMaintenance")

print("\n✅ ΟΛΟΚΛΗΡΩΘΗΚΕ")
