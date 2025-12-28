#!/usr/bin/env python3
"""
✅ Script για validation των ημερομηνιών δόσεων
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

def validate_installment_dates():
    """Validation των ημερομηνιών δόσεων"""
    
    print("✅ VALIDATION ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση όλων των έργων με δόσεις
        maintenance_projects = ScheduledMaintenance.objects.filter(
            building=building,
            payment_schedule__isnull=False
        )
        
        print(f"🔧 Έργα με δόσεις: {maintenance_projects.count()}")
        print()
        
        all_correct = True
        
        for maintenance in maintenance_projects:
            print(f"📋 Έργο: {maintenance.title}")
            
            schedule = maintenance.payment_schedule
            
            # Υπολογισμός αναμενόμενων ημερομηνιών
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
            
            # Εύρεση πραγματικών δαπανών
            expenses = Expense.objects.filter(
                building=building,
                title__icontains=maintenance.title
            ).order_by('date')
            
            print(f"   📅 Ημερομηνία έναρξης: {schedule.start_date}")
            print(f"   💰 Προκαταβολή: {schedule.advance_amount}€")
            print(f"   📊 Δόσεις: {schedule.installment_count}")
            print()
            
            # Έλεγχος κάθε δαπάνης
            expense_list = list(expenses)
            project_correct = True
            
            for i, (desc, expected_date) in enumerate(expected_dates):
                if i < len(expense_list):
                    actual_expense = expense_list[i]
                    actual_date = actual_expense.date
                    
                    if expected_date == actual_date:
                        print(f"   ✅ {desc}: {actual_date} (σωστή)")
                    else:
                        print(f"   ❌ {desc}: Αναμενόμενη {expected_date}, Πραγματική {actual_date}")
                        project_correct = False
                        all_correct = False
                else:
                    print(f"   ❌ {desc}: Δεν βρέθηκε δαπάνη")
                    project_correct = False
                    all_correct = False
            
            # Έλεγχος για επιπλέον δαπάνες
            if len(expense_list) > len(expected_dates):
                print(f"   ⚠️ Υπάρχουν {len(expense_list) - len(expected_dates)} επιπλέον δαπάνες")
                for extra_expense in expense_list[len(expected_dates):]:
                    print(f"      - {extra_expense.date} | {extra_expense.title}")
            
            if project_correct:
                print(f"   ✅ Το έργο έχει σωστές ημερομηνίες")
            else:
                print(f"   ❌ Το έργο έχει προβλήματα με τις ημερομηνίες")
            
            print("-" * 70)
            print()
        
        # Συνολικό αποτέλεσμα
        print("=" * 70)
        if all_correct:
            print("✅ ΌΛΕΣ ΟΙ ΔΟΣΕΙΣ ΕΧΟΥΝ ΣΩΣΤΕΣ ΗΜΕΡΟΜΗΝΙΕΣ!")
            print("✅ ΔΕΝ ΥΠΑΡΧΕΙ ΚΙΝΔΥΝΟΣ ΠΑΡΟΜΟΙΟΥ ΠΡΟΒΛΗΜΑΤΟΣ!")
        else:
            print("❌ ΥΠΑΡΧΟΥΝ ΠΡΟΒΛΗΜΑΤΑ ΜΕ ΟΡΙΣΤΕΣ ΔΟΣΕΙΣ!")
            print("❌ ΧΡΕΙΑΖΕΤΑΙ ΕΠΑΝΕΛΕΓΧΟΣ!")
        
        print("=" * 70)
        print("✅ Η validation ολοκληρώθηκε!")

if __name__ == "__main__":
    validate_installment_dates()
