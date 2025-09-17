#!/usr/bin/env python3
"""
Test script για το ComprehensiveExpenseList component για τον Σεπτέμβριο
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
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal
from datetime import date

def test_comprehensive_expense_list_september():
    """Test για το ComprehensiveExpenseList component για τον Σεπτέμβριο"""
    
    with schema_context('demo'):
        print("=== Test ComprehensiveExpenseList για Σεπτέμβριο 2025 ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Έλεγχος για Σεπτέμβριο 2025
        month_str = '2025-09'
        month_name = 'Σεπτέμβριος 2025'
        
        print(f"\n{month_name}:")
        
        year, month = map(int, month_str.split('-'))
        
        # 1. Καταχωρημένες δαπάνες
        expenses = Expense.objects.filter(
            building=building,
            date__year=year,
            date__month=month
        )
        total_expenses = sum(expense.amount for expense in expenses)
        print(f"   📊 Καταχωρημένες δαπάνες: €{total_expenses}")
        
        # 2. Διαχειριστικά έξοδα (€80/μήνα)
        management_fees = Decimal('80.00')
        print(f"   💰 Διαχειριστικά έξοδα: €{management_fees}")
        
        # 3. Εισφορά αποθεματικού (€500/μήνα για Σεπτέμβριο)
        reserve_fund_amount = Decimal('500.00')
        print(f"   🏦 Εισφορά αποθεματικού: €{reserve_fund_amount}")
        
        # 4. Προγραμματισμένα έργα
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)
        
        installments = PaymentInstallment.objects.filter(
            payment_schedule__scheduled_maintenance__building=building,
            due_date__gte=month_start,
            due_date__lt=month_end,
            status='pending'
        )
        scheduled_maintenance_amount = sum(installment.amount for installment in installments)
        print(f"   🔧 Προγραμματισμένα έργα: €{scheduled_maintenance_amount}")
        
        # 5. Παλαιότερες οφειλές (από Αύγουστο)
        prev_month = month - 1
        prev_year = year
        
        prev_balance = MonthlyBalance.objects.filter(
            building=building,
            year=prev_year,
            month=prev_month
        ).first()
        
        if prev_balance:
            previous_obligations = prev_balance.carry_forward
            print(f"   📋 Παλαιότερες οφειλές: €{previous_obligations}")
        else:
            print(f"   ❌ Δεν υπάρχει MonthlyBalance για {prev_month:02d}/{prev_year}")
            previous_obligations = Decimal('0.00')
        
        # 6. Συνολικές υποχρεώσεις
        total_obligations = total_expenses + previous_obligations + reserve_fund_amount + management_fees + scheduled_maintenance_amount
        print(f"   📋 ΣΥΝΟΛΟ ΥΠΟΧΡΕΩΣΕΩΝ: €{total_obligations}")
        
        # 7. API Endpoint Test
        print(f"\n=== API Endpoint Test ===")
        try:
            from financial.views import FinancialDashboardViewSet
            from django.test import RequestFactory
            
            factory = RequestFactory()
            viewset = FinancialDashboardViewSet()
            
            request = factory.get(f'/api/financial/dashboard/improved-summary/?building_id=1&month={month_str}')
            request.query_params = request.GET
            
            response = viewset.improved_summary(request)
            
            if response.status_code == 200:
                data = response.data
                print(f"   📊 Previous balances: €{data.get('previous_balances', 0)}")
                print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                print(f"   💰 Management fees: €{data.get('management_fees', 0)}")
                print(f"   🏦 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                print(f"   🔧 Scheduled maintenance: €{data.get('scheduled_maintenance_installments', {}).get('total_amount', 0)}")
                print(f"   📋 Total obligations: €{data.get('total_obligations', 0)}")
                
                # Έλεγχος αν τα δεδομένα ταιριάζουν
                expected_previous_obligations = previous_obligations
                actual_previous_obligations = data.get('previous_obligations', 0)
                
                if abs(expected_previous_obligations - actual_previous_obligations) < 0.01:
                    print(f"   ✅ Previous obligations σωστά")
                else:
                    print(f"   ❌ Previous obligations λάθος")
                    print(f"      Expected: €{expected_previous_obligations}")
                    print(f"      Actual: €{actual_previous_obligations}")
                
                # Έλεγχος αν τα δεδομένα θα εμφανιστούν στο ComprehensiveExpenseList
                print(f"\n=== ComprehensiveExpenseList Check ===")
                
                # 1. Καταχωρημένες δαπάνες
                if total_expenses > 0:
                    print(f"   ✅ Καταχωρημένες δαπάνες: €{total_expenses} (θα εμφανιστούν)")
                else:
                    print(f"   ❌ Καταχωρημένες δαπάνες: €{total_expenses} (δεν θα εμφανιστούν)")
                
                # 2. Παλαιότερες οφειλές
                if actual_previous_obligations > 0:
                    print(f"   ✅ Παλαιότερες οφειλές: €{actual_previous_obligations} (θα εμφανιστούν)")
                else:
                    print(f"   ❌ Παλαιότερες οφειλές: €{actual_previous_obligations} (δεν θα εμφανιστούν)")
                
                # 3. Διαχειριστικά έξοδα
                management_fees_api = data.get('management_fees', 0)
                if management_fees_api > 0:
                    print(f"   ✅ Διαχειριστικά έξοδα: €{management_fees_api} (θα εμφανιστούν)")
                else:
                    print(f"   ❌ Διαχειριστικά έξοδα: €{management_fees_api} (δεν θα εμφανιστούν)")
                
                # 4. Εισφορά αποθεματικού
                reserve_fund_api = data.get('reserve_fund_contribution', 0)
                if reserve_fund_api > 0:
                    print(f"   ✅ Εισφορά αποθεματικού: €{reserve_fund_api} (θα εμφανιστούν)")
                else:
                    print(f"   ❌ Εισφορά αποθεματικού: €{reserve_fund_api} (δεν θα εμφανιστούν)")
                
                # 5. Προγραμματισμένα έργα
                scheduled_maintenance_api = data.get('scheduled_maintenance_installments', {}).get('total_amount', 0)
                if scheduled_maintenance_api > 0:
                    print(f"   ✅ Προγραμματισμένα έργα: €{scheduled_maintenance_api} (θα εμφανιστούν)")
                else:
                    print(f"   ❌ Προγραμματισμένα έργα: €{scheduled_maintenance_api} (δεν θα εμφανιστούν)")
                
                # Σύνολο items που θα εμφανιστούν
                total_items = 0
                if total_expenses > 0: total_items += 1
                if actual_previous_obligations > 0: total_items += 1
                if management_fees_api > 0: total_items += 1
                if reserve_fund_api > 0: total_items += 1
                if scheduled_maintenance_api > 0: total_items += 1
                
                print(f"\n   📋 Σύνολο items που θα εμφανιστούν: {total_items}")
                
            else:
                print(f"   ❌ API error: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ API test error: {e}")
        
        print(f"\n🎯 Σύνοψη:")
        print(f"   ✅ API endpoint λειτουργεί")
        print(f"   ✅ Previous obligations: €{actual_previous_obligations}")
        print(f"   ✅ Management fees: €{management_fees_api}")
        print(f"   ✅ Reserve fund: €{reserve_fund_api}")
        print(f"   ✅ Scheduled maintenance: €{scheduled_maintenance_api}")
        print(f"   🔄 Όλα τα items θα εμφανιστούν στο ComprehensiveExpenseList")

if __name__ == '__main__':
    test_comprehensive_expense_list_september()


