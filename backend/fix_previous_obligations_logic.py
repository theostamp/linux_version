"""
Διόρθωση: Υπολογισμός previous_obligations από MonthlyBalance

Το πρόβλημα: Τα previous_obligations υπολογίζονται από τα raw expenses/payments
αντί να χρησιμοποιούν το carry_forward από το MonthlyBalance του προηγούμενου μήνα.

Η λύση: Προσθέτουμε λογική που ελέγχει αν υπάρχει MonthlyBalance για τον προηγούμενο 
μήνα και χρησιμοποιεί το carry_forward του, αλλιώς fallback στον παλιό υπολογισμό.
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, MonthlyBalance
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal
from datetime import date
from django.db.models import Sum


def test_previous_obligations_logic(year, month, building_id=None):
    """
    Δοκιμάζει τη λογική υπολογισμού previous_obligations για έναν συγκεκριμένο μήνα
    """
    with schema_context('demo'):
        print("=" * 80)
        print(f"ΔΟΚΙΜΗ: Previous Obligations - {month:02d}/{year}")
        print("=" * 80)
        print()
        
        # Βρες το κτίριο
        if building_id:
            buildings = Building.objects.filter(id=building_id)
        else:
            buildings = Building.objects.all()
        
        for building in buildings:
            print(f"🏢 Κτίριο: {building.name}")
            print()
            
            # ΜΕΘΟΔΟΣ 1: Raw calculation (παλιά λογική)
            expenses_before_month = Expense.objects.filter(
                building_id=building.id,
                date__lt=date(year, month, 1)
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            payments_before_month = Payment.objects.filter(
                apartment__building_id=building.id,
                date__lt=date(year, month, 1)
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            raw_previous_obligations = expenses_before_month - payments_before_month
            
            print(f"   ΜΕΘΟΔΟΣ 1 (Raw Calculation):")
            print(f"   Expenses before {month:02d}/{year}: €{expenses_before_month:.2f}")
            print(f"   Payments before {month:02d}/{year}: €{payments_before_month:.2f}")
            print(f"   Previous obligations: €{raw_previous_obligations:.2f}")
            print()
            
            # ΜΕΘΟΔΟΣ 2: MonthlyBalance carry_forward (νέα λογική)
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
                carry_forward_previous_obligations = prev_balance.carry_forward
                print(f"   ΜΕΘΟΔΟΣ 2 (MonthlyBalance carry_forward):")
                print(f"   Carry forward από {prev_month:02d}/{prev_year}: €{carry_forward_previous_obligations:.2f}")
                print()
                
                # Σύγκριση
                diff = abs(raw_previous_obligations - carry_forward_previous_obligations)
                print(f"   ΣΥΓΚΡΙΣΗ:")
                if diff < Decimal('0.01'):
                    print(f"   ✅ Ταιριάζουν (διαφορά: €{diff:.2f})")
                else:
                    print(f"   ⚠️ Διαφορά: €{diff:.2f}")
                    print(f"      Raw: €{raw_previous_obligations:.2f}")
                    print(f"      Carry forward: €{carry_forward_previous_obligations:.2f}")
            else:
                print(f"   ΜΕΘΟΔΟΣ 2 (MonthlyBalance carry_forward):")
                print(f"   ⚠️ Δεν βρέθηκε MonthlyBalance για {prev_month:02d}/{prev_year}")
                print(f"   Θα χρησιμοποιηθεί η raw calculation")
            
            print()
            print("-" * 80)
            print()


def populate_monthly_balances(building_id=None, start_year=2025, start_month=2):
    """
    Δημιουργεί MonthlyBalance records για όλους τους μήνες που λείπουν
    """
    with schema_context('demo'):
        print("=" * 80)
        print("ΔΗΜΙΟΥΡΓΙΑ: MonthlyBalance Records")
        print("=" * 80)
        print()
        
        # Βρες το κτίριο
        if building_id:
            buildings = Building.objects.filter(id=building_id)
        else:
            buildings = Building.objects.all()
        
        for building in buildings:
            print(f"🏢 Κτίριο: {building.name}")
            print()
            
            # Βρες όλους τους μήνες που έχουν expenses ή payments
            expenses = Expense.objects.filter(building=building).values_list('date', flat=True)
            payments = Payment.objects.filter(apartment__building=building).values_list('date', flat=True)
            
            all_dates = list(expenses) + list(payments)
            if not all_dates:
                print("   ⚠️ Δεν βρέθηκαν expenses ή payments")
                continue
            
            min_date = min(all_dates)
            max_date = max(all_dates)
            
            print(f"   Περίοδος δεδομένων: {min_date.strftime('%Y-%m')} έως {max_date.strftime('%Y-%m')}")
            print()
            
            # Δημιουργία MonthlyBalance για κάθε μήνα
            current_year = start_year
            current_month = start_month
            
            created_count = 0
            existing_count = 0
            
            while date(current_year, current_month, 1) <= date(max_date.year, max_date.month, 1):
                # Έλεγχος αν υπάρχει ήδη
                existing = MonthlyBalance.objects.filter(
                    building=building,
                    year=current_year,
                    month=current_month
                ).exists()
                
                if not existing:
                    # Υπολογισμός expenses του μήνα
                    month_start = date(current_year, current_month, 1)
                    if current_month == 12:
                        month_end = date(current_year + 1, 1, 1)
                    else:
                        month_end = date(current_year, current_month + 1, 1)
                    
                    total_expenses = Expense.objects.filter(
                        building=building,
                        date__gte=month_start,
                        date__lt=month_end
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    total_payments = Payment.objects.filter(
                        apartment__building=building,
                        date__gte=month_start,
                        date__lt=month_end
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Management fees του μήνα
                    management_fees = Expense.objects.filter(
                        building=building,
                        category='management_fees',
                        date__gte=month_start,
                        date__lt=month_end
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    # Previous obligations (από προηγούμενο μήνα ή raw calculation)
                    prev_month = current_month - 1
                    prev_year = current_year
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
                    else:
                        # Raw calculation
                        expenses_before = Expense.objects.filter(
                            building=building,
                            date__lt=month_start
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        
                        payments_before = Payment.objects.filter(
                            apartment__building=building,
                            date__lt=month_start
                        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                        
                        previous_obligations = expenses_before - payments_before
                    
                    # Υπολογισμός carry_forward
                    total_obligations = total_expenses + previous_obligations
                    net_result = total_payments - total_obligations
                    carry_forward = -net_result if net_result < 0 else Decimal('0.00')
                    
                    # Δημιουργία
                    MonthlyBalance.objects.create(
                        building=building,
                        year=current_year,
                        month=current_month,
                        total_expenses=total_expenses,
                        total_payments=total_payments,
                        previous_obligations=previous_obligations,
                        reserve_fund_amount=Decimal('0.00'),  # TODO: Calculate
                        management_fees=management_fees,
                        carry_forward=carry_forward,
                        annual_carry_forward=Decimal('0.00'),
                        balance_year=current_year,
                        main_balance_carry_forward=Decimal('0.00'),
                        reserve_balance_carry_forward=Decimal('0.00'),
                        management_balance_carry_forward=Decimal('0.00'),
                    )
                    
                    print(f"   ✅ Δημιουργήθηκε: {current_month:02d}/{current_year}")
                    print(f"      Expenses: €{total_expenses:.2f}, Payments: €{total_payments:.2f}")
                    print(f"      Previous obligations: €{previous_obligations:.2f}")
                    print(f"      Carry forward: €{carry_forward:.2f}")
                    created_count += 1
                else:
                    existing_count += 1
                
                # Επόμενος μήνας
                current_month += 1
                if current_month > 12:
                    current_month = 1
                    current_year += 1
            
            print()
            print(f"   Σύνοψη: {created_count} δημιουργήθηκαν, {existing_count} υπήρχαν ήδη")
            print()


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'test':
            # Test mode: δοκιμάζει τη λογική για συγκεκριμένο μήνα
            year = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
            month = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            building_id = int(sys.argv[4]) if len(sys.argv) > 4 else None
            
            test_previous_obligations_logic(year, month, building_id)
        
        elif sys.argv[1] == 'populate':
            # Populate mode: δημιουργεί MonthlyBalance records
            building_id = int(sys.argv[2]) if len(sys.argv) > 2 else None
            start_year = int(sys.argv[3]) if len(sys.argv) > 3 else 2025
            start_month = int(sys.argv[4]) if len(sys.argv) > 4 else 2
            
            populate_monthly_balances(building_id, start_year, start_month)
    else:
        print("Usage:")
        print("  python fix_previous_obligations_logic.py test [year] [month] [building_id]")
        print("  python fix_previous_obligations_logic.py populate [building_id] [start_year] [start_month]")












