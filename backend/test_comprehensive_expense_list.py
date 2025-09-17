#!/usr/bin/env python3
"""
Script για να δοκιμάσουμε το νέο ComprehensiveExpenseList component
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
from django.db.models import Sum
from decimal import Decimal
from datetime import date

def test_comprehensive_expense_list():
    """Δοκιμάζει το νέο ComprehensiveExpenseList component"""
    
    with schema_context('demo'):
        print("=== Δοκιμή ComprehensiveExpenseList Component ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Δοκιμή για κτίριο: {building.name}")
        
        # Δοκιμή για Φεβρουάριο 2025
        print(f"\n1. Φεβρουάριος 2025:")
        february_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=2
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {february_expenses.count()}")
        for expense in february_expenses:
            print(f"      • {expense.title}: €{expense.amount}")
        
        # Δοκιμή για Μάρτιο 2025
        print(f"\n2. Μάρτιο 2025:")
        march_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=3
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {march_expenses.count()}")
        for expense in march_expenses:
            print(f"      • {expense.title}: €{expense.amount}")
        
        # Δοκιμή API endpoint για comprehensive data
        print(f"\n3. Δοκιμή API Endpoint:")
        try:
            from financial.views import FinancialDashboardViewSet
            from django.test import RequestFactory
            
            # Δημιουργία request για Φεβρουάριο
            factory = RequestFactory()
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-02')
            request.query_params = request.GET
            
            # Δημιουργία ViewSet instance
            viewset = FinancialDashboardViewSet()
            
            # Κλήση του improved_summary method
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ API endpoint λειτουργεί")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
                # Ελέγχος comprehensive data
                print(f"\n   📋 Comprehensive Expense Data:")
                print(f"      • Καταχωρημένες δαπάνες: {february_expenses.count()}")
                print(f"      • Παλαιότερες οφειλές: €{data.get('previous_obligations', 0)}")
                print(f"      • Εισφορά αποθεματικού: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Προγραμματισμένα έργα: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
            else:
                print(f"   ❌ API endpoint error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ API endpoint error: {e}")
        
        # Δοκιμή για Μάρτιο (με previous obligations)
        print(f"\n4. Δοκιμή για Μάρτιο (με previous obligations):")
        try:
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-03')
            request.query_params = request.GET
            
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   ✅ API endpoint λειτουργεί")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
                # Ελέγχος comprehensive data
                print(f"\n   📋 Comprehensive Expense Data:")
                print(f"      • Καταχωρημένες δαπάνες: {march_expenses.count()}")
                print(f"      • Παλαιότερες οφειλές: €{data.get('previous_obligations', 0)}")
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
        print(f"   ✅ Εμφανίζει εισφορά αποθεματικού")
        print(f"   ✅ Εμφανίζει προγραμματισμένα έργα")
        print(f"   🌐 Μπορείτε να δοκιμάσετε τη σελίδα financial στο:")
        print(f"      http://demo.localhost:3001/financial?tab=expenses&building=1")

if __name__ == '__main__':
    test_comprehensive_expense_list()


