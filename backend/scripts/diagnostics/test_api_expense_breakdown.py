#!/usr/bin/env python3
"""
Test API endpoint για expense breakdown.
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
import json

def test_api_expense_breakdown():
    """Τεστάρει το API endpoint για expense breakdown"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("TEST API: get_summary με expense_breakdown")
        print("="*80 + "\n")
        
        building_id = 1
        month = "2025-10"
        
        print(f"🏢 Building ID: {building_id}")
        print(f"📅 Month: {month}\n")
        
        # Δημιουργία service
        service = FinancialDashboardService(building_id)
        
        # Κλήση get_summary
        summary = service.get_summary(month=month)
        
        print("="*80)
        print("API RESPONSE - expense_breakdown:")
        print("="*80)
        
        if 'expense_breakdown' in summary:
            breakdown = summary['expense_breakdown']
            print(f"\nΠλήθος δαπανών: {len(breakdown)}\n")
            
            if len(breakdown) > 0:
                for i, expense in enumerate(breakdown, 1):
                    payer = expense.get('payer_responsibility', 'N/A')
                    payer_symbol = "Ⓔ" if payer == 'resident' else "Ⓓ" if payer == 'owner' else "⚖"
                    
                    print(f"{i}. {payer_symbol} {expense['category_display']}")
                    print(f"   Category: {expense['category']}")
                    print(f"   Amount: €{expense['amount']}")
                    print(f"   Payer: {payer}")
                    print()
            else:
                print("❌ ΚΕΝΗ ΛΙΣΤΑ!")
        else:
            print("❌ ΔΕΝ ΥΠΑΡΧΕΙ 'expense_breakdown' ΣΤΟ RESPONSE!")
        
        # Full JSON για debugging
        print("\n" + "="*80)
        print("FULL API RESPONSE (JSON):")
        print("="*80 + "\n")
        print(json.dumps(summary, indent=2, default=str))
        
        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    test_api_expense_breakdown()

