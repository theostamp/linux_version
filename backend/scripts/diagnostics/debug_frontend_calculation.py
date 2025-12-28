#!/usr/bin/env python3
"""
Debug: Ελέγχος frontend calculation vs backend
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

def debug_frontend_calculation():
    """Ελέγχει πώς υπολογίζει το frontend vs backend"""
    
    print("🔍 DEBUG: FRONTEND vs BACKEND CALCULATION")
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
        
        # Ελέγχουμε τον Σεπτέμβριο 2025
        print(f"\n📊 ΣΕΠΤΕΜΒΡΙΟΣ 2025:")
        
        try:
            calculator = CommonExpenseCalculator(building.id, "2025-09")
            
            # Ελέγχουμε αν υπάρχει μέθοδος get_apartment_balances
            if hasattr(calculator, 'get_apartment_balances'):
                print(f"📊 get_apartment_balances:")
                apartment_balances = calculator.get_apartment_balances("2025-09")
                
                total_previous = sum(apt.get('previous_balance', 0) for apt in apartment_balances)
                total_current = sum(apt.get('expense_share', 0) for apt in apartment_balances)
                total_net = sum(apt.get('net_obligation', 0) for apt in apartment_balances)
                
                print(f"  - Total Previous Balance: €{total_previous:.2f}")
                print(f"  - Total Current Expense Share: €{total_current:.2f}")
                print(f"  - Total Net Obligation: €{total_net:.2f}")
                
                # Εμφανίζουμε τα πρώτα 3 διαμερίσματα
                for i, apt_balance in enumerate(apartment_balances[:3]):
                    apt_num = apt_balance.get('apartment_number', 'N/A')
                    previous = apt_balance.get('previous_balance', 0)
                    current = apt_balance.get('expense_share', 0)
                    net = apt_balance.get('net_obligation', 0)
                    print(f"  - Apt {apt_num}: Previous €{previous:.2f} + Current €{current:.2f} = Net €{net:.2f}")
                
                if len(apartment_balances) > 3:
                    print(f"  ... και {len(apartment_balances) - 3} ακόμα διαμερίσματα")
            
            # Ελέγχουμε αν υπάρχει μέθοδος get_summary
            if hasattr(calculator, 'get_summary'):
                print(f"\n📊 get_summary:")
                summary = calculator.get_summary("2025-09")
                
                for key, value in summary.items():
                    if key != 'apartment_balances':  # Αυτό είναι πολύ μεγάλο
                        print(f"  - {key}: {value}")
            
            # Ελέγχουμε τα calculate_shares
            print(f"\n📊 calculate_shares:")
            shares_data = calculator.calculate_shares()
            
            # Ελέγχουμε το πρώτο διαμέρισμα
            first_apartment = shares_data[1]  # Apartment ID 1
            print(f"  - Total Amount: €{first_apartment['total_amount']}")
            print(f"  - Previous Balance: €{first_apartment['previous_balance']}")
            print(f"  - Total Due: €{first_apartment['total_due']}")
            
            # Υπολογίζουμε το συνολικό ποσό από όλα τα διαμερίσματα
            total_shares = sum(apt['total_amount'] for apt in shares_data.values())
            total_previous_shares = sum(apt['previous_balance'] for apt in shares_data.values())
            total_due_shares = sum(apt['total_due'] for apt in shares_data.values())
            
            print(f"\n📊 ΣΥΝΟΛΙΚΑ ΑΠΟ SHARES:")
            print(f"  - Total Amount: €{total_shares:.2f}")
            print(f"  - Total Previous Balance: €{total_previous_shares:.2f}")
            print(f"  - Total Due: €{total_due_shares:.2f}")
            
            # Ελέγχουμε αν υπάρχει διαφορά
            expected_total = 10 * building.management_fee_per_apartment  # 10 διαμερίσματα × €1.00
            print(f"\n🎯 ΕΠΑΛΗΘΕΥΣΗ:")
            print(f"  - Expected Total: €{expected_total:.2f}")
            print(f"  - Actual Total: €{total_shares:.2f}")
            
            if abs(total_shares - expected_total) < 0.01:
                print(f"  ✅ ΣΩΣΤΟ: €{total_shares:.2f} = €{expected_total:.2f}")
            else:
                print(f"  ⚠️ ΔΙΑΦΟΡΑ: €{total_shares:.2f} ≠ €{expected_total:.2f}")
                
        except Exception as e:
            print(f"❌ Σφάλμα στον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_frontend_calculation()
