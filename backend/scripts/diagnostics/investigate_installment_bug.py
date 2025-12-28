#!/usr/bin/env python3
"""
🔍 Script για έρευνα του bug στις δόσεις
"""

import os
import sys
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense
from maintenance.models import ScheduledMaintenance, PaymentSchedule

def investigate_installment_bug():
    """Έρευνα του bug στις δόσεις"""
    
    print("🔍 ΕΡΕΥΝΑ BUG ΣΤΙΣ ΔΟΣΕΙΣ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση του έργου
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
        
        # Ανάλυση της λογικής δημιουργίας
        print("🧮 ΑΝΑΛΥΣΗ ΛΟΓΙΚΗΣ ΔΗΜΙΟΥΡΓΙΑΣ:")
        print("-" * 50)
        
        from dateutil.relativedelta import relativedelta
        
        # Προσομοίωση της λογικής
        current_date = schedule.start_date
        print(f"📅 Αρχική ημερομηνία: {current_date}")
        
        # Προκαταβολή
        if schedule.advance_amount > 0:
            print(f"📅 Προκαταβολή: {current_date}")
            current_date = current_date + relativedelta(months=1)
            print(f"📅 Μετά προκαταβολή: {current_date}")
        
        # Δόσεις
        for i in range(schedule.installment_count):
            print(f"📅 Δόση {i+1}: {current_date}")
            
            # Προσομοίωση του buggy κώδικα
            import calendar
            try:
                last_day = calendar.monthrange(current_date.year, current_date.month)[1]
                adjusted_date = current_date.replace(day=min(current_date.day, last_day))
                print(f"   📅 Μετά διόρθωση: {adjusted_date}")
            except:
                print(f"   📅 Χωρίς διόρθωση: {current_date}")
            
            current_date = current_date + relativedelta(months=1)
        
        print()
        
        # Έλεγχος πραγματικών δαπανών
        expenses = Expense.objects.filter(
            building=building,
            title__icontains=maintenance.title
        ).order_by('date')
        
        print("💸 ΠΡΑΓΜΑΤΙΚΕΣ ΔΑΠΑΝΕΣ:")
        print("-" * 50)
        
        for expense in expenses:
            print(f"📅 {expense.date} | {expense.title}")
            print(f"   📝 Σημειώσεις: {expense.notes}")
        
        print()
        
        # Ανάλυση του προβλήματος
        print("🔍 ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ:")
        print("-" * 50)
        
        # Υπολογισμός αναμενόμενων ημερομηνιών
        expected_dates = []
        current_date = schedule.start_date
        
        if schedule.advance_amount > 0:
            expected_dates.append(('Προκαταβολή', current_date))
            current_date = current_date + relativedelta(months=1)
        
        for i in range(schedule.installment_count):
            expected_dates.append((f'Δόση {i+1}', current_date))
            current_date = current_date + relativedelta(months=1)
        
        print("Αναμενόμενες vs Πραγματικές:")
        expense_list = list(expenses)
        
        for i, (desc, expected_date) in enumerate(expected_dates):
            if i < len(expense_list):
                actual_date = expense_list[i].date
                if expected_date != actual_date:
                    print(f"❌ {desc}: Αναμενόμενη {expected_date}, Πραγματική {actual_date}")
                else:
                    print(f"✅ {desc}: Σωστή ημερομηνία {actual_date}")
        
        print()
        
        # Υπόθεση για το bug
        print("💡 ΥΠΟΘΕΣΗ ΓΙΑ ΤΟ BUG:")
        print("-" * 50)
        print("Το πρόβλημα μπορεί να προέκυψε από:")
        print("1. Manual δημιουργία δόσεων με λάθος ημερομηνίες")
        print("2. Bug στη λογική relativedelta")
        print("3. Timezone issues")
        print("4. Calendar monthrange bug")
        print()
        print("Η λογική στο maintenance/models.py φαίνεται σωστή,")
        print("άρα πιθανότατα οι δόσεις δημιουργήθηκαν χειροκίνητα")
        print("ή με άλλο script που είχε λάθος λογική.")
        
        print("\n" + "=" * 70)
        print("✅ Η έρευνα ολοκληρώθηκε!")

if __name__ == "__main__":
    investigate_installment_bug()
