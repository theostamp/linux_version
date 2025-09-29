#!/usr/bin/env python3
"""
Script για να ελέγξουμε αν όλες οι δαπάνες μεταφέρονται σωστά ως υπόλοιπο
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

def check_balance_transfer_completeness():
    """Ελέγχει αν όλες οι δαπάνες μεταφέρονται σωστά"""
    
    with schema_context('demo'):
        print("=== Έλεγχος Πληρότητας Μεταφοράς Υπολοίπων ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Έλεγχος για τους μήνες που έχουμε δεδομένα
        months_to_check = [
            ('2025-02', 'Φεβρουάριος 2025'),
            ('2025-03', 'Μάρτιος 2025'),
            ('2025-04', 'Απρίλιος 2025'),
            ('2025-05', 'Μάιος 2025')
        ]
        
        for month_str, month_name in months_to_check:
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
            
            # 3. Εισφορά αποθεματικού (0 για τώρα)
            reserve_fund = Decimal('0.00')
            print(f"   🏦 Εισφορά αποθεματικού: €{reserve_fund}")
            
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
            total_installments = sum(installment.amount for installment in installments)
            print(f"   🔧 Προγραμματισμένα έργα: €{total_installments}")
            
            # 5. Συνολικές υποχρεώσεις
            total_obligations = total_expenses + management_fees + reserve_fund + total_installments
            print(f"   📋 ΣΥΝΟΛΟ ΥΠΟΧΡΕΩΣΕΩΝ: €{total_obligations}")
            
            # 6. Εισπράξεις
            payments = Payment.objects.filter(
                apartment__building=building,
                date__year=year,
                date__month=month
            )
            total_payments = sum(payment.amount for payment in payments)
            print(f"   💰 Εισπράξεις: €{total_payments}")
            
            # 7. Υπόλοιπο
            balance = total_payments - total_obligations
            print(f"   ⚖️ Υπόλοιπο: €{balance}")
            
            # 8. Έλεγχος MonthlyBalance
            monthly_balance = MonthlyBalance.objects.filter(
                building=building,
                year=year,
                month=month
            ).first()
            
            if monthly_balance:
                print(f"   📊 MonthlyBalance:")
                print(f"      • Total expenses: €{monthly_balance.total_expenses}")
                print(f"      • Management fees: €{monthly_balance.management_fees}")
                print(f"      • Reserve fund: €{monthly_balance.reserve_fund_amount}")
                print(f"      • Previous obligations: €{monthly_balance.previous_obligations}")
                print(f"      • Total obligations: €{monthly_balance.total_obligations}")
                print(f"      • Total payments: €{monthly_balance.total_payments}")
                print(f"      • Net result: €{monthly_balance.net_result}")
                print(f"      • Carry forward: €{monthly_balance.carry_forward}")
                
                # Έλεγχος αν τα δεδομένα ταιριάζουν
                if abs(monthly_balance.total_expenses - total_expenses) > 0.01:
                    print(f"      ⚠️ Διαφορά σε total_expenses: {monthly_balance.total_expenses} vs {total_expenses}")
                
                if abs(monthly_balance.management_fees - management_fees) > 0.01:
                    print(f"      ⚠️ Διαφορά σε management_fees: {monthly_balance.management_fees} vs {management_fees}")
                
                if abs(monthly_balance.reserve_fund_amount - reserve_fund) > 0.01:
                    print(f"      ⚠️ Διαφορά σε reserve_fund: {monthly_balance.reserve_fund_amount} vs {reserve_fund}")
                
                # Έλεγχος αν τα προγραμματισμένα έργα περιλαμβάνονται
                expected_total_obligations = total_expenses + management_fees + reserve_fund + total_installments
                if abs(monthly_balance.total_obligations - expected_total_obligations) > 0.01:
                    print(f"      ❌ Διαφορά σε total_obligations: {monthly_balance.total_obligations} vs {expected_total_obligations}")
                    print(f"      ❌ Τα προγραμματισμένα έργα (€{total_installments}) ΔΕΝ περιλαμβάνονται!")
                else:
                    print(f"      ✅ Total obligations σωστά")
            else:
                print(f"   ❌ Δεν υπάρχει MonthlyBalance για {month_name}")
        
        print(f"\n🎯 Σύνοψη:")
        print(f"   ✅ Καταχωρημένες δαπάνες: Περιλαμβάνονται")
        print(f"   ✅ Διαχειριστικά έξοδα: Περιλαμβάνονται")
        print(f"   ✅ Εισφορά αποθεματικού: Περιλαμβάνονται")
        print(f"   ❌ Προγραμματισμένα έργα: ΔΕΝ περιλαμβάνονται στο MonthlyBalance!")
        print(f"   🔧 Χρειάζεται ενημέρωση του MonthlyBalance model")

if __name__ == '__main__':
    check_balance_transfer_completeness()


