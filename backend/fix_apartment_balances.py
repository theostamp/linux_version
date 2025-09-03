#!/usr/bin/env python3
"""
Script για διόρθωση current_balance των διαμερισμάτων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment
from buildings.models import Building

def fix_apartment_balances():
    """Διορθώνει τα current_balance των διαμερισμάτων"""
    
    with schema_context('demo'):
        print("🔧 ΔΙΟΡΘΩΣΗ CURRENT_BALANCE ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        total_updated = 0
        
        for apartment in apartments:
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   • Παλιό Balance: {apartment.current_balance}€")
            
            # Υπολογισμός νέου υπολοίπου από συναλλαγές
            transactions = Transaction.objects.filter(apartment=apartment)
            
            total_debits = sum(t.amount for t in transactions if t.type in ['expense_created', 'expense_issued'])
            total_credits = sum(t.amount for t in transactions if t.type in ['payment_received', 'common_expense_payment'])
            
            new_balance = total_credits - total_debits
            
            print(f"   • Συνολικές χρεώσεις: {total_debits}€")
            print(f"   • Συνολικές πληρωμές: {total_credits}€")
            print(f"   • Νέο Balance: {new_balance}€")
            
            if apartment.current_balance != new_balance:
                apartment.current_balance = new_balance
                apartment.save()
                total_updated += 1
                print("   ✅ ΕΝΗΜΕΡΩΘΗΚΕ")
            else:
                print("   ✅ ΗΔΗ ΣΩΣΤΟ")
            
            print()
        
        print("=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΙΟΡΘΩΣΗ")
        print(f"📊 ΕΝΗΜΕΡΩΘΗΚΑΝ: {total_updated} διαμερίσματα")
        
        # Επιβεβαίωση
        total_negative_balance = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        print(f"🔍 ΣΥΝΟΛΙΚΕΣ ΑΡΝΗΤΙΚΕΣ ΟΦΕΙΛΕΣ: {total_negative_balance}€")

if __name__ == "__main__":
    fix_apartment_balances()
