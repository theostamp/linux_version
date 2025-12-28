#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε τις παλαιότερες οφειλές
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from buildings.models import Building
from apartments.models import Apartment
from financial.services import FinancialDashboardService

def test_previous_obligations():
    """Δοκιμή παλαιότερων οφειλών"""
    
    with schema_context('demo'):
        print("🔍 Δοκιμή Παλαιότερων Οφειλών")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # 1. Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building_id=1)
        print(f"\n🏠 Διαμερίσματα: {apartments.count()}")
        
        # 2. Δοκιμή υπολογισμού παλαιότερων οφειλών για Σεπτέμβριο 2025
        print(f"\n📅 Δοκιμή για Σεπτέμβριο 2025:")
        
        service = FinancialDashboardService(building_id=1)
        
        # Υπολογισμός apartment balances
        apartment_balances = service.get_apartment_balances('2025-09')
        
        print(f"   • Σύνολο διαμερισμάτων: {len(apartment_balances)}")
        
        # Έλεγχος κάθε διαμερίσματος
        for balance in apartment_balances:
            print(f"\n   🏠 Διαμέρισμα {balance['number']} ({balance['owner_name']}):")
            print(f"      • Τρέχον υπόλοιπο: €{balance['current_balance']}")
            print(f"      • Παλαιότερες οφειλές: €{balance['previous_balance']}")
            print(f"      • Μερίδιο δαπανών: €{balance['expense_share']}")
            print(f"      • Καθαρή υποχρέωση: €{balance['net_obligation']}")
            print(f"      • Συνολικές πληρωμές: €{balance['total_payments']}")
            print(f"      • Κατάσταση: {balance['status']}")
        
        # 3. Έλεγχος συνολικών παλαιότερων οφειλών
        total_previous_obligations = sum(balance['previous_balance'] for balance in apartment_balances)
        print(f"\n💰 Συνολικές Παλαιότερες Οφειλές: €{total_previous_obligations}")
        
        # 4. Έλεγχος δαπανών πριν από Σεπτέμβριο 2025
        print(f"\n📊 Δαπάνες πριν από Σεπτέμβριο 2025:")
        
        from datetime import date
        september_start = date(2025, 9, 1)
        
        expenses_before_september = Expense.objects.filter(
            building=building,
            date__lt=september_start
        ).order_by('-date')
        
        print(f"   • Σύνολο δαπανών: {expenses_before_september.count()}")
        
        total_expenses_before = sum(exp.amount for exp in expenses_before_september)
        print(f"   • Συνολικό ποσό: €{total_expenses_before}")
        
        for expense in expenses_before_september[:5]:  # Εμφάνιση των 5 πρώτων
            print(f"      - {expense.title}: €{expense.amount} ({expense.date})")
        
        if expenses_before_september.count() > 5:
            print(f"      - ... και {expenses_before_september.count() - 5} ακόμα")
        
        # 5. Έλεγχος συναλλαγών για διαμέρισμα 1
        print(f"\n🔍 Λεπτομέρειες για Διαμέρισμα 1:")
        
        apartment_1 = Apartment.objects.get(building_id=1, number=1)
        
        # Συναλλαγές πριν από Σεπτέμβριο
        transactions_before = Transaction.objects.filter(
            apartment=apartment_1,
            date__lt=september_start
        ).order_by('-date')
        
        print(f"   • Συναλλαγές πριν από Σεπτέμβριο: {transactions_before.count()}")
        
        total_charges = sum(t.amount for t in transactions_before if t.amount > 0)
        total_payments = sum(t.amount for t in transactions_before if t.amount < 0)
        
        print(f"   • Συνολικές χρεώσεις: €{total_charges}")
        print(f"   • Συνολικές πληρωμές: €{abs(total_payments)}")
        print(f"   • Υπόλοιπο: €{total_charges + total_payments}")
        
        # 6. Συμπέρασμα
        print(f"\n🎯 Συμπέρασμα:")
        if total_previous_obligations > 0:
            print("   ✅ Υπάρχουν παλαιότερες οφειλές")
            print("   📋 Πρέπει να εμφανίζονται στη 'Κατάσταση Διαμερισμάτων'")
        else:
            print("   ❌ Δεν υπάρχουν παλαιότερες οφειλές")
            print("   💡 Ίσως δεν υπάρχουν δαπάνες πριν από Σεπτέμβριο 2025")

if __name__ == "__main__":
    test_previous_obligations()
