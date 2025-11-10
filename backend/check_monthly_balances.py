#!/usr/bin/env python3
"""
Έλεγχος MonthlyBalance records
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance

def check_monthly_balances():
    """Ελέγχει τα MonthlyBalance records"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΛΕΓΧΟΣ MONTHLY BALANCE RECORDS")
        print("="*80 + "\n")
        
        balances = MonthlyBalance.objects.filter(
            building_id=1
        ).order_by('year', 'month')
        
        if not balances.exists():
            print("❌ Δεν υπάρχουν MonthlyBalance records!\n")
            return
        
        print(f"📊 Βρέθηκαν {balances.count()} MonthlyBalance records:\n")
        
        for balance in balances:
            print(f"{'='*60}")
            print(f"📅 {balance.year}-{balance.month:02d}")
            print(f"{'='*60}")
            print(f"   Total Expenses: €{balance.total_expenses:.2f}")
            print(f"   Total Payments: €{balance.total_payments:.2f}")
            print(f"   Previous Obligations: €{balance.previous_obligations:.2f}")
            print(f"   Carry Forward: €{balance.carry_forward:.2f}")
            print(f"   Updated: {balance.updated_at}")
            print()
        
        # Ανάλυση carry_forward
        print("="*80)
        print("ΑΝΑΛΥΣΗ CARRY_FORWARD")
        print("="*80 + "\n")
        
        cumulative_debt = 0
        for balance in balances:
            month_str = f"{balance.year}-{balance.month:02d}"
            month_debt = balance.total_expenses - balance.total_payments
            cumulative_debt += month_debt
            
            print(f"📅 {month_str}:")
            print(f"   Total Expenses: €{balance.total_expenses:.2f}")
            print(f"   Total Payments: €{balance.total_payments:.2f}")
            print(f"   Previous Obligations: €{balance.previous_obligations:.2f}")
            print(f"   Month Debt (Exp - Pay): €{month_debt:.2f}")
            print(f"   Cumulative Debt (Should Be): €{cumulative_debt:.2f}")
            print(f"   Actual Carry Forward: €{balance.carry_forward:.2f}")
            
            if abs(cumulative_debt - balance.carry_forward) > 0.01:
                print(f"   ❌ ΛΑΘΟΣ! Διαφορά: €{cumulative_debt - balance.carry_forward:.2f}")
            else:
                print(f"   ✅ ΣΩΣΤΟ!")
            print()
        
        print("="*80 + "\n")

if __name__ == '__main__':
    check_monthly_balances()

