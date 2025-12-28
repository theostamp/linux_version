#!/usr/bin/env python3
"""
Retroactive sync όλων των MonthlyBalance records με τις πραγματικές δαπάνες/πληρωμές.

Αυτό χρειάζεται μόνο μία φορά για να συγχρονίσουμε υπάρχοντα δεδομένα.
Από εδώ και πέρα, τα signals θα κρατούν τα MonthlyBalance up-to-date αυτόματα.
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

def sync_monthly_balances():
    """Συγχρονίζει όλα τα MonthlyBalance με τις πραγματικές δαπάνες"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΣΥΓΧΡΟΝΙΣΜΟΣ MONTHLYBALANCE - ΔΥΝΑΜΙΚΗ ΕΝΗΜΕΡΩΣΗ")
        print("="*80 + "\n")
        
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"🏢 {building.name} (ID: {building.id})")
            print("-" * 80)
            
            # Βρίσκουμε όλες τις δαπάνες του κτιρίου
            all_expenses = Expense.objects.filter(building=building).order_by('date')
            all_payments = Payment.objects.filter(apartment__building=building).order_by('date')
            
            if not all_expenses.exists() and not all_payments.exists():
                print("   (Δεν υπάρχουν δαπάνες/πληρωμές)\n")
                continue
            
            # Βρίσκουμε όλους τους unique μήνες
            months_with_activity = set()
            
            for exp in all_expenses:
                months_with_activity.add((exp.date.year, exp.date.month))
            
            for pay in all_payments:
                months_with_activity.add((pay.date.year, pay.date.month))
            
            # Συγχρονισμός κάθε μήνα (ταξινομημένοι για σωστό αθροιστικό carry_forward)
            cumulative_carry_forward = Decimal('0.00')  # Αθροιστικό υπόλοιπο
            
            for year, month in sorted(months_with_activity):
                month_start = date(year, month, 1)
                if month == 12:
                    month_end = date(year + 1, 1, 1)
                else:
                    month_end = date(year, month + 1, 1)
                
                # Υπολογισμός δαπανών & πληρωμών μήνα
                month_expenses = Expense.objects.filter(
                    building=building,
                    date__gte=month_start,
                    date__lt=month_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                month_payments = Payment.objects.filter(
                    apartment__building=building,
                    date__gte=month_start,
                    date__lt=month_end
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                # ✅ ΚΡΙΣΙΜΟ: Αθροιστικός υπολογισμός carry_forward
                current_month_debt = month_expenses - month_payments
                cumulative_carry_forward += current_month_debt
                carry_forward = cumulative_carry_forward
                
                # Get or Create MonthlyBalance
                monthly_balance, created = MonthlyBalance.objects.get_or_create(
                    building=building,
                    year=year,
                    month=month,
                    defaults={
                        'total_expenses': month_expenses,
                        'total_payments': month_payments,
                        'carry_forward': carry_forward,
                        'previous_obligations': Decimal('0.00'),
                        'reserve_fund_amount': Decimal('0.00'),
                        'management_fees': Decimal('0.00'),
                        'scheduled_maintenance_amount': Decimal('0.00'),
                    }
                )
                
                if created:
                    status = "✅ ΔΗΜΙΟΥΡΓΗΘΗΚΕ"
                else:
                    # Ενημέρωση
                    monthly_balance.total_expenses = month_expenses
                    monthly_balance.total_payments = month_payments
                    monthly_balance.carry_forward = carry_forward
                    monthly_balance.save()
                    status = "🔄 ΕΝΗΜΕΡΩΘΗΚΕ"
                
                print(f"   {status} {month:02d}/{year}: Exp=€{month_expenses:,.2f}, Pay=€{month_payments:,.2f}, Carry=€{carry_forward:,.2f}")
            
            print()
        
        print("="*80)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("="*80)
        print("\n📋 Από εδώ και πέρα, τα signals θα κρατούν το MonthlyBalance up-to-date αυτόματα!")
        print("   - Κάθε νέα δαπάνη → Auto-update MonthlyBalance")
        print("   - Κάθε πληρωμή → Auto-update MonthlyBalance")
        print("   - Κάθε διαγραφή → Auto-recalculate MonthlyBalance\n")

if __name__ == '__main__':
    sync_monthly_balances()

