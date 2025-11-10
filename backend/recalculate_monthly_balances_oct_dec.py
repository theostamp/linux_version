#!/usr/bin/env python3
"""
Recalculate MonthlyBalance records για Οκτώβριο-Δεκέμβριο 2025
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
from maintenance.models import PaymentInstallment
from buildings.models import Building
from decimal import Decimal
from datetime import date

def recalculate_monthly_balances():
    """Recalculate MonthlyBalance records"""
    
    with schema_context('demo'):
        print("=== Recalculation MonthlyBalance Οκτώβριος-Δεκέμβριος 2025 ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Κτίριο: {building.name}")
        
        # Μήνες για ενημέρωση
        months_to_update = [
            (2025, 10, 'Οκτώβριος 2025'),
            (2025, 11, 'Νοέμβριος 2025'),
            (2025, 12, 'Δεκέμβριος 2025')
        ]
        
        for year, month, month_name in months_to_update:
            print(f"\n{month_name}:")
            
            # Υπολογισμός δεδομένων
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1)
            else:
                month_end = date(year, month + 1, 1)
            
            # 1. Καταχωρημένες δαπάνες (ΟΛΑ τα expenses)
            expenses = Expense.objects.filter(
                building=building,
                date__year=year,
                date__month=month
            )
            total_expenses = sum(expense.amount for expense in expenses)
            
            # 2. Διαχειριστικά έξοδα - ΗΔΗ περιλαμβάνονται στο total_expenses
            # γιατί υπάρχουν ως Expense με category='management_fees'
            # Οπότε ΔΕΝ τα προσθέτουμε ξεχωριστά για να αποφύγουμε διπλό μέτρημα
            management_fees = Decimal('0.00')
            
            # 3. Εισφορά αποθεματικού - ΗΔΗ περιλαμβάνεται στο total_expenses
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
            if month > 10 or year > 2025:  # Όχι για τον πρώτο μήνα (Οκτώβριος)
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
            # ΣΗΜΕΙΩΣΗ: Τα management_fees και reserve_fund ΗΔΗ περιλαμβάνονται στο total_expenses
            # Οπότε δεν τα προσθέτουμε ξεχωριστά
            total_obligations = total_expenses + previous_obligations + scheduled_maintenance_amount
            net_result = total_payments - total_obligations
            carry_forward = -net_result if net_result < 0 else Decimal('0.00')
            
            print(f"   📊 Καταχωρημένες δαπάνες: €{total_expenses}")
            print(f"   💰 Διαχειριστικά έξοδα (in expenses): €{management_fees}")
            print(f"   🏦 Εισφορά αποθεματικού (in expenses): €{reserve_fund_amount}")
            print(f"   🔧 Προγραμματισμένα έργα: €{scheduled_maintenance_amount}")
            print(f"   📋 Παλαιότερες οφειλές: €{previous_obligations}")
            print(f"   💵 Συνολικές υποχρεώσεις: €{total_obligations}")
            print(f"   💰 Εισπράξεις: €{total_payments}")
            print(f"   ⚖️ Υπόλοιπο: €{net_result}")
            print(f"   🔄 Carry forward: €{carry_forward}")
            
            # 8. Ενημέρωση MonthlyBalance
            monthly_balance = MonthlyBalance.objects.filter(
                building=building,
                year=year,
                month=month
            ).first()
            
            if monthly_balance:
                # Ενημέρωση υπάρχοντος record
                monthly_balance.total_expenses = total_expenses
                monthly_balance.total_payments = total_payments
                monthly_balance.previous_obligations = previous_obligations
                monthly_balance.reserve_fund_amount = reserve_fund_amount
                monthly_balance.management_fees = management_fees
                monthly_balance.scheduled_maintenance_amount = scheduled_maintenance_amount
                monthly_balance.carry_forward = carry_forward
                monthly_balance.save()
                
                print(f"   ✅ Ενημερώθηκε MonthlyBalance")
            else:
                print(f"   ❌ MonthlyBalance ΔΕΝ βρέθηκε!")
        
        print(f"\n🎯 Ολοκλήρωση:")
        print(f"   ✅ Recalculated MonthlyBalance records")

if __name__ == '__main__':
    recalculate_monthly_balances()

