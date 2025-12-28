#!/usr/bin/env python3
"""
🔧 Script για διόρθωση όλων των ημερομηνιών δόσεων έργου
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
from maintenance.models import ScheduledMaintenance, PaymentSchedule

def fix_all_installment_dates():
    """Διόρθωση όλων των ημερομηνιών δόσεων έργου"""
    
    print("🔧 ΔΙΟΡΘΩΣΗ ΟΛΩΝ ΤΩΝ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση του έργου "Στεγανοποίηση Ταράτσας"
        maintenance = ScheduledMaintenance.objects.filter(
            building=building,
            title__icontains='Στεγανοποίηση Ταράτσας'
        ).first()
        
        if not maintenance:
            print("❌ Δεν βρέθηκε το έργο")
            return
        
        schedule = maintenance.payment_schedule
        if not schedule:
            print("❌ Δεν βρέθηκε payment schedule")
            return
        
        print(f"🔧 Έργο: {maintenance.title}")
        print(f"📅 Ημερομηνία έναρξης: {schedule.start_date}")
        print(f"💰 Προκαταβολή: {schedule.advance_amount}€")
        print(f"📊 Δόσεις: {schedule.installment_count}")
        print()
        
        # Υπολογισμός σωστών ημερομηνιών
        from dateutil.relativedelta import relativedelta
        
        expected_dates = []
        current_date = schedule.start_date
        
        # Προκαταβολή
        if schedule.advance_amount > 0:
            expected_dates.append(('Προκαταβολή', current_date))
            current_date = current_date + relativedelta(months=1)
        
        # Δόσεις
        for i in range(schedule.installment_count):
            expected_dates.append((f'Δόση {i+1}', current_date))
            current_date = current_date + relativedelta(months=1)
        
        print("📅 Σωστές ημερομηνίες:")
        for desc, date in expected_dates:
            print(f"   - {desc}: {date}")
        print()
        
        # Εύρεση και διόρθωση δαπανών
        expenses = Expense.objects.filter(
            building=building,
            title__icontains=maintenance.title
        ).order_by('date')
        
        print("🔧 ΔΙΟΡΘΩΣΗ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        corrections_made = 0
        
        for expense in expenses:
            print(f"📋 Δαπάνη: {expense.title}")
            print(f"   📅 Παλιά ημερομηνία: {expense.date}")
            
            # Εύρεση της σωστής ημερομηνίας
            correct_date = None
            
            if 'Προκαταβολή' in expense.title:
                correct_date = schedule.start_date
            elif 'Δόση 1' in expense.title:
                correct_date = schedule.start_date + relativedelta(months=1)
            elif 'Δόση 2' in expense.title:
                correct_date = schedule.start_date + relativedelta(months=2)
            elif 'Δόση 3' in expense.title:
                correct_date = schedule.start_date + relativedelta(months=3)
            elif 'Δόση 4' in expense.title:
                correct_date = schedule.start_date + relativedelta(months=4)
            
            if correct_date and expense.date != correct_date:
                print(f"   📅 Σωστή ημερομηνία: {correct_date}")
                expense.date = correct_date
                expense.save()
                corrections_made += 1
                print(f"   ✅ ΔΙΟΡΘΩΘΗΚΕ!")
            else:
                print(f"   ✅ Ήδη σωστή ημερομηνία")
            print()
        
        print("=" * 70)
        print(f"✅ ΔΙΟΡΘΩΘΗΚΑΝ {corrections_made} ΔΑΠΑΝΕΣ")
        
        # Επιβεβαίωση των αλλαγών
        print("\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΑΛΛΑΓΩΝ:")
        print("-" * 50)
        
        updated_expenses = Expense.objects.filter(
            building=building,
            title__icontains=maintenance.title
        ).order_by('date')
        
        for expense in updated_expenses:
            print(f"📅 {expense.date} | {expense.title} | €{expense.amount}")
        
        print("\n" + "=" * 70)
        print("✅ Η ΔΙΟΡΘΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ!")

if __name__ == "__main__":
    fix_all_installment_dates()
