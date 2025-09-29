#!/usr/bin/env python3
"""
Summary script για το ComprehensiveExpenseList component
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

def summary_comprehensive_expense_list():
    """Summary για το ComprehensiveExpenseList component"""
    
    with schema_context('demo'):
        print("=== SUMMARY: ComprehensiveExpenseList Component ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Summary για Φεβρουάριο 2025
        print(f"\n1. Φεβρουάριος 2025:")
        february_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=2
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {february_expenses.count()}")
        total_february = sum(expense.amount for expense in february_expenses)
        print(f"   💰 Συνολικό ποσό: €{total_february}")
        
        # Summary για Μάρτιο 2025
        print(f"\n2. Μάρτιο 2025:")
        march_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=3
        )
        
        print(f"   📊 Καταχωρημένες δαπάνες: {march_expenses.count()}")
        total_march = sum(expense.amount for expense in march_expenses)
        print(f"   💰 Συνολικό ποσό: €{total_march}")
        
        # Summary για MonthlyBalance
        print(f"\n3. MonthlyBalance System:")
        february_balance = MonthlyBalance.objects.filter(
            building=building,
            year=2025,
            month=2
        ).first()
        
        march_balance = MonthlyBalance.objects.filter(
            building=building,
            year=2025,
            month=3
        ).first()
        
        if february_balance:
            print(f"   📊 Φεβρουάριος: Carry Forward €{february_balance.carry_forward}")
        if march_balance:
            print(f"   📊 Μάρτιος: Previous Obligations €{march_balance.previous_obligations}")
        
        # Summary για API
        print(f"\n4. API Endpoint Summary:")
        try:
            from financial.views import FinancialDashboardViewSet
            from django.test import RequestFactory
            
            factory = RequestFactory()
            viewset = FinancialDashboardViewSet()
            
            # Φεβρουάριος
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-02')
            request.query_params = request.GET
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   📊 Φεβρουάριος:")
                print(f"      • Καταχωρημένες δαπάνες: {february_expenses.count()}")
                print(f"      • Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"      • Reserve fund: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Scheduled maintenance: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
            
            # Μάρτιος
            request = factory.get('/api/financial/dashboard/improved-summary/?building_id=1&month=2025-03')
            request.query_params = request.GET
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   📊 Μάρτιος:")
                print(f"      • Καταχωρημένες δαπάνες: {march_expenses.count()}")
                print(f"      • Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"      • Reserve fund: €{data.get('reserve_fund_contribution', 0)}")
                print(f"      • Scheduled maintenance: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                
        except Exception as e:
            print(f"   ❌ API error: {e}")
        
        print(f"\n🎯 ComprehensiveExpenseList Features:")
        print(f"   ✅ Εμφανίζει καταχωρημένες δαπάνες")
        print(f"   ✅ Εμφανίζει παλαιότερες οφειλές (μεταφορά από προηγούμενους μήνες)")
        print(f"   ✅ Εμφανίζει εισφορά αποθεματικού (όταν ενεργή)")
        print(f"   ✅ Εμφανίζει προγραμματισμένα έργα με δόσεις")
        print(f"   ✅ Φίλτρα αναζήτησης και κατηγοριών")
        print(f"   ✅ Visual indicators για καταχωρημένες vs υπολογισμένες δαπάνες")
        print(f"   ✅ Summary με συνολικό ποσό")
        
        print(f"\n🌐 Πώς να Χρησιμοποιήσετε:")
        print(f"   1. Πηγαίνετε στη σελίδα financial")
        print(f"   2. Επιλέξτε το tab 'Δαπάνες'")
        print(f"   3. Θα δείτε όλες τις κατηγορίες δαπανών:")
        print(f"      • Καταχωρημένες δαπάνες (πράσινες)")
        print(f"      • Παλαιότερες οφειλές (μπλε)")
        print(f"      • Εισφορά αποθεματικού (κίτρινες)")
        print(f"      • Προγραμματισμένα έργα (πορτοκαλί)")
        print(f"   4. Χρησιμοποιήστε τα φίλτρα για αναζήτηση")
        print(f"   5. Κλικ για λεπτομέρειες ή διαγραφή")
        
        print(f"\n🔗 URLs:")
        print(f"   • Financial Overview: http://demo.localhost:3001/financial?tab=overview&building=1")
        print(f"   • Financial Expenses: http://demo.localhost:3001/financial?tab=expenses&building=1")
        print(f"   • Financial Calculator: http://demo.localhost:3001/financial?tab=calculator&building=1")

if __name__ == '__main__':
    summary_comprehensive_expense_list()


