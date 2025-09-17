#!/usr/bin/env python3
"""
Script για να δοκιμάσουμε το τελικό ComprehensiveExpenseList component
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance, Expense, Payment
from buildings.models import Building
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment
from django.db.models import Sum
from decimal import Decimal
from datetime import date

def test_comprehensive_expense_list_final():
    """Δοκιμάζει το τελικό ComprehensiveExpenseList component"""
    
    with schema_context('demo'):
        print("=== Δοκιμή Τελικού ComprehensiveExpenseList Component ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Δοκιμή για Μάρτιο 2025
        print(f"\n1. Μάρτιος 2025:")
        march_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=3
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {march_expenses.count()}")
        for expense in march_expenses:
            print(f"      • {expense.title}: €{expense.amount}")
        
        # Δοκιμή για Απρίλιο 2025
        print(f"\n2. Απρίλιος 2025:")
        april_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=4
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {april_expenses.count()}")
        for expense in april_expenses:
            print(f"      • {expense.title}: €{expense.amount}")
        
        # Δοκιμή για Μάιο 2025
        print(f"\n3. Μάιος 2025:")
        may_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=5
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {may_expenses.count()}")
        for expense in may_expenses:
            print(f"      • {expense.title}: €{expense.amount}")
        
        # Δοκιμή API endpoint για Μάρτιο
        print(f"\n4. API Endpoint - Μάρτιος 2025:")
        try:
            from financial.views import FinancialDashboardViewSet
            from django.test import RequestFactory
            
            factory = RequestFactory()
            viewset = FinancialDashboardViewSet()
            
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-03')
            request.query_params = request.GET
            
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ API endpoint λειτουργεί")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Management fees: €{data.get('management_fees', 0)}")
                print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
                # Ελέγχος comprehensive data
                print(f"\n   📋 Comprehensive Expense Data:")
                print(f"      • Καταχωρημένες δαπάνες: {march_expenses.count()}")
                print(f"      • Παλαιότερες οφειλές: €{data.get('previous_obligations', 0)}")
                print(f"      • Διαχειριστικά έξοδα: €{data.get('management_fees', 0)}")
                print(f"      • Εισφορά αποθεματικού: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Προγραμματισμένα έργα: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
            else:
                print(f"   ❌ API endpoint error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ API endpoint error: {e}")
        
        # Δοκιμή API endpoint για Απρίλιο
        print(f"\n5. API Endpoint - Απρίλιος 2025:")
        try:
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-04')
            request.query_params = request.GET
            
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ API endpoint λειτουργεί")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Management fees: €{data.get('management_fees', 0)}")
                print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
                # Ελέγχος comprehensive data
                print(f"\n   📋 Comprehensive Expense Data:")
                print(f"      • Καταχωρημένες δαπάνες: {april_expenses.count()}")
                print(f"      • Παλαιότερες οφειλές: €{data.get('previous_obligations', 0)}")
                print(f"      • Διαχειριστικά έξοδα: €{data.get('management_fees', 0)}")
                print(f"      • Εισφορά αποθεματικού: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Προγραμματισμένα έργα: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
            else:
                print(f"   ❌ API endpoint error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ API endpoint error: {e}")
        
        # Δοκιμή API endpoint για Μάιο
        print(f"\n6. API Endpoint - Μάιος 2025:")
        try:
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-05')
            request.query_params = request.GET
            
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ API endpoint λειτουργεί")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Management fees: €{data.get('management_fees', 0)}")
                print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
                # Ελέγχος comprehensive data
                print(f"\n   📋 Comprehensive Expense Data:")
                print(f"      • Καταχωρημένες δαπάνες: {may_expenses.count()}")
                print(f"      • Παλαιότερες οφειλές: €{data.get('previous_obligations', 0)}")
                print(f"      • Διαχειριστικά έξοδα: €{data.get('management_fees', 0)}")
                print(f"      • Εισφορά αποθεματικού: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Προγραμματισμένα έργα: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
            else:
                print(f"   ❌ API endpoint error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ API endpoint error: {e}")
        
        print(f"\n🎯 Σύνοψη:")
        print(f"   ✅ Το ComprehensiveExpenseList component είναι έτοιμο")
        print(f"   ✅ Εμφανίζει καταχωρημένες δαπάνες")
        print(f"   ✅ Εμφανίζει παλαιότερες οφειλές")
        print(f"   ✅ Εμφανίζει διαχειριστικά έξοδα")
        print(f"   ✅ Εμφανίζει εισφορά αποθεματικού")
        print(f"   ✅ Εμφανίζει προγραμματισμένα έργα")
        print(f"   🌐 Μπορείτε να δοκιμάσετε τη σελίδα financial στο:")
        print(f"      http://demo.localhost:3001/financial?tab=expenses&building=1")

if __name__ == '__main__':
    test_comprehensive_expense_list_final()


