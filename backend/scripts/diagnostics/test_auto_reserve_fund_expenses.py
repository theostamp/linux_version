#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε την αυτόματη δημιουργία δαπανών αποθεματικού
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from financial.services import CommonExpenseCalculator

def test_auto_reserve_fund_expenses():
    """Δοκιμή αυτόματης δημιουργίας δαπανών αποθεματικού"""
    
    with schema_context('demo'):
        print("🧪 Δοκιμή Αυτόματης Δημιουργίας Δαπανών Αποθεματικού")
        print("=" * 60)
        
        # 1. Έλεγχος αρχικής κατάστασης
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"   • Στόχος αποθεματικού: €{building.reserve_fund_goal}")
        print(f"   • Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"   • Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print(f"   • Προτεραιότητα: {building.reserve_fund_priority}")
        
        # 2. Έλεγχος υπαρχουσών δαπανών αποθεματικού
        existing_reserve_expenses = Expense.objects.filter(
            building=building,
            category='reserve_fund'
        ).count()
        print(f"\n📊 Υπάρχουσες δαπάνες αποθεματικού: {existing_reserve_expenses}")
        
        # 3. Δοκιμή υπολογισμού shares για Σεπτέμβριο 2025
        print(f"\n🔍 Δοκιμή υπολογισμού shares για Σεπτέμβριο 2025...")
        
        calculator = CommonExpenseCalculator(
            building_id=1,
            month='2025-09'
        )
        
        shares = calculator.calculate_shares()
        
        # 4. Έλεγχος αν δημιουργήθηκε δαπάνη αποθεματικού
        new_reserve_expenses = Expense.objects.filter(
            building=building,
            category='reserve_fund'
        ).count()
        
        print(f"\n📈 Νέες δαπάνες αποθεματικού: {new_reserve_expenses}")
        
        if new_reserve_expenses > existing_reserve_expenses:
            print("✅ Δημιουργήθηκε νέα δαπάνη αποθεματικού!")
            
            # Εμφάνιση της νέας δαπάνης
            latest_reserve_expense = Expense.objects.filter(
                building=building,
                category='reserve_fund'
            ).order_by('-created_at').first()
            
            print(f"   • Τίτλος: {latest_reserve_expense.title}")
            print(f"   • Ποσό: €{latest_reserve_expense.amount}")
            print(f"   • Ημερομηνία: {latest_reserve_expense.date}")
            print(f"   • Κατηγορία: {latest_reserve_expense.category}")
            print(f"   • Τύπος: {latest_reserve_expense.expense_type}")
            
        else:
            print("❌ Δεν δημιουργήθηκε νέα δαπάνη αποθεματικού")
        
        # 5. Έλεγχος shares για αποθεματικό
        print(f"\n💰 Αποθεματικό στα shares:")
        total_reserve_in_shares = 0
        for apt_id, share in shares.items():
            if 'reserve_fund_amount' in share and share['reserve_fund_amount'] > 0:
                total_reserve_in_shares += float(share['reserve_fund_amount'])
                print(f"   • Διαμέρισμα {apt_id}: €{share['reserve_fund_amount']}")
        
        print(f"   • Σύνολο στα shares: €{total_reserve_in_shares}")
        
        # 6. Συμπέρασμα
        print(f"\n🎯 Συμπέρασμα:")
        if new_reserve_expenses > existing_reserve_expenses:
            print("   ✅ Η αυτόματη δημιουργία δαπανών αποθεματικού λειτουργεί!")
            print("   📋 Το αποθεματικό εμφανίζεται τώρα και στις δαπάνες")
        else:
            print("   ❌ Η αυτόματη δημιουργία δεν λειτούργησε")
            print("   💡 Πιθανά αίτια: αποθεματικό δεν είναι ενεργό για Σεπτέμβριο ή υπάρχει ήδη δαπάνη")

if __name__ == "__main__":
    test_auto_reserve_fund_expenses()
