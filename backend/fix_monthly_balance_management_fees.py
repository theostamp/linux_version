"""
Διόρθωση MonthlyBalance: Ενημέρωση management_fees πεδίου

Το πρόβλημα: Το MonthlyBalance.management_fees πεδίο δεν ενημερώνεται ποτέ,
μένει στο 0.00 όταν δημιουργείται το record.

Η λύση: Υπολογίζουμε τα management fees από τα Expense records (category='management_fees')
και τα αποθηκεύουμε στο MonthlyBalance.management_fees πεδίο.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, MonthlyBalance
from buildings.models import Building
from decimal import Decimal
from datetime import date


def fix_monthly_balance_management_fees(dry_run=False):
    """
    Ενημερώνει το management_fees πεδίο σε όλα τα MonthlyBalance records
    με βάση τα Expense records που έχουν category='management_fees'
    """
    with schema_context('demo'):
        print("=" * 80)
        print("ΔΙΟΡΘΩΣΗ: MonthlyBalance management_fees")
        print("=" * 80)
        print()
        
        # Βρες όλα τα MonthlyBalance records
        all_balances = MonthlyBalance.objects.all().order_by('year', 'month')
        
        print(f"Βρέθηκαν {all_balances.count()} MonthlyBalance records")
        print()
        
        updated_count = 0
        no_change_count = 0
        
        for balance in all_balances:
            print(f"📅 {balance.month:02d}/{balance.year} - {balance.building.name}")
            
            # Υπολογισμός management fees από Expense records
            management_fees_expenses = Expense.objects.filter(
                building=balance.building,
                category='management_fees',
                date__year=balance.year,
                date__month=balance.month
            )
            
            calculated_management_fees = sum(
                exp.amount for exp in management_fees_expenses
            ) or Decimal('0.00')
            
            print(f"   Τρέχον management_fees: €{balance.management_fees}")
            print(f"   Υπολογισμένο από expenses: €{calculated_management_fees}")
            print(f"   ({management_fees_expenses.count()} expense records)")
            
            if balance.management_fees != calculated_management_fees:
                if not dry_run:
                    balance.management_fees = calculated_management_fees
                    balance.save(update_fields=['management_fees'])
                    print(f"   ✅ Ενημερώθηκε: €{balance.management_fees} → €{calculated_management_fees}")
                else:
                    print(f"   🔧 [DRY-RUN] Θα ενημερωνόταν: €{balance.management_fees} → €{calculated_management_fees}")
                updated_count += 1
            else:
                print(f"   ⏭️ Κανένα update δεν χρειάζεται")
                no_change_count += 1
            
            print()
        
        print("=" * 80)
        print("ΣΥΝΟΨΗ")
        print("=" * 80)
        print(f"Συνολικά records: {all_balances.count()}")
        print(f"Ενημερώθηκαν: {updated_count}")
        print(f"Κανένα update: {no_change_count}")
        
        if dry_run:
            print()
            print("⚠️ DRY-RUN MODE - Δεν έγινε κανένα update")
            print("   Τρέξτε χωρίς --dry-run για να κάνετε τις αλλαγές")


if __name__ == '__main__':
    import sys
    
    # Έλεγχος για dry-run flag
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 Running in DRY-RUN mode...")
        print()
    
    fix_monthly_balance_management_fees(dry_run=dry_run)


