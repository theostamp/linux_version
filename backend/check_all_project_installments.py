#!/usr/bin/env python3
"""
🔍 Script για έλεγχο όλων των δόσεων έργου
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

def check_all_project_installments():
    """Έλεγχος όλων των δόσεων έργου για πιθανά προβλήματα"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΟΛΩΝ ΤΩΝ ΔΟΣΕΩΝ ΕΡΓΟΥ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση όλων των προγραμματισμένων έργων
        maintenance_projects = ScheduledMaintenance.objects.filter(
            building=building,
            payment_schedule__isnull=False
        )
        
        print(f"🔧 Προγραμματισμένα έργα με δόσεις: {maintenance_projects.count()}")
        print()
        
        for maintenance in maintenance_projects:
            print(f"📋 Έργο: {maintenance.title}")
            
            schedule = maintenance.payment_schedule
            print(f"   💰 Συνολικό κόστος: {schedule.total_amount}€")
            print(f"   💰 Προκαταβολή: {schedule.advance_amount}€")
            print(f"   📅 Ημερομηνία έναρξης: {schedule.start_date}")
            print(f"   📊 Δόσεις: {schedule.installment_count}")
            print()
            
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
            
            print(f"   📅 Αναμενόμενες ημερομηνίες:")
            for desc, date in expected_dates:
                print(f"      - {desc}: {date}")
            print()
            
            # Έλεγχος πραγματικών δαπανών
            expenses = Expense.objects.filter(
                building=building,
                title__icontains=maintenance.title
            ).order_by('date')
            
            print(f"   💸 Πραγματικές δαπάνες ({expenses.count()}):")
            for expense in expenses:
                print(f"      - {expense.date} | {expense.title} | €{expense.amount}")
            
            print()
            
            # Έλεγχος για αποκλίσεις
            print(f"   🔍 Έλεγχος αποκλίσεων:")
            
            # Ανάλυση προκαταβολής
            advance_expenses = [e for e in expenses if 'Προκαταβολή' in e.title]
            if advance_expenses and schedule.advance_amount > 0:
                advance_expense = advance_expenses[0]
                expected_advance_date = schedule.start_date
                if advance_expense.date != expected_advance_date:
                    print(f"      ⚠️ Προκαταβολή: Αναμενόμενη {expected_advance_date}, Πραγματική {advance_expense.date}")
                else:
                    print(f"      ✅ Προκαταβολή: Σωστή ημερομηνία")
            
            # Ανάλυση δόσεων
            installment_expenses = [e for e in expenses if 'Δόση' in e.title]
            if installment_expenses:
                current_date = schedule.start_date
                if schedule.advance_amount > 0:
                    current_date = current_date + relativedelta(months=1)
                
                for i, expense in enumerate(installment_expenses):
                    expected_date = current_date
                    if expense.date != expected_date:
                        print(f"      ⚠️ Δόση {i+1}: Αναμενόμενη {expected_date}, Πραγματική {expense.date}")
                    else:
                        print(f"      ✅ Δόση {i+1}: Σωστή ημερομηνία")
                    current_date = current_date + relativedelta(months=1)
            
            print("-" * 70)
            print()
        
        print("=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_all_project_installments()
