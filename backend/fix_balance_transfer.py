#!/usr/bin/env python3
"""
Script για διόρθωση της μεταφοράς υπολοίπων από 05/2025 σε 06/2025
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
from financial.models import MonthlyBalance

def fix_balance_transfer():
    """Διόρθωση μεταφοράς υπολοίπων από 05/2025 σε 06/2025"""
    
    with schema_context('demo'):
        print("🔧 Διόρθωση μεταφοράς υπολοίπων από 05/2025 σε 06/2025")
        print("=" * 60)
        
        # Βρίσκουμε τον 05/2025
        may_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=5
        ).first()
        
        if not may_2025:
            print("❌ Δεν βρέθηκε MonthlyBalance για 05/2025")
            return
            
        # Βρίσκουμε τον 06/2025
        june_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=6
        ).first()
        
        if not june_2025:
            print("❌ Δεν βρέθηκε MonthlyBalance για 06/2025")
            return
        
        print(f"📊 Πριν τη διόρθωση:")
        print(f"   05/2025 Carry Forward: €{may_2025.carry_forward}")
        print(f"   06/2025 Previous Obligations: €{june_2025.previous_obligations}")
        print()
        
        # Διόρθωση
        expected_previous_obligations = may_2025.carry_forward
        june_2025.previous_obligations = expected_previous_obligations
        
        # Επανυπολογισμός carry_forward (net_result είναι property)
        june_2025.carry_forward = june_2025.net_result
        
        june_2025.save()
        
        print(f"✅ Διόρθωση ολοκληρώθηκε!")
        print(f"   06/2025 Previous Obligations: €{june_2025.previous_obligations}")
        print(f"   06/2025 Total Obligations: €{june_2025.total_obligations}")
        print(f"   06/2025 Net Result: €{june_2025.net_result}")
        print(f"   06/2025 Carry Forward: €{june_2025.carry_forward}")
        print()
        
        # Έλεγχος επακόλουθων μηνών
        print("🔍 Έλεγχος επακόλουθων μηνών:")
        print("-" * 40)
        
        # 07/2025
        july_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=7
        ).first()
        
        if july_2025:
            # Διόρθωση 07/2025
            july_2025.previous_obligations = june_2025.carry_forward
            july_2025.carry_forward = july_2025.net_result
            july_2025.save()
            
            print(f"✅ 07/2025 διορθώθηκε:")
            print(f"   Previous Obligations: €{july_2025.previous_obligations}")
            print(f"   Net Result: €{july_2025.net_result}")
            print(f"   Carry Forward: €{july_2025.carry_forward}")
        
        # 08/2025
        august_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=8
        ).first()
        
        if august_2025:
            # Διόρθωση 08/2025
            august_2025.previous_obligations = july_2025.carry_forward
            august_2025.carry_forward = august_2025.net_result
            august_2025.save()
            
            print(f"✅ 08/2025 διορθώθηκε:")
            print(f"   Previous Obligations: €{august_2025.previous_obligations}")
            print(f"   Net Result: €{august_2025.net_result}")
            print(f"   Carry Forward: €{august_2025.carry_forward}")
        
        # 09/2025
        september_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=9
        ).first()
        
        if september_2025:
            # Διόρθωση 09/2025
            september_2025.previous_obligations = august_2025.carry_forward
            september_2025.carry_forward = september_2025.net_result
            september_2025.save()
            
            print(f"✅ 09/2025 διορθώθηκε:")
            print(f"   Previous Obligations: €{september_2025.previous_obligations}")
            print(f"   Net Result: €{september_2025.net_result}")
            print(f"   Carry Forward: €{september_2025.carry_forward}")
        
        print()
        print("🎉 Όλες οι διορθώσεις ολοκληρώθηκαν!")

if __name__ == "__main__":
    fix_balance_transfer()
