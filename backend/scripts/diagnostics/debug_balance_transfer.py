#!/usr/bin/env python3
"""
Debug script για έλεγχο μεταφοράς υπολοίπων από 05/2025 σε 06/2025
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

def debug_balance_transfer():
    """Έλεγχος μεταφοράς υπολοίπων από 05/2025 σε 06/2025"""
    
    with schema_context('demo'):
        print("🔍 Έλεγχος μεταφοράς υπολοίπων από 05/2025 σε 06/2025")
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
            
        print(f"📊 05/2025:")
        print(f"   • Καθαρό Αποτέλεσμα: €{may_2025.net_result}")
        print(f"   • Carry Forward: €{may_2025.carry_forward}")
        print(f"   • Previous Obligations: €{may_2025.previous_obligations}")
        print(f"   • Total Obligations: €{may_2025.total_obligations}")
        print(f"   • Is Closed: {may_2025.is_closed}")
        print()
        
        # Βρίσκουμε τον 06/2025
        june_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025,
            month=6
        ).first()
        
        if not june_2025:
            print("❌ Δεν βρέθηκε MonthlyBalance για 06/2025")
            return
            
        print(f"📊 06/2025:")
        print(f"   • Καθαρό Αποτέλεσμα: €{june_2025.net_result}")
        print(f"   • Carry Forward: €{june_2025.carry_forward}")
        print(f"   • Previous Obligations: €{june_2025.previous_obligations}")
        print(f"   • Total Obligations: €{june_2025.total_obligations}")
        print(f"   • Is Closed: {june_2025.is_closed}")
        print()
        
        # Έλεγχος μεταφοράς
        print("🔍 Έλεγχος μεταφοράς:")
        expected_previous_obligations = may_2025.carry_forward
        actual_previous_obligations = june_2025.previous_obligations
        
        print(f"   • Expected Previous Obligations (from 05/2025 carry_forward): €{expected_previous_obligations}")
        print(f"   • Actual Previous Obligations (06/2025): €{actual_previous_obligations}")
        
        if abs(expected_previous_obligations - actual_previous_obligations) < 0.01:
            print("   ✅ Η μεταφορά είναι σωστή!")
        else:
            print("   ❌ ΠΡΟΒΛΗΜΑ: Η μεταφορά δεν είναι σωστή!")
            print(f"      Διαφορά: €{abs(expected_previous_obligations - actual_previous_obligations)}")
        
        print()
        
        # Έλεγχος όλων των μηνών για να δούμε το pattern
        print("📋 Έλεγχος όλων των μηνών 2025:")
        print("-" * 40)
        
        months_2025 = MonthlyBalance.objects.filter(
            building_id=1,
            year=2025
        ).order_by('month')
        
        for balance in months_2025:
            print(f"{balance.month:02d}/2025:")
            print(f"   • Καθαρό Αποτέλεσμα: €{balance.net_result}")
            print(f"   • Carry Forward: €{balance.carry_forward}")
            print(f"   • Previous Obligations: €{balance.previous_obligations}")
            print(f"   • Is Closed: {balance.is_closed}")
            print()

if __name__ == "__main__":
    debug_balance_transfer()
