#!/usr/bin/env python
"""
Διόρθωση financial_system_start_date για το κτίριο Αλκμάνος 22
"""
import os
import sys
import django
from datetime import date

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense

def fix_building_start_date():
    """Ορίζει το financial_system_start_date για το κτίριο"""

    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΔΙΟΡΘΩΣΗ FINANCIAL_SYSTEM_START_DATE")
        print("="*80 + "\n")

        # Βρίσκουμε το building
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο")
            return

        print(f"🏢 Κτίριο: {building.name}")
        print(f"   Τρέχον financial_system_start_date: {building.financial_system_start_date}\n")

        # Βρίσκουμε την παλαιότερη δαπάνη
        oldest_expense = Expense.objects.filter(
            building=building
        ).order_by('date').first()

        if oldest_expense:
            start_date = oldest_expense.date
            print(f"   Παλαιότερη δαπάνη: {oldest_expense.title}")
            print(f"   Ημερομηνία: {oldest_expense.date}")
        else:
            # Default: Ιούνιος 2025 (όπως αναφέρεται στον κώδικα)
            start_date = date(2025, 6, 1)
            print(f"   Δεν βρέθηκαν δαπάνες, χρήση default: {start_date}")

        print(f"\n   ✅ Ορισμός financial_system_start_date: {start_date}")

        building.financial_system_start_date = start_date
        building.save(update_fields=['financial_system_start_date'])

        print(f"\n   Ενημερωμένο building:")
        print(f"      financial_system_start_date: {building.financial_system_start_date}")

        print("\n" + "="*80)
        print("ΟΛΟΚΛΗΡΩΣΗ")
        print("="*80 + "\n")

if __name__ == '__main__':
    fix_building_start_date()
