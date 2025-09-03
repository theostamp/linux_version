#!/usr/bin/env python3
"""
Script για έλεγχο προηγούμενων οφειλών
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from buildings.models import Building

def debug_previous_obligations():
    """Έλεγχος προηγούμενων οφειλών"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΠΡΟΗΓΟΥΜΕΝΩΝ ΟΦΕΙΛΩΝ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Δημιουργία service για τον Αύγουστο 2025
        service = FinancialDashboardService(building.id)
        
        # Λήψη δεδομένων για τον Αύγουστο 2025
        data = service.get_summary(month='2025-08')
        
        print("📊 ΔΕΔΟΜΕΝΑ ΑΠΟ FINANCIAL DASHBOARD SERVICE:")
        print(f"   • previous_obligations: {data['previous_obligations']}€")
        print(f"   • total_obligations: {data.get('total_obligations')}€")
        print(f"   • current_obligations: {data['current_obligations']}€")
        print(f"   • reserve_fund_contribution: {data['reserve_fund_contribution']}€")
        print(f"   • total_management_cost: {data['total_management_cost']}€")
        print()
        
        # Έλεγχος γιατί previous_obligations είναι 0
        print("🔍 ΕΛΕΓΧΟΣ ΓΙΑΤΙ previous_obligations = 0:")
        
        # Έλεγχος αν υπάρχουν οφειλές από τον Μάιο
        from apartments.models import Apartment
        from financial.models import Transaction
        
        # Υπολογισμός συνολικών οφειλών διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        total_apartment_obligations = sum(apartment.current_balance for apartment in apartments if apartment.current_balance < 0)
        
        print(f"   • Συνολικές αρνητικές οφειλές διαμερισμάτων: {total_apartment_obligations}€")
        
        # Έλεγχος συναλλαγών από τον Μάιο
        may_transactions = Transaction.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=5
        )
        
        print(f"   • Συναλλαγές Μάιου 2025: {may_transactions.count()}")
        for transaction in may_transactions:
            print(f"     - {transaction.apartment.number}: {transaction.amount}€ ({transaction.transaction_type})")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_previous_obligations()
