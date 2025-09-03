#!/usr/bin/env python3
"""
Script to test the financial dashboard API endpoint and trace the 187.00 € amount
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import FinancialDashboardService

def test_api_187():
    """Test the API endpoint to see what data is returned"""
    
    print("🔍 ΕΝΤΟΠΙΣΜΟΣ ΠΟΣΟΥ 187.00€ - API TEST")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get building (Αλκμάνος 22)
        building = Building.objects.get(id=4)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Test the FinancialDashboardService directly
        print("1️⃣ ΕΛΕΓΧΟΣ FinancialDashboardService:")
        print("-" * 40)
        
        service = FinancialDashboardService(building_id=4)
        
        # Test current view (no month)
        print("📊 Current View (no month):")
        current_summary = service.get_summary()
        print(f"   total_balance: {current_summary.get('total_balance', 0)}€")
        print(f"   current_reserve: {current_summary.get('current_reserve', 0)}€")
        print(f"   current_obligations: {current_summary.get('current_obligations', 0)}€")
        print(f"   reserve_fund_contribution: {current_summary.get('reserve_fund_contribution', 0)}€")
        print()
        
        # Test August 2025 view
        print("📊 August 2025 View:")
        august_summary = service.get_summary(month='2025-08')
        print(f"   total_balance: {august_summary.get('total_balance', 0)}€")
        print(f"   current_reserve: {august_summary.get('current_reserve', 0)}€")
        print(f"   current_obligations: {august_summary.get('current_obligations', 0)}€")
        print(f"   reserve_fund_contribution: {august_summary.get('reserve_fund_contribution', 0)}€")
        print()
        
        # Check if 187.00 matches any of these values
        target_amount = 187.00
        print("2️⃣ ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ 187.00€:")
        print("-" * 40)
        
        current_values = [
            ("total_balance (current)", current_summary.get('total_balance', 0)),
            ("current_reserve (current)", current_summary.get('current_reserve', 0)),
            ("current_obligations (current)", current_summary.get('current_obligations', 0)),
            ("reserve_fund_contribution (current)", current_summary.get('reserve_fund_contribution', 0)),
        ]
        
        august_values = [
            ("total_balance (august)", august_summary.get('total_balance', 0)),
            ("current_reserve (august)", august_summary.get('current_reserve', 0)),
            ("current_obligations (august)", august_summary.get('current_obligations', 0)),
            ("reserve_fund_contribution (august)", august_summary.get('reserve_fund_contribution', 0)),
        ]
        
        found_match = False
        for name, value in current_values + august_values:
            if abs(value - target_amount) < 0.01:
                print(f"✅ Βρέθηκε αντιστοίχιση: {name} = {value}€")
                found_match = True
        
        if not found_match:
            print("❌ Δεν βρέθηκε ακριβής αντιστοίχιση για το 187.00€")
        
        print()
        
        # 3. Check all available fields in the summary
        print("3️⃣ ΠΛΗΡΕΣ ΔΕΔΟΜΕΝΑ SUMMARY:")
        print("-" * 40)
        print("Current View:")
        for key, value in current_summary.items():
            if isinstance(value, (int, float)) and value != 0:
                print(f"   {key}: {value}")
        
        print("\nAugust 2025 View:")
        for key, value in august_summary.items():
            if isinstance(value, (int, float)) and value != 0:
                print(f"   {key}: {value}")
        
        print()
        
        # 4. Check if there are any other buildings
        print("4️⃣ ΕΛΕΓΧΟΣ ΑΛΛΩΝ ΚΤΙΡΙΩΝ:")
        print("-" * 40)
        all_buildings = Building.objects.all()
        print(f"Συνολικά κτίρια: {all_buildings.count()}")
        
        for b in all_buildings:
            print(f"   Κτίριο {b.id}: {b.name} - Αποθεματικό: {b.current_reserve}€")
            
            # Check if this building has 187.00 in any calculation
            try:
                b_service = FinancialDashboardService(building_id=b.id)
                b_summary = b_service.get_summary()
                
                if abs(b_summary.get('total_balance', 0) - target_amount) < 0.01:
                    print("      ✅ Βρέθηκε 187.00€ στο total_balance!")
                if abs(b_summary.get('current_reserve', 0) - target_amount) < 0.01:
                    print("      ✅ Βρέθηκε 187.00€ στο current_reserve!")
                if abs(b_summary.get('current_obligations', 0) - target_amount) < 0.01:
                    print("      ✅ Βρέθηκε 187.00€ στο current_obligations!")
                    
            except Exception as e:
                print(f"      ❌ Σφάλμα: {e}")
        
        print()
        
        # 5. Check if this might be from a different month
        print("5️⃣ ΕΛΕΓΧΟΣ ΔΙΑΦΟΡΩΝ ΜΗΝΩΝ:")
        print("-" * 40)
        
        test_months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12']
        
        for month in test_months:
            try:
                month_summary = service.get_summary(month=month)
                total_balance = month_summary.get('total_balance', 0)
                current_reserve = month_summary.get('current_reserve', 0)
                
                if abs(total_balance - target_amount) < 0.01 or abs(current_reserve - target_amount) < 0.01:
                    print(f"✅ Βρέθηκε 187.00€ στο {month}:")
                    print(f"   total_balance: {total_balance}€")
                    print(f"   current_reserve: {current_reserve}€")
                    
            except Exception as e:
                print(f"❌ Σφάλμα για {month}: {e}")

if __name__ == "__main__":
    test_api_187()
