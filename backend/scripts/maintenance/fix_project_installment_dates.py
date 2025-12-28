#!/usr/bin/env python3
"""
🔧 Script για διόρθωση ημερομηνιών δόσεων έργου
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal
import calendar

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.utils import timezone
from financial.models import Expense
from maintenance.models import ScheduledMaintenance, PaymentSchedule
from buildings.models import Building

def fix_project_installment_dates(dry_run=True):
    """
    Διόρθωση ημερομηνιών δόσεων έργου
    """
    print("🔧 ΔΙΟΡΘΩΣΗ ΗΜΕΡΟΜΗΝΙΩΝ ΔΟΣΕΩΝ ΕΡΓΟΥ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        # Βρίσκουμε τα προγραμματισμένα έργα με δόσεις
        scheduled_maintenances = ScheduledMaintenance.objects.filter(
            building=building,
            payment_schedule__isnull=False,
            payment_schedule__installment_count__gt=0
        )
        
        fixes_applied = 0
        
        for maintenance in scheduled_maintenances:
            schedule = maintenance.payment_schedule
            
            print(f"\n🔧 Έργο: {maintenance.title}")
            print(f"   💰 Συνολικό κόστος: {schedule.total_amount}€")
            print(f"   💰 Προκαταβολή: {schedule.advance_amount}€")
            print(f"   📅 Ημερομηνία έναρξης: {schedule.start_date}")
            print(f"   📊 Δόσεις: {schedule.installment_count}")
            
            # Υπολογισμός σωστών ημερομηνιών
            expected_dates = []
            current_date = schedule.start_date
            
            # Προκαταβολή
            if schedule.advance_amount > 0:
                expected_dates.append(('Προκαταβολή', current_date))
                # Η πρώτη δόση είναι τον επόμενο μήνα
                from dateutil.relativedelta import relativedelta
                current_date = current_date + relativedelta(months=1)
            
            # Δόσεις
            for i in range(schedule.installment_count):
                # Η ημερομηνία δόσης είναι η πρώτη ημέρα του μήνα
                installment_date = current_date.replace(day=1)
                expected_dates.append((f'Δόση {i+1}', installment_date))
                current_date = current_date + relativedelta(months=1)
            
            # Εύρεση πραγματικών δαπανών
            expenses = Expense.objects.filter(
                building=building,
                title__icontains=maintenance.title
            ).order_by('date')
            
            expense_list = list(expenses)
            
            print(f"   📅 Σωστές ημερομηνίες:")
            for desc, expected_date in expected_dates:
                print(f"      - {desc}: {expected_date}")
            
            # Διόρθωση δαπανών
            for i, (desc, expected_date) in enumerate(expected_dates):
                if i < len(expense_list):
                    expense = expense_list[i]
                    if expense.date != expected_date:
                        print(f"   🔧 Διόρθωση {desc}: {expense.date} → {expected_date}")
                        if not dry_run:
                            expense.date = expected_date
                            expense.due_date = expected_date
                            expense.save()
                        fixes_applied += 1
                else:
                    print(f"   ❌ Λείπει δαπάνη για {desc} ({expected_date})")
            
            # Διαγραφή επιπλέον δαπανών αν υπάρχουν
            if len(expense_list) > len(expected_dates):
                extra_count = len(expense_list) - len(expected_dates)
                print(f"   ⚠️ Υπάρχουν {extra_count} επιπλέον δαπάνες")
                for i in range(len(expected_dates), len(expense_list)):
                    extra_expense = expense_list[i]
                    print(f"      - Επιπλέον: {extra_expense.date} | {extra_expense.title}")
                    if not dry_run:
                        extra_expense.delete()
                        fixes_applied += 1
    
    return {
        'dry_run': dry_run,
        'fixes_applied': fixes_applied,
        'message': f"{'Θα εφαρμοστούν' if dry_run else 'Εφαρμόστηκαν'} {fixes_applied} διορθώσεις"
    }

def main():
    """Κύρια συνάρτηση"""
    
    print("🔧 FIX PROJECT INSTALLMENT DATES")
    print("=" * 70)
    
    # Dry run πρώτα
    print("🔍 DRY RUN - Έλεγχος διορθώσεων...")
    result = fix_project_installment_dates(dry_run=True)
    print(f"\n{result['message']}")
    
    if result['fixes_applied'] > 0:
        print("\n⚠️ Για εφαρμογή των διορθώσεων, τρέξτε:")
        print("   fix_project_installment_dates(dry_run=False)")
        
        # Ερώτηση για εφαρμογή
        response = input("\nΘέλετε να εφαρμόσετε τις διορθώσεις; (y/N): ")
        if response.lower() == 'y':
            print("\n🔧 Εφαρμογή διορθώσεων...")
            result = fix_project_installment_dates(dry_run=False)
            print(f"\n✅ {result['message']}")
        else:
            print("❌ Ακυρώθηκε η εφαρμογή των διορθώσεων.")
    else:
        print("✅ Δεν χρειάζονται διορθώσεις!")
    
    print("\n" + "=" * 70)
    print("✅ Η διόρθωση ολοκληρώθηκε!")

if __name__ == "__main__":
    main()
