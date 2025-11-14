#!/usr/bin/env python
"""
Διόρθωση financial_system_start_date για το κτίριο Αλκμάνος 22
Ορίζει την ημερομηνία έναρξης μόνο αν δεν υπάρχει ήδη.
"""
import os
import sys
import django
from datetime import date
from django.utils import timezone

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def fix_building_start_date():
    """Ορίζει το financial_system_start_date για το κτίριο μόνο αν δεν υπάρχει ήδη"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ ΚΑΙ ΟΡΙΣΜΟΣ FINANCIAL_SYSTEM_START_DATE")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο 'Αλκμάνος'")
            return

        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        print(f"   Τρέχον financial_system_start_date: {building.financial_system_start_date}\n")

        # Ελέγχουμε αν υπάρχει ήδη
        if building.financial_system_start_date:
            print(f"✅ Το financial_system_start_date είναι ήδη ορισμένο: {building.financial_system_start_date}")
            print("   Δεν χρειάζεται αλλαγή.\n")
            return

        print("⚠️  Το financial_system_start_date δεν είναι ορισμένο. Προχωράμε στον ορισμό...\n")

        # Βρίσκουμε την παλαιότερη δαπάνη
        oldest_expense = Expense.objects.filter(
            building=building
        ).order_by('date').first()

        if oldest_expense:
            # Ορίζουμε την 1η του μήνα της παλαιότερης δαπάνης
            expense_date = oldest_expense.date
            start_date = date(expense_date.year, expense_date.month, 1)
            print(f"   📅 Παλαιότερη δαπάνη: {oldest_expense.title}")
            print(f"   📅 Ημερομηνία δαπάνης: {expense_date}")
            print(f"   📅 Ορισμός start_date: {start_date} (1η του μήνα)")
        else:
            # Default: 1η του τρέχοντος μήνα (όπως στο Building.save())
            today = timezone.now().date()
            start_date = today.replace(day=1)
            print(f"   ⚠️  Δεν βρέθηκαν δαπάνες")
            print(f"   📅 Χρήση default: {start_date} (1η του τρέχοντος μήνα)")

        print(f"\n   ✅ Ορισμός financial_system_start_date: {start_date}")

        building.financial_system_start_date = start_date
        building.save(update_fields=['financial_system_start_date'])

        print(f"\n   ✅ Ενημερωμένο building:")
        print(f"      financial_system_start_date: {building.financial_system_start_date}")

        print("\n" + "="*80)
        print("ΟΛΟΚΛΗΡΩΣΗ")
        print("="*80 + "\n")

if __name__ == '__main__':
    fix_building_start_date()
