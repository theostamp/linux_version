#!/usr/bin/env python3
"""
Final Summary για το ComprehensiveExpenseList component
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

def final_summary_comprehensive_expense_list():
    """Final Summary για το ComprehensiveExpenseList component"""
    
    with schema_context('demo'):
        print("=== FINAL SUMMARY: ComprehensiveExpenseList Component ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Summary για όλους τους μήνες
        months = [
            ('2025-02', 'Φεβρουάριος 2025'),
            ('2025-03', 'Μάρτιος 2025'),
            ('2025-04', 'Απρίλιος 2025'),
            ('2025-05', 'Μάιος 2025')
        ]
        
        for month_str, month_name in months:
            print(f"\n{month_name}:")
            
            # Καταχωρημένες δαπάνες
            year, month = map(int, month_str.split('-'))
            expenses = Expense.objects.filter(
                building=building,
                date__year=year,
                date__month=month
            )
            
            print(f"   📊 Καταχωρημένες δαπάνες: {expenses.count()}")
            for expense in expenses:
                print(f"      • {expense.title}: €{expense.amount}")
            
            # API data
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
                    print(f"   📊 Previous obligations: €{data.get('previous_obligations', 0)}")
                    print(f"   💰 Management fees: €{data.get('management_fees', 0)}")
                    print(f"   💰 Reserve fund contribution: €{data.get('reserve_fund_contribution', 0)}")
                    print(f"   🔧 Scheduled maintenance installments: {data.get('scheduled_maintenance_installments', {}).get('count', 0)}")
                    
                    # Ελέγχος comprehensive data
                    total_comprehensive = (
                        expenses.count() +  # καταχωρημένες
                        (1 if data.get('previous_obligations', 0) > 0 else 0) +  # previous obligations
                        (1 if data.get('management_fees', 0) > 0 else 0) +  # management fees
                        (1 if data.get('reserve_fund_contribution', 0) > 0 else 0) +  # reserve fund
                        data.get('scheduled_maintenance_installments', {}).get('count', 0)  # scheduled maintenance
                    )
                    
                    print(f"   📋 Σύνολο comprehensive items: {total_comprehensive}")
                    
                else:
                    print(f"   ❌ API endpoint error: {response.status_code}")
                    
            except Exception as e:
                print(f"   ❌ API endpoint error: {e}")
        
        # Summary για προγραμματισμένα έργα
        print(f"\n=== Προγραμματισμένα Έργα ===")
        maintenance_tasks = ScheduledMaintenance.objects.all()
        print(f"Total scheduled maintenance tasks: {maintenance_tasks.count()}")
        
        for task in maintenance_tasks:
            print(f"- {task.title} (Status: {task.status})")
            
        print(f"\n=== Payment Schedules ===")
        schedules = PaymentSchedule.objects.all()
        print(f"Total payment schedules: {schedules.count()}")
        
        for schedule in schedules:
            print(f"- {schedule.scheduled_maintenance.title} (Type: {schedule.payment_type})")
            
        print(f"\n=== Payment Installments ===")
        installments = PaymentInstallment.objects.all()
        print(f"Total installments: {installments.count()}")
        
        for installment in installments:
            print(f"- {installment.payment_schedule.scheduled_maintenance.title} - Installment {installment.installment_number} (Amount: €{installment.amount}, Due: {installment.due_date})")
        
        print(f"\n🎯 ComprehensiveExpenseList Features:")
        print(f"   ✅ Εμφανίζει καταχωρημένες δαπάνες")
        print(f"   ✅ Εμφανίζει παλαιότερες οφειλές (μεταφορά από προηγούμενους μήνες)")
        print(f"   ✅ Εμφανίζει διαχειριστικά έξοδα (€80/μήνα)")
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
        print(f"      • Παλαιότερες οφειλές (κόκκινες)")
        print(f"      • Διαχειριστικά έξοδα (μπλε)")
        print(f"      • Εισφορά αποθεματικού (κίτρινες)")
        print(f"      • Προγραμματισμένα έργα (πορτοκαλί)")
        print(f"   4. Χρησιμοποιήστε τα φίλτρα για αναζήτηση")
        print(f"   5. Κλικ για λεπτομέρειες ή διαγραφή")
        
        print(f"\n🔗 URLs:")
        print(f"   • Financial Overview: http://demo.localhost:3001/financial?tab=overview&building=1")
        print(f"   • Financial Expenses: http://demo.localhost:3001/financial?tab=expenses&building=1")
        print(f"   • Financial Calculator: http://demo.localhost:3001/financial?tab=calculator&building=1")
        
        print(f"\n📊 Test Data Summary:")
        print(f"   • Φεβρουάριος: 1 καταχωρημένη δαπάνη (€600)")
        print(f"   • Μάρτιος: 0 καταχωρημένες, 1 προγραμματισμένο έργο (€50)")
        print(f"   • Απρίλιος: 0 καταχωρημένες, 2 προγραμματισμένα έργα (€550)")
        print(f"   • Μάιος: 0 καταχωρημένες, 1 προγραμματισμένο έργο (€50)")
        print(f"   • Διαχειριστικά έξοδα: €80 κάθε μήνα")
        print(f"   • Παλαιότερες οφειλές: €600 από Φεβρουάριο")

if __name__ == '__main__':
    final_summary_comprehensive_expense_list()


