#!/usr/bin/env python3
"""
🔍 Script για έλεγχο αποθεματικού για όλα τα κτίρια
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
from financial.models import Expense, Payment

def check_all_buildings_reserve_fund():
    """Έλεγχος αποθεματικού για όλα τα κτίρια"""

    print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΓΙΑ ΟΛΑ ΤΑ ΚΤΙΡΙΑ")
    print("=" * 70)
    
    with schema_context('demo'):
        # Λήψη όλων των κτιρίων
        buildings = Building.objects.all()
        
        print(f"🏢 Σύνολο κτιρίων: {buildings.count()}")
        print()
        
        for building in buildings:
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
            print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
            print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
            print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
            print(f"📅 Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date}")
            
            # Υπολογισμός μηνιαίου στόχου
            if building.reserve_fund_duration_months > 0:
                monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
                print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
            
            # Έλεγχος για Νοέμβριο 2024
            november_expenses = Expense.objects.filter(
                building=building,
                date__year=2024,
                date__month=11,
                category='reserve_fund'
            )
            
            print(f"💸 Δαπάνες αποθεματικού Νοεμβρίου 2024: {november_expenses.count()}")
            if november_expenses.exists():
                for expense in november_expenses:
                    print(f"   - {expense.description}: {expense.amount:,.2f}€ ({expense.date})")
            
            # Έλεγχος για Οκτώβριο 2024 (για σύγκριση)
            october_expenses = Expense.objects.filter(
                building=building,
                date__year=2024,
                date__month=10,
                category='reserve_fund'
            )
            
            print(f"💸 Δαπάνες αποθεματικού Οκτωβρίου 2024: {october_expenses.count()}")
            if october_expenses.exists():
                for expense in october_expenses:
                    print(f"   - {expense.description}: {expense.amount:,.2f}€ ({expense.date})")
            
            print("-" * 70)
        
        print("\n🔍 ΕΛΕΓΧΟΣ ΗΜΕΡΟΜΗΝΙΩΝ ΕΝΑΡΞΗΣ")
        print("-" * 50)
        
        current_date = datetime.now().date()
        print(f"📅 Τρέχουσα ημερομηνία: {current_date}")
        
        for building in buildings:
            if building.reserve_fund_start_date:
                months_passed = ((current_date - building.reserve_fund_start_date).days) // 30
                print(f"🏢 {building.name}: {months_passed} μήνες από την έναρξη")
                
                # Έλεγχος αν ο Νοέμβριος 2024 είναι μετά την έναρξη
                november_2024 = datetime(2024, 11, 1).date()
                if building.reserve_fund_start_date <= november_2024:
                    print(f"   ✅ Νοέμβριος 2024 είναι μετά την έναρξη ({building.reserve_fund_start_date})")
                else:
                    print(f"   ❌ Νοέμβριος 2024 είναι πριν την έναρξη ({building.reserve_fund_start_date})")
                
                # Έλεγχος αν ο Νοέμβριος 2024 είναι πριν την ολοκλήρωση
                if building.reserve_fund_target_date:
                    if november_2024 <= building.reserve_fund_target_date:
                        print(f"   ✅ Νοέμβριος 2024 είναι πριν την ολοκλήρωση ({building.reserve_fund_target_date})")
                    else:
                        print(f"   ❌ Νοέμβριος 2024 είναι μετά την ολοκλήρωση ({building.reserve_fund_target_date})")
            else:
                print(f"🏢 {building.name}: Δεν έχει ορισμένη ημερομηνία έναρξης")
        
        print()

        print("=" * 70)
        print("✅ Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    check_all_buildings_reserve_fund()