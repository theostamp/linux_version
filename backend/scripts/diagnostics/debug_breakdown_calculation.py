#!/usr/bin/env python3
"""
Debug: Ελέγχος υπολογισμού breakdown
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal

def debug_breakdown_calculation():
    """Ελέγχει πώς υπολογίζεται το breakdown"""
    
    print("🔍 DEBUG: ΥΠΟΛΟΓΙΣΜΟΣ BREAKDOWN")
    print("=" * 60)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"💰 Management Fee per Apartment: €{building.management_fee_per_apartment}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Ελέγχουμε τα διαμερίσματα
        apartments = Apartment.objects.filter(building=building)
        apartments_count = apartments.count()
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments_count}")
        
        # Ελέγχουμε τον υπολογισμό για Σεπτέμβριο 2025
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΣ BREAKDOWN ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        
        try:
            calculator = CommonExpenseCalculator(building.id, "2025-09")
            
            # Παίρνουμε τα δεδομένα από το calculate_shares
            shares_data = calculator.calculate_shares()
            
            # Ελέγχουμε το πρώτο διαμέρισμα
            first_apartment = shares_data[1]  # Apartment ID 1
            print(f"📊 BREAKDOWN ΓΙΑ ΔΙΑΜΕΡΙΣΜΑ 1:")
            print(f"  - Apartment Number: {first_apartment['apartment_number']}")
            print(f"  - Total Amount: €{first_apartment['total_amount']}")
            print(f"  - Previous Balance: €{first_apartment['previous_balance']}")
            print(f"  - Total Due: €{first_apartment['total_due']}")
            
            print(f"\n📊 BREAKDOWN DETAILS:")
            for i, breakdown_item in enumerate(first_apartment['breakdown']):
                print(f"  {i+1}. Expense ID: {breakdown_item['expense_id']}")
                print(f"     Title: {breakdown_item['expense_title']}")
                print(f"     Expense Amount: €{breakdown_item['expense_amount']}")
                print(f"     Apartment Share: €{breakdown_item['apartment_share']}")
                print(f"     Distribution Type: {breakdown_item['distribution_type']}")
                print(f"     Distribution Type Display: {breakdown_item['distribution_type_display']}")
                print()
            
            # Υπολογίζουμε το συνολικό ποσό από το breakdown
            breakdown_total = sum(item['apartment_share'] for item in first_apartment['breakdown'])
            print(f"📊 ΣΥΝΟΛΟ ΑΠΟ BREAKDOWN: €{breakdown_total}")
            print(f"📊 TOTAL AMOUNT: €{first_apartment['total_amount']}")
            
            if breakdown_total != first_apartment['total_amount']:
                print(f"⚠️ ΔΙΑΦΟΡΑ: €{first_apartment['total_amount'] - breakdown_total}")
            
            # Ελέγχουμε αν υπάρχει επιπλέον management fee
            print(f"\n🔍 ΕΛΕΓΧΟΣ MANAGEMENT FEE:")
            print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")
            
            # Ελέγχουμε αν το σύστημα προσθέτει επιπλέον management fee
            management_fee_items = [item for item in first_apartment['breakdown'] 
                                  if item['distribution_type'] == 'management_fee']
            
            if management_fee_items:
                print(f"📊 MANAGEMENT FEE ITEMS:")
                for item in management_fee_items:
                    print(f"  - {item['expense_title']}: €{item['apartment_share']}")
            
            # Ελέγχουμε αν υπάρχει διπλό μέτρημα
            expense_items = [item for item in first_apartment['breakdown'] 
                           if item['distribution_type'] == 'equal_share']
            
            if expense_items:
                print(f"📊 EXPENSE ITEMS:")
                for item in expense_items:
                    print(f"  - {item['expense_title']}: €{item['apartment_share']}")
            
            # Συνοψίζουμε
            print(f"\n🎯 ΣΥΝΟΨΗ:")
            print(f"Breakdown Total: €{breakdown_total}")
            print(f"Management Fee per Apartment: €{building.management_fee_per_apartment}")
            print(f"Expected Total: €{building.management_fee_per_apartment}")
            
            if breakdown_total > building.management_fee_per_apartment:
                print(f"⚠️ ΔΙΠΛΟ ΜΕΤΡΗΜΑ: €{breakdown_total} > €{building.management_fee_per_apartment}")
            else:
                print(f"✅ ΣΩΣΤΟ: €{breakdown_total} = €{building.management_fee_per_apartment}")
                
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_breakdown_calculation()
