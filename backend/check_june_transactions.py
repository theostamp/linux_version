#!/usr/bin/env python3
"""
Script για έλεγχο συναλλαγών του Ιουνίου
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

def check_june_transactions():
    """Έλεγχος συναλλαγών του Ιουνίου"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ ΙΟΥΝΙΟΥ 2025")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Έλεγχος συναλλαγών από τον Ιούνιο
        june_transactions = Transaction.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=6
        ).order_by('apartment__number')
        
        print(f"📊 ΣΥΝΑΛΛΑΓΕΣ ΙΟΥΝΙΟΥ 2025: {june_transactions.count()}")
        print()
        
        # Ομαδοποίηση ανά διαμέρισμα
        apartment_transactions = {}
        for transaction in june_transactions:
            apartment_num = transaction.apartment.number
            if apartment_num not in apartment_transactions:
                apartment_transactions[apartment_num] = []
            apartment_transactions[apartment_num].append(transaction)
        
        # Έλεγχος κάθε διαμερίσματος
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        for apartment in apartments:
            transactions = apartment_transactions.get(apartment.number, [])
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   • Current Balance: {apartment.current_balance}€")
            print(f"   • Ιουνίου συναλλαγές: {len(transactions)}")
            
            if len(transactions) == 0:
                print("   ⚠️ ΔΕΝ ΥΠΑΡΧΟΥΝ ΣΥΝΑΛΛΑΓΕΣ!")
            else:
                for transaction in transactions:
                    print(f"   • {transaction.type}: {transaction.amount}€ - {transaction.description}")
            
            print()
        
        print("=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    check_june_transactions()
