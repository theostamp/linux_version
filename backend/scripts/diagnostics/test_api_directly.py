#!/usr/bin/env python3
"""
Script για άμεσο έλεγχο του API endpoint
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
from django.test import RequestFactory
from financial.views import FinancialDashboardViewSet
from buildings.models import Building

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def test_api_directly():
    """Ελέγχει το API endpoint απευθείας"""
    print("=" * 80)
    print("🔍 ΑΜΕΣΟΣ ΕΛΕΓΧΟΣ API ENDPOINT")
    print("=" * 80)
    
    with schema_context('demo'):
        # Δημιουργία request factory
        factory = RequestFactory()
        
        # Δημιουργία request για το improved-summary endpoint
        request = factory.get('/financial/dashboard/improved-summary/', {
            'building_id': 1,
            'month': '2025-10'
        })
        
        # Προσθήκη query_params για DRF
        request.query_params = request.GET
        
        # Δημιουργία viewset instance
        viewset = FinancialDashboardViewSet()
        
        try:
            # Κλήση του improved_summary method
            response = viewset.improved_summary(request)
            
            print(f"\n📊 API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.data
                
                print(f"\n📋 API Response Data:")
                print(f"   current_invoice: {format_currency(data.get('current_invoice', 0))}")
                print(f"   previous_balances: {format_currency(data.get('previous_balances', 0))}")
                print(f"   grand_total: {format_currency(data.get('grand_total', 0))}")
                print(f"   management_fees: {format_currency(data.get('management_fees', 0))}")
                print(f"   reserve_fund_contribution: {format_currency(data.get('reserve_fund_contribution', 0))}")
                print(f"   invoice_total: {format_currency(data.get('invoice_total', 0))}")
                
                # Ανάλυση των στοιχείων
                print(f"\n🔍 ΑΝΑΛΥΣΗ ΣΤΟΙΧΕΙΩΝ:")
                current_invoice = data.get('current_invoice', 0)
                previous_balances = data.get('previous_balances', 0)
                grand_total = data.get('grand_total', 0)
                
                print(f"   current_invoice = {format_currency(current_invoice)}")
                print(f"   previous_balances = {format_currency(previous_balances)}")
                print(f"   grand_total = current_invoice + previous_balances")
                print(f"   grand_total = {format_currency(current_invoice)} + {format_currency(previous_balances)} = {format_currency(grand_total)}")
                
                # Έλεγχος αν ταιριάζει
                calculated_total = current_invoice + previous_balances
                if abs(calculated_total - grand_total) < 0.01:
                    print(f"   ✅ Ο υπολογισμός είναι σωστός!")
                else:
                    print(f"   ❌ Υπάρχει διαφορά στον υπολογισμό!")
                    print(f"   Υπολογισμένο: {format_currency(calculated_total)}")
                    print(f"   API: {format_currency(grand_total)}")
                
                return data
            else:
                print(f"❌ API Error: {response.data}")
                return None
                
        except Exception as e:
            print(f"❌ Σφάλμα κατά την κλήση API: {e}")
            import traceback
            traceback.print_exc()
            return None

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΑΜΕΣΟΣ ΕΛΕΓΧΟΣ API")
    print("=" * 80)
    
    try:
        data = test_api_directly()
        
        if data:
            print(f"\n📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
            print(f"   Dashboard εμφανίζει: 2,000.01 €")
            print(f"   API grand_total: {format_currency(data.get('grand_total', 0))}")
            
            dashboard_total = Decimal('2000.01')
            api_total = Decimal(str(data.get('grand_total', 0)))
            
            if abs(dashboard_total - api_total) < Decimal('0.01'):
                print(f"   ✅ Τα ποσά ταιριάζουν!")
            else:
                print(f"   ⚠️  Υπάρχει διαφορά μεταξύ dashboard και API!")
                print(f"   Διαφορά: {format_currency(dashboard_total - api_total)}")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
