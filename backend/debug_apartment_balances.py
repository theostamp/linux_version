#!/usr/bin/env python3
"""
Script για έλεγχο current_balance των διαμερισμάτων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Transaction
from buildings.models import Building

def debug_apartment_balances():
    """Έλεγχος current_balance των διαμερισμάτων"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ CURRENT_BALANCE ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος διαμερισμάτων και συναλλαγών
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        print("📊 ΔΙΑΜΕΡΙΣΜΑΤΑ ΚΑΙ ΥΠΟΛΟΙΠΑ:")
        total_negative_balance = 0
        
        for apartment in apartments:
            # Έλεγχος συναλλαγών από τον Ιούνιο
            june_transactions = Transaction.objects.filter(
                apartment=apartment,
                date__year=2025,
                date__month=6
            )
            
            june_debits = sum(t.amount for t in june_transactions if t.type in ['expense_created', 'expense_issued'])
            june_credits = sum(t.amount for t in june_transactions if t.type in ['payment_received', 'common_expense_payment'])
            
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   • Current Balance: {apartment.current_balance}€")
            print(f"   • Ιουνίου συναλλαγές: {june_transactions.count()}")
            print(f"   • Ιουνίου χρεώσεις: {june_debits}€")
            print(f"   • Ιουνίου πληρωμές: {june_credits}€")
            print(f"   • Υπόλοιπο Ιουνίου: {june_debits - june_credits}€")
            
            if apartment.current_balance and apartment.current_balance < 0:
                total_negative_balance += abs(apartment.current_balance)
                print(f"   ⚠️ ΑΡΝΗΤΙΚΟ ΥΠΟΛΟΙΠΟ: {apartment.current_balance}€")
            else:
                print(f"   ✅ ΘΕΤΙΚΟ ΥΠΟΛΟΙΠΟ: {apartment.current_balance}€")
            print()
        
        print("=" * 60)
        print(f"📊 ΣΥΝΟΛΙΚΕΣ ΑΡΝΗΤΙΚΕΣ ΟΦΕΙΛΕΣ: {total_negative_balance}€")
        
        # Έλεγχος γιατί τα current_balance δεν ενημερώθηκαν
        print("\n🔍 ΕΛΕΓΧΟΣ ΓΙΑΤΙ ΔΕΝ ΕΝΗΜΕΡΩΘΗΚΑΝ ΤΑ CURRENT_BALANCE:")
        
        # Έλεγχος αν υπάρχει μέθοδος για ενημέρωση υπολοίπων
        apartment_methods = [method for method in dir(apartments.first()) if 'balance' in method.lower() or 'update' in method.lower()]
        print(f"   • Μέθοδοι διαμερίσματος: {apartment_methods}")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_apartment_balances() 