#!/usr/bin/env python3
"""
Test script to verify that apartment_balances API no longer double-counts expenses
"""

import os
import sys
import django
import json
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_apartment_balances_fix():
    """Test that apartment_balances API no longer double-counts expenses"""
    
    with schema_context('demo'):
        from financial.views import FinancialDashboardViewSet
        from django.test import RequestFactory
        from users.models import CustomUser as User
        
        print("🔍 TEST APARTMENT_BALANCES FIX")
        print("=" * 50)
        
        # Create a mock request for September 2025
        factory = RequestFactory()
        request = factory.get('/financial/dashboard/apartment_balances/?building_id=1&month=2025-09')
        
        # Use existing user
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(email='test4@example.com', password='testpass')
        request.user = user
        
        # Add query_params attribute
        request.query_params = request.GET
        
        # Create viewset instance
        viewset = FinancialDashboardViewSet()
        viewset.request = request
        
        # Call the apartment_balances method
        response = viewset.apartment_balances(request)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.data
            apartments = data.get('apartments', [])
            summary = data.get('summary', {})
            
            print(f"✅ API call successful")
            print(f"📊 Apartments returned: {len(apartments)}")
            print(f"📋 Summary: {summary}")
            
            if apartments:
                # Check first apartment for double-counting
                first_apt = apartments[0]
                print(f"\n🏠 First apartment: {first_apt['apartment_number']}")
                print(f"   • Total obligations: {first_apt['total_obligations']}€")
                print(f"   • Previous balance: {first_apt['previous_balance']}€")
                print(f"   • Expense share (current month): {first_apt['expense_share']}€")
                print(f"   • Net obligation: {first_apt['net_obligation']}€")
                print(f"   • Total payments: {first_apt['total_payments']}€")
                
                # Verify the calculation
                expected_net_obligation = first_apt['previous_balance'] + first_apt['expense_share'] - first_apt['total_payments']
                print(f"   • Expected net obligation: {expected_net_obligation}€")
                
                if abs(first_apt['net_obligation'] - expected_net_obligation) < 0.01:
                    print(f"   ✅ Calculation is correct - no double-counting!")
                else:
                    print(f"   ❌ Calculation is wrong - possible double-counting!")
                    print(f"      Difference: {first_apt['net_obligation'] - expected_net_obligation}€")
                
                # Check expense breakdown
                expense_breakdown = first_apt.get('expense_breakdown', [])
                print(f"\n📋 Expense breakdown: {len(expense_breakdown)} expenses")
                
                # Group expenses by month
                expenses_by_month = {}
                for expense in expense_breakdown:
                    month = expense.get('month', 'unknown')
                    if month not in expenses_by_month:
                        expenses_by_month[month] = []
                    expenses_by_month[month].append(expense)
                
                for month, expenses in expenses_by_month.items():
                    total_month = sum(e['share_amount'] for e in expenses)
                    print(f"   • {month}: {total_month}€ ({len(expenses)} expenses)")
                
        else:
            print(f"❌ API call failed: {response.status_code}")
            if hasattr(response, 'data'):
                print(f"Error: {response.data}")

if __name__ == '__main__':
    test_apartment_balances_fix()
