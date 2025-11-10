#!/usr/bin/env python3
"""
Script για δημιουργία management_fees expenses
Δημιουργεί expenses για όλους τους μήνες από Ιανουάριο έως Σεπτέμβριο 2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from django.utils import timezone
from django.db.models import Sum

def create_management_fees_expenses():
    """Δημιουργία management_fees expenses"""
    
    with schema_context('demo'):
        print("🔧 Δημιουργία Management Fees Expenses")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Πακέτο διαχείρισης ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        
        # Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Υπολογισμός συνολικού ποσού ανά μήνα
        total_monthly_amount = building.management_fee_per_apartment * apartments.count()
        print(f"💰 Συνολικό ποσό ανά μήνα: €{total_monthly_amount}")
        
        # Μήνες που πρέπει να δημιουργήσουμε expenses
        months_to_create = [
            (2024, 1), (2024, 2), (2024, 3), (2024, 4), (2024, 5),
            (2024, 6), (2024, 7), (2024, 8), (2024, 9)
        ]
        
        total_created = 0
        
        for year, month in months_to_create:
            print(f"\n📅 Δημιουργία expense για {year}-{month:02d}")
            
            # Ημερομηνία για το expense (1η του μήνα)
            expense_date = timezone.make_aware(datetime(year, month, 1))
            
            # Έλεγχος αν υπάρχει ήδη expense για αυτόν τον μήνα
            existing_expense = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=year,
                date__month=month
            ).first()
            
            if existing_expense:
                print(f"   ⏭️ Υπάρχει ήδη expense - παρακάμπτεται")
                continue
            
            try:
                # Δημιουργία expense
                expense = Expense.objects.create(
                    building=building,
                    title=f"Πακέτο Διαχείρισης - {year}-{month:02d}",
                    amount=Decimal(str(total_monthly_amount)),
                    date=expense_date,
                    category='management_fees',
                    expense_type='management_fees',
                    distribution_type='equal_share',  # Ισόποσα ανά διαμέρισμα
                    notes=f"Αυτόματη δημιουργία - Πακέτο διαχείρισης για {year}-{month:02d}"
                )
                
                total_created += 1
                print(f"   ✅ Δημιουργήθηκε expense: €{total_monthly_amount}")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα δημιουργίας expense: {e}")
        
        print(f"\n📊 Σύνοψη:")
        print(f"   - Συνολικές expenses που δημιουργήθηκαν: {total_created}")
        print(f"   - Συνολικό ποσό: €{total_created * total_monthly_amount}")
        
        # Επαλήθευση
        print(f"\n🔍 Επαλήθευση:")
        all_management_expenses = Expense.objects.filter(
            building=building,
            category='management_fees'
        ).count()
        
        print(f"   - Συνολικές management_fees expenses στη βάση: {all_management_expenses}")
        
        # Έλεγχος ανά μήνα
        for year, month in months_to_create:
            month_expenses = Expense.objects.filter(
                building=building,
                category='management_fees',
                date__year=year,
                date__month=month
            ).count()
            if month_expenses > 0:
                month_amount = Expense.objects.filter(
                    building=building,
                    category='management_fees',
                    date__year=year,
                    date__month=month
                ).aggregate(total=Sum('amount'))['total'] or 0
                print(f"   - {year}-{month:02d}: {month_expenses} expenses, €{month_amount}")
        
        print("\n" + "=" * 60)
        print("✅ Δημιουργία ολοκληρώθηκε")

if __name__ == "__main__":
    create_management_fees_expenses()
