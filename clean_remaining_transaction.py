#!/usr/bin/env python3
"""
Script to clean up the remaining transaction and reset building reserve fund
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment
from buildings.models import Building

def clean_remaining_transaction():
    """Clean up the remaining transaction and reset building reserve fund"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🧹 ΚΑΘΑΡΙΣΜΟΣ ΕΝΑΠΟΜΕΙΝΟΥΣΑΣ ΣΥΝΑΛΛΑΓΗΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print()
        
        # 1. Έλεγχος εναπομείναντων συναλλαγών
        print("📊 1. ΕΛΕΓΧΟΣ ΕΝΑΠΟΜΕΙΝΟΥΣΩΝ ΣΥΝΑΛΛΑΓΩΝ")
        print("-" * 50)
        
        transactions = Transaction.objects.filter(
            apartment__building_id=building_id
        )
        
        print(f"💰 Εναπομείναντες συναλλαγές: {transactions.count()}")
        
        for trans in transactions:
            print(f"   • ID: {trans.id} | Διαμέρισμα: {trans.apartment.number} | Ποσό: {trans.amount:,.2f}€")
        
        print()
        
        # 2. Διαγραφή συναλλαγών
        print("📊 2. ΔΙΑΓΡΑΦΗ ΣΥΝΑΛΛΑΓΩΝ")
        print("-" * 50)
        
        if transactions.exists():
            print("🗑️ Διαγραφή όλων των συναλλαγών...")
            transactions.delete()
            print("✅ Διαγράφηκαν όλες οι συναλλαγές")
        else:
            print("✅ Δεν υπάρχουν συναλλαγές για διαγραφή")
        
        print()
        
        # 3. Μηδενισμός αποθεματικού κτιρίου
        print("📊 3. ΜΗΔΕΝΙΣΜΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 50)
        
        building = Building.objects.get(id=building_id)
        old_reserve = building.current_reserve
        
        building.current_reserve = Decimal('0.00')
        building.save()
        
        print(f"🏦 Παλιό αποθεματικό: {old_reserve:,.2f}€")
        print(f"🏦 Νέο αποθεματικό: {building.current_reserve:,.2f}€")
        print()
        
        # 4. Τελικός έλεγχος
        print("📊 4. ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ")
        print("-" * 50)
        
        remaining_transactions = Transaction.objects.filter(
            apartment__building_id=building_id
        ).count()
        
        print(f"💰 Εναπομείναντες συναλλαγές: {remaining_transactions}")
        print(f"🏦 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        print(f"🏠 Συνολικά διαμερίσματα: {apartments.count()}")
        
        for apartment in apartments:
            if apartment.current_balance != Decimal('0.00'):
                print(f"   ⚠️ Διαμέρισμα {apartment.number}: {apartment.current_balance:,.2f}€")
            else:
                print(f"   ✅ Διαμέρισμα {apartment.number}: 0.00€")
        
        print()
        print("=" * 60)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΚΑΘΑΡΙΣΜΟΣ")

if __name__ == "__main__":
    clean_remaining_transaction()

