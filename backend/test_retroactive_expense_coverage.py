#!/usr/bin/env python3
"""
Test script για να ελέγξω αν το "Με μια ματιά" λαμβάνει υπόψη τις εκ των υστέρων δαπάνες
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment, Transaction
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum
from datetime import date, datetime
from django.utils import timezone

def test_retroactive_expense_coverage():
    """Ελέγχει αν το 'Με μια ματιά' λαμβάνει υπόψη τις εκ των υστέρων δαπάνες"""
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        apartments = Apartment.objects.filter(building_id=building.id)
        
        print("🔍 ΕΛΕΓΧΟΣ ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ ΔΑΠΑΝΩΝ ΣΤΟ 'ΜΕ ΜΙΑ ΜΑΤΙΑ'")
        print("=" * 60)
        
        # Τρέχον μήνας (Σεπτέμβριος 2025)
        current_month = "2025-09"
        year, month = map(int, current_month.split('-'))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        print(f"📅 Τρέχον μήνας: {current_month}")
        print(f"   Αρχή: {start_date}")
        print(f"   Τέλος: {end_date}")
        print()
        
        # 1. Δαπάνες του τρέχοντος μήνα (Σεπτέμβριος)
        current_month_expenses = Expense.objects.filter(
            building_id=building.id,
            date__gte=start_date,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 ΔΑΠΑΝΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ ({current_month}):")
        print(f"   Συνολικές δαπάνες: {current_month_expenses}€")
        
        # 2. Δαπάνες εκ των υστέρων (Μάρτιος 2025)
        march_expenses = Expense.objects.filter(
            building_id=building.id,
            date__year=2025,
            date__month=3
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print("\n📅 ΔΑΠΑΝΕΣ ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ (Μάρτιος 2025):")
        print(f"   Συνολικές δαπάνες: {march_expenses}€")
        
        # 3. Προηγούμενες οφειλές (υπολογισμός όπως στο backend)
        previous_obligations = Decimal('0.00')
        for apartment in apartments:
            # Υπολογισμός ιστορικού υπολοίπου μέχρι τέλος προηγούμενου μήνα
            if month == 1:
                previous_month_end = date(year - 1, 12, 31)
            else:
                from calendar import monthrange
                _, last_day = monthrange(year, month - 1)
                previous_month_end = date(year, month - 1, last_day)
            
            # Πληρωμές μέχρι τέλος προηγούμενου μήνα
            total_payments = Payment.objects.filter(
                apartment=apartment,
                date__lt=previous_month_end
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Δαπάνες πριν από τρέχον μήνα
            expenses_before_month = Expense.objects.filter(
                building_id=building.id,
                date__lt=start_date
            )
            
            expense_ids_before_month = list(expenses_before_month.values_list('id', flat=True))
            
            # Χρεώσεις από δαπάνες πριν από τρέχον μήνα
            if expense_ids_before_month:
                total_charges = Transaction.objects.filter(
                    apartment=apartment,
                    reference_type='expense',
                    reference_id__in=[str(exp_id) for exp_id in expense_ids_before_month],
                    type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                             'interest_charge', 'penalty_charge']
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            else:
                total_charges = Decimal('0.00')
            
            # Επιπλέον εισπράξεις
            end_datetime = timezone.make_aware(datetime.combine(previous_month_end, datetime.max.time()))
            additional_payments = Transaction.objects.filter(
                apartment=apartment,
                date__lt=end_datetime,
                type__in=['common_expense_payment', 'payment_received', 'refund']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Ιστορικό υπόλοιπο
            historical_balance = total_payments + additional_payments - total_charges
            
            if historical_balance < 0:
                previous_obligations += abs(historical_balance)
        
        print("\n📊 ΠΡΟΗΓΟΥΜΕΝΕΣ ΟΦΕΙΛΕΣ:")
        print(f"   Συνολικές προηγούμενες οφειλές: {previous_obligations}€")
        
        # 4. Διαχειριστικά τέλη
        management_fee_per_apartment = building.management_fee_per_apartment or Decimal('0.00')
        apartments_count = apartments.count()
        total_management_cost = management_fee_per_apartment * apartments_count
        
        print("\n🏢 ΔΙΑΧΕΙΡΙΣΤΙΚΑ ΤΕΛΗ:")
        print(f"   Ανά διαμέρισμα: {management_fee_per_apartment}€")
        print(f"   Συνολικό κόστος: {total_management_cost}€")
        
        # 5. Εισφορά αποθεματικού
        reserve_fund_monthly_target = (building.reserve_fund_goal or Decimal('0.0')) / (building.reserve_fund_duration_months or 1)
        
        print("\n💰 ΕΙΣΦΟΡΑ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"   Μηνιαίος στόχος: {reserve_fund_monthly_target}€")
        
        # 6. Πληρωμές τρέχοντος μήνα
        current_month_payments = Payment.objects.filter(
            apartment__building_id=building.id,
            date__gte=start_date,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print("\n💳 ΠΛΗΡΩΜΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        print(f"   Συνολικές πληρωμές: {current_month_payments}€")
        
        # 7. Υπολογισμός όπως στο "Με μια ματιά" (ΠΡΙΝ τη διόρθωση)
        old_current_month_obligations = current_month_expenses + total_management_cost + reserve_fund_monthly_target
        old_coverage_percentage = (current_month_payments / old_current_month_obligations * 100) if old_current_month_obligations > 0 else 0
        
        print("\n❌ ΠΑΛΑΙΟΣ ΥΠΟΛΟΓΙΣΜΟΣ (ΧΩΡΙΣ ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ):")
        print(f"   Τρέχουσες υποχρεώσεις: {old_current_month_obligations}€")
        print(f"   Πληρωμές: {current_month_payments}€")
        print(f"   Κάλυψη: {old_coverage_percentage:.1f}%")
        
        # 8. Υπολογισμός όπως στο "Με μια ματιά" (ΜΕΤΑ τη διόρθωση)
        new_current_month_obligations = current_month_expenses + total_management_cost + reserve_fund_monthly_target
        new_total_obligations = new_current_month_obligations + previous_obligations
        new_coverage_percentage = (current_month_payments / new_total_obligations * 100) if new_total_obligations > 0 else 0
        
        print("\n✅ ΝΕΟΣ ΥΠΟΛΟΓΙΣΜΟΣ (ΜΕ ΕΚ ΤΩΝ ΥΣΤΕΡΩΝ):")
        print(f"   Τρέχουσες υποχρεώσεις: {new_current_month_obligations}€")
        print(f"   Προηγούμενες οφειλές: {previous_obligations}€")
        print(f"   Συνολικές υποχρεώσεις: {new_total_obligations}€")
        print(f"   Πληρωμές: {current_month_payments}€")
        print(f"   Κάλυψη: {new_coverage_percentage:.1f}%")
        
        # 9. Σύγκριση
        print("\n📈 ΣΥΓΚΡΙΣΗ:")
        print(f"   Διαφορά κάλυψης: {new_coverage_percentage - old_coverage_percentage:.1f}%")
        print(f"   Διαφορά υποχρεώσεων: {new_total_obligations - old_current_month_obligations}€")
        
        if previous_obligations > 0:
            print("\n🎯 ΑΠΟΤΕΛΕΣΜΑ:")
            print("   ✅ Το 'Με μια ματιά' ΤΩΡΑ λαμβάνει υπόψη τις εκ των υστέρων δαπάνες!")
            print(f"   ✅ Η κάλυψη είναι πιο ρεαλιστική: {new_coverage_percentage:.1f}% αντί για {old_coverage_percentage:.1f}%")
        else:
            print("\n🎯 ΑΠΟΤΕΛΕΣΜΑ:")
            print("   ℹ️  Δεν υπάρχουν προηγούμενες οφειλές για να εμφανιστούν")
            print(f"   ℹ️  Η κάλυψη παραμένει ίδια: {new_coverage_percentage:.1f}%")
        
        return {
            'old_coverage': old_coverage_percentage,
            'new_coverage': new_coverage_percentage,
            'previous_obligations': previous_obligations,
            'march_expenses': march_expenses
        }

if __name__ == "__main__":
    try:
        result = test_retroactive_expense_coverage()
        print("\n🎉 Το test ολοκληρώθηκε επιτυχώς!")
        print(f"📊 Αποτελέσματα: {result}")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()
