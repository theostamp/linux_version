#!/usr/bin/env python3
"""
🔧 Script για διόρθωση ημερομηνιών δόσεων έργου
"""

import os
import sys
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def fix_installment_dates():
    """Διόρθωση ημερομηνιών δόσεων έργου"""
    
    print("🔧 ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ ΕΡΓΟΥ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση της δόσης που είναι στον Δεκέμβριο (πρέπει να γίνει Νοέμβριος)
        december_installment = Expense.objects.filter(
            building=building,
            title__icontains='Δόση 1/4',
            date__year=2025,
            date__month=12
        ).first()
        
        if december_installment:
            print(f"🔍 Βρέθηκε δόση στον Δεκέμβριο:")
            print(f"   📅 Παλιά ημερομηνία: {december_installment.date}")
            print(f"   📝 Τίτλος: {december_installment.title}")
            print(f"   💰 Ποσό: {december_installment.amount:,.2f}€")
            print()
            
            # Διόρθωση ημερομηνίας σε Νοέμβριο 2025
            new_date = date(2025, 11, 30)  # 30 Νοεμβρίου 2025
            december_installment.date = new_date
            december_installment.save()
            
            print(f"✅ ΔΙΟΡΘΩΣΗ ΕΦΑΡΜΟΣΤΗΚΕ:")
            print(f"   📅 Νέα ημερομηνία: {new_date}")
            print(f"   📅 Ημερομηνία διορθώθηκε από Δεκέμβριο σε Νοέμβριο 2025")
            print()
        else:
            print("❌ Δεν βρέθηκε δόση στον Δεκέμβριο")
            return
        
        # Επιβεβαίωση των αλλαγών
        print("🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        # Εμφάνιση όλων των δόσεων μετά τη διόρθωση
        all_installments = Expense.objects.filter(
            building=building,
            title__icontains='δόση'
        ).order_by('date')
        
        for expense in all_installments:
            print(f"📅 {expense.date.strftime('%Y-%m-%d')} | {expense.title} | €{expense.amount:,.2f}")
        
        print()
        
        # Ειδικός έλεγχος για Νοέμβριο 2025
        november_installments = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=11
        )
        
        print(f"📅 Δαπάνες Νοεμβρίου 2025: {november_installments.count()}")
        for expense in november_installments:
            print(f"   - {expense.title}: €{expense.amount:,.2f}")
        
        print("\n" + "=" * 70)
        print("✅ Η ΔΙΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ!")

if __name__ == "__main__":
    fix_installment_dates()
