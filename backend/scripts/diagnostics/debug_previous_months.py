#!/usr/bin/env python3
"""
Debug: Ελέγχος προηγούμενων μηνών για διπλό μέτρημα
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

def debug_previous_months():
    """Ελέγχει τους προηγούμενους μήνες για διπλό μέτρημα"""
    
    print("🔍 DEBUG: ΠΡΟΗΓΟΥΜΕΝΟΙ ΜΗΝΕΣ - ΔΙΠΛΟ ΜΕΤΡΗΜΑ")
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
        
        # Ελέγχουμε τους μήνες Μαρτίου-Αυγούστου 2025
        months_to_check = [
            ("2025-03", "Μάρτιος"),
            ("2025-04", "Απρίλιος"),
            ("2025-05", "Μάιος"),
            ("2025-06", "Ιούνιος"),
            ("2025-07", "Ιούλιος"),
            ("2025-08", "Αύγουστος")
        ]
        
        for month, month_name in months_to_check:
            print(f"\n📊 ΕΛΕΓΧΟΣ {month_name.upper()} 2025:")
            
            try:
                calculator = CommonExpenseCalculator(building.id, month)
                
                # Παίρνουμε τα δεδομένα από το calculate_shares
                shares_data = calculator.calculate_shares()
                
                # Ελέγχουμε το πρώτο διαμέρισμα
                first_apartment = shares_data[1]  # Apartment ID 1
                print(f"  - Total Amount: €{first_apartment['total_amount']}")
                
                # Ελέγχουμε το breakdown
                breakdown_total = sum(item['apartment_share'] for item in first_apartment['breakdown'])
                print(f"  - Breakdown Total: €{breakdown_total}")
                
                # Εμφανίζουμε το breakdown
                for i, breakdown_item in enumerate(first_apartment['breakdown']):
                    print(f"    {i+1}. {breakdown_item['expense_title']}: €{breakdown_item['apartment_share']} ({breakdown_item['distribution_type']})")
                
                # Ελέγχουμε αν υπάρχει διπλό μέτρημα
                if breakdown_total > building.management_fee_per_apartment:
                    print(f"  ⚠️ ΔΙΠΛΟ ΜΕΤΡΗΜΑ: €{breakdown_total} > €{building.management_fee_per_apartment}")
                else:
                    print(f"  ✅ ΣΩΣΤΟ: €{breakdown_total} = €{building.management_fee_per_apartment}")
                    
            except Exception as e:
                print(f"  ❌ Σφάλμα: {e}")
        
        # Ελέγχουμε και τον Σεπτέμβριο για σύγκριση
        print(f"\n📊 ΕΛΕΓΧΟΣ ΣΕΠΤΕΜΒΡΙΟΥ 2025 (για σύγκριση):")
        try:
            calculator = CommonExpenseCalculator(building.id, "2025-09")
            shares_data = calculator.calculate_shares()
            first_apartment = shares_data[1]
            breakdown_total = sum(item['apartment_share'] for item in first_apartment['breakdown'])
            print(f"  - Total Amount: €{first_apartment['total_amount']}")
            print(f"  - Breakdown Total: €{breakdown_total}")
            for i, breakdown_item in enumerate(first_apartment['breakdown']):
                print(f"    {i+1}. {breakdown_item['expense_title']}: €{breakdown_item['apartment_share']} ({breakdown_item['distribution_type']})")
        except Exception as e:
            print(f"  ❌ Σφάλμα: {e}")

if __name__ == "__main__":
    debug_previous_months()
