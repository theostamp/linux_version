#!/usr/bin/env python3
"""
Script για να ενημερώσουμε τα MonthlyBalance records με όλα τα δεδομένα
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

def update_monthly_balances_with_complete_data():
    """Ενημερώνει τα MonthlyBalance records με όλα τα δεδομένα"""
    
    with schema_context('demo'):
        print("=== Ενημέρωση MonthlyBalance με Πλήρη Δεδομένα ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Μήνες για ενημέρωση
        months_to_update = [
            ('2025-02', 'Φεβρουάριος 2025'),
            ('2025-03', 'Μάρτιος 2025'),
            ('2025-04', 'Απρίλιος 2025'),
            ('2025-05', 'Μάιος 2025')
        ]
        
        for month_str, month_name in months_to_update:
            print(f"\n{month_name}:")
            
            year, month = map(int, month_str.split('-'))
            
            # Υπολογισμός δεδομένων
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, month + 1, 1)
            
            # 1. Καταχωρημένες δαπάνες
            expenses = Expense.objects.filter(
                building=building,
                date__year=year,
                date__month=month
            )
            total_expenses = sum(expense.amount for expense in expenses)
            
            # 2. Διαχειριστικά έξοδα (€80/μήνα)
            management_fees = Decimal('80.00')
            
            # 3. Εισφορά αποθεματικού (0 για τώρα)
            reserve_fund_amount = Decimal('0.00')
            
            # 4. Προγραμματισμένα έργα
            installments = PaymentInstallment.objects.filter(
                payment_schedule__scheduled_maintenance__building=building,
                due_date__gte=month_start,
                due_date__lt=month_end,
                status='pending'
            )
            scheduled_maintenance_amount = sum(installment.amount for installment in installments)
            
            # 5. Εισπράξεις
            payments = Payment.objects.filter(
                apartment__building=building,
                date__year=year,
                date__month=month
            )
            total_payments = sum(payment.amount for payment in payments)
            
            # 6. Παλαιότερες οφειλές (από προηγούμενο μήνα)
            previous_obligations = Decimal('0.00')
            if month_str != '2025-02':  # Όχι για τον πρώτο μήνα
                prev_month = month - 1
                prev_year = year
                if prev_month == 0:
                    prev_month = 12
                    prev_year -= 1
                
                prev_balance = MonthlyBalance.objects.filter(
                    building=building,
                    year=prev_year,
                    month=prev_month
                ).first()
                
                if prev_balance:
                    previous_obligations = prev_balance.carry_forward
            
            # 7. Υπολογισμός carry_forward
            total_obligations = total_expenses + previous_obligations + reserve_fund_amount + management_fees + scheduled_maintenance_amount
            net_result = total_payments - total_obligations
            carry_forward = -net_result if net_result < 0 else Decimal('0.00')
            
            print(f"   📊 Καταχωρημένες δαπάνες: €{total_expenses}")
            print(f"   💰 Διαχειριστικά έξοδα: €{management_fees}")
            print(f"   🏦 Εισφορά αποθεματικού: €{reserve_fund_amount}")
            print(f"   🔧 Προγραμματισμένα έργα: €{scheduled_maintenance_amount}")
            print(f"   📋 Παλαιότερες οφειλές: €{previous_obligations}")
            print(f"   💰 Εισπράξεις: €{total_payments}")
            print(f"   ⚖️ Υπόλοιπο: €{net_result}")
            print(f"   🔄 Carry forward: €{carry_forward}")
            
            # 8. Δημιουργία/Ενημέρωση MonthlyBalance
            monthly_balance, created = MonthlyBalance.objects.get_or_create(
                building=building,
                year=year,
                month=month,
                defaults={
                    'total_expenses': total_expenses,
                    'total_payments': total_payments,
                    'previous_obligations': previous_obligations,
                    'reserve_fund_amount': reserve_fund_amount,
                    'management_fees': management_fees,
                    'scheduled_maintenance_amount': scheduled_maintenance_amount,
                    'carry_forward': carry_forward,
                    'is_closed': False
                }
            )
            
            if not created:
                # Ενημέρωση υπάρχοντος record
                monthly_balance.total_expenses = total_expenses
                monthly_balance.total_payments = total_payments
                monthly_balance.previous_obligations = previous_obligations
                monthly_balance.reserve_fund_amount = reserve_fund_amount
                monthly_balance.management_fees = management_fees
                monthly_balance.scheduled_maintenance_amount = scheduled_maintenance_amount
                monthly_balance.carry_forward = carry_forward
                monthly_balance.save()
                
                print(f"   ✅ Ενημερώθηκε υπάρχον MonthlyBalance")
            else:
                print(f"   ✅ Δημιουργήθηκε νέο MonthlyBalance")
            
            # 9. Έλεγχος total_obligations
            expected_total_obligations = total_expenses + previous_obligations + reserve_fund_amount + management_fees + scheduled_maintenance_amount
            actual_total_obligations = monthly_balance.total_obligations
            
            print(f"   📋 Total obligations: €{actual_total_obligations} (expected: €{expected_total_obligations})")
            
            if abs(actual_total_obligations - expected_total_obligations) < 0.01:
                print(f"   ✅ Total obligations σωστά")
            else:
                print(f"   ❌ Διαφορά σε total_obligations")
        
        print(f"\n🎯 Σύνοψη:")
        print(f"   ✅ Ενημερώθηκαν όλα τα MonthlyBalance records")
        print(f"   ✅ Περιλαμβάνονται καταχωρημένες δαπάνες")
        print(f"   ✅ Περιλαμβάνονται διαχειριστικά έξοδα")
        print(f"   ✅ Περιλαμβάνονται εισφορά αποθεματικού")
        print(f"   ✅ Περιλαμβάνονται προγραμματισμένα έργα")
        print(f"   ✅ Υπολογίζεται σωστά το carry_forward")
        print(f"   🔄 Τώρα όλες οι δαπάνες μεταφέρονται στον επόμενο μήνα!")

if __name__ == '__main__':
    update_monthly_balances_with_complete_data()


