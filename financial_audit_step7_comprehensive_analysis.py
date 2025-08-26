#!/usr/bin/env python3
"""
Script για ολοκληρωμένη ανάλυση του προβλήματος με τη μεταφορά υπολοίπων
New Concierge - Building Management System

Αυτό το script κάνει ολοκληρωμένη ανάλυση του προβλήματος που εντοπίστηκε:
- Η μεταφορά υπολοίπων μεταξύ μηνών δεν λειτουργεί σωστά
- Διαφορά: 150.00€ ανά μήνα
- Επηρεάζει: Μήνες 1/2024 έως 5/2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.utils import timezone
from django.db.models import Sum, Q

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Payment, Transaction, Expense, CommonExpensePeriod, ApartmentShare
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from buildings.models import Building

def comprehensive_balance_analysis():
    """Ολοκληρωμένη ανάλυση του προβλήματος με τη μεταφορά υπολοίπων"""
    
    with schema_context('demo'):
        print("🔍 ΟΛΟΚΛΗΡΩΜΕΝΗ ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 70)
        
        # 1. Βασικές πληροφορίες
        building = Building.objects.get(id=1)  # Αραχώβης 12
        apartments = Apartment.objects.filter(building_id=1).order_by('number')
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        print()
        
        # 2. Ανάλυση όλων των διαμερισμάτων
        print("📊 ΑΝΑΛΥΣΗ ΟΛΩΝ ΤΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 50)
        
        calculator = CommonExpenseCalculator(building_id=1)
        shares = calculator.calculate_shares()
        
        total_previous_balance = Decimal('0.00')
        total_current_balance = Decimal('0.00')
        
        for apartment in apartments:
            share_data = shares.get(apartment.id, {})
            previous_balance = share_data.get('previous_balance', Decimal('0.00'))
            current_balance = apartment.current_balance or Decimal('0.00')
            
            total_previous_balance += previous_balance
            total_current_balance += current_balance
            
            print(f"{apartment.number}: previous_balance={previous_balance}€, current_balance={current_balance}€")
        
        print(f"\nΣύνολο previous_balance: {total_previous_balance}€")
        print(f"Σύνολο current_balance: {total_current_balance}€")
        print(f"Διαφορά: {total_current_balance - total_previous_balance}€")
        print()
        
        # 3. Ανάλυση συναλλαγών και πληρωμών
        print("💳 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ ΚΑΙ ΠΛΗΡΩΜΩΝ")
        print("-" * 50)
        
        # Συνολικές συναλλαγές
        all_transactions = Transaction.objects.filter(
            building_id=1
        ).order_by('date', 'id')
        
        print(f"Σύνολο συναλλαγών: {all_transactions.count()}")
        
        # Συνολικές πληρωμές
        all_payments = Payment.objects.filter(
            apartment__building_id=1
        ).order_by('date')
        
        print(f"Σύνολο πληρωμών: {all_payments.count()}")
        
        # Ανάλυση ανά μήνα
        months_2024 = [
            (1, 'Ιανουάριος'),
            (2, 'Φεβρουάριος'),
            (3, 'Μάρτιος'),
            (4, 'Απρίλιος'),
            (5, 'Μάιος'),
            (6, 'Ιούνιος')
        ]
        
        print("\nΑνάλυση ανά μήνα 2024:")
        for month_num, month_name in months_2024:
            month_start = date(2024, month_num, 1)
            if month_num == 12:
                month_end = date(2025, 1, 1) - timedelta(days=1)
            else:
                month_end = date(2024, month_num + 1, 1) - timedelta(days=1)
            
            month_transactions = all_transactions.filter(
                date__gte=timezone.make_aware(datetime.combine(month_start, datetime.min.time())),
                date__lte=timezone.make_aware(datetime.combine(month_end, datetime.max.time()))
            )
            
            month_payments = all_payments.filter(
                date__gte=month_start,
                date__lte=month_end
            )
            
            transactions_total = month_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            payments_total = month_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"  {month_name}: συναλλαγές={month_transactions.count()} ({transactions_total}€), πληρωμές={month_payments.count()} ({payments_total}€)")
        
        print()
        
        # 4. Ανάλυση του προβλήματος με τη μεταφορά υπολοίπων
        print("🚨 ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 50)
        
        # Έλεγχος για διαμέρισμα με μεγάλη διαφορά
        problematic_apartments = []
        
        for apartment in apartments:
            share_data = shares.get(apartment.id, {})
            previous_balance = share_data.get('previous_balance', Decimal('0.00'))
            current_balance = apartment.current_balance or Decimal('0.00')
            
            # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/12/2023
            end_date_2023 = date(2023, 12, 31)
            historical_balance_2023 = calculator._get_historical_balance(apartment, end_date_2023)
            
            # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/01/2024
            end_date_jan_2024 = date(2024, 1, 31)
            historical_balance_jan_2024 = calculator._get_historical_balance(apartment, end_date_jan_2024)
            
            # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/05/2024
            end_date_may_2024 = date(2024, 5, 31)
            historical_balance_may_2024 = calculator._get_historical_balance(apartment, end_date_may_2024)
            
            # Έλεγχος για διαφορά 150€ ανά μήνα
            expected_monthly_diff = Decimal('150.00')
            actual_diff_jan = historical_balance_jan_2024 - historical_balance_2023
            actual_diff_may = historical_balance_may_2024 - historical_balance_jan_2024
            
            if abs(actual_diff_jan - expected_monthly_diff) > Decimal('0.01') or abs(actual_diff_may - expected_monthly_diff) > Decimal('0.01'):
                problematic_apartments.append({
                    'apartment': apartment,
                    'previous_balance': previous_balance,
                    'current_balance': current_balance,
                    'historical_2023': historical_balance_2023,
                    'historical_jan_2024': historical_balance_jan_2024,
                    'historical_may_2024': historical_balance_may_2024,
                    'diff_jan': actual_diff_jan,
                    'diff_may': actual_diff_may,
                    'expected': expected_monthly_diff
                })
        
        if problematic_apartments:
            print("❌ ΒΡΕΘΗΚΑΝ ΔΙΑΜΕΡΙΣΜΑΤΑ ΜΕ ΠΡΟΒΛΗΜΑ:")
            for problem in problematic_apartments:
                apt = problem['apartment']
                print(f"\n  {apt.number}:")
                print(f"    Τρέχον υπόλοιπο: {problem['current_balance']}€")
                print(f"    Previous balance: {problem['previous_balance']}€")
                print(f"    Ιστορικό 31/12/2023: {problem['historical_2023']}€")
                print(f"    Ιστορικό 31/01/2024: {problem['historical_jan_2024']}€")
                print(f"    Ιστορικό 31/05/2024: {problem['historical_may_2024']}€")
                print(f"    Διαφορά Ιανουαρίου: {problem['diff_jan']}€ (αναμενόμενη: {problem['expected']}€)")
                print(f"    Διαφορά Μάιου: {problem['diff_may']}€ (αναμενόμενη: {problem['expected']}€)")
        else:
            print("✅ Δεν βρέθηκαν διαμερίσματα με πρόβλημα μεταφοράς υπολοίπων")
        
        print()
        
        # 5. Ανάλυση του calculation system
        print("🔧 ΑΝΑΛΥΣΗ ΤΟΥ CALCULATION SYSTEM")
        print("-" * 50)
        
        # Έλεγχος του _get_historical_balance method
        print("Έλεγχος _get_historical_balance method:")
        
        test_apartment = apartments.first()
        test_date = date(2024, 1, 31)
        
        # Χειροκίνητος υπολογισμός
        manual_payments = Payment.objects.filter(
            apartment=test_apartment,
            date__lt=test_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        manual_charges = Transaction.objects.filter(
            apartment=test_apartment,
            date__lt=timezone.make_aware(datetime.combine(test_date, datetime.max.time())),
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        manual_additional_payments = Transaction.objects.filter(
            apartment=test_apartment,
            date__lt=timezone.make_aware(datetime.combine(test_date, datetime.max.time())),
            type__in=['common_expense_payment', 'payment_received', 'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        manual_balance = manual_payments + manual_additional_payments - manual_charges
        calculator_balance = calculator._get_historical_balance(test_apartment, test_date)
        
        print(f"  Χειροκίνητος υπολογισμός: {manual_balance}€")
        print(f"  Calculator υπολογισμός: {calculator_balance}€")
        print(f"  Διαφορά: {manual_balance - calculator_balance}€")
        
        if abs(manual_balance - calculator_balance) > Decimal('0.01'):
            print("  ❌ ΠΡΟΒΛΗΜΑ ΣΤΟΝ ΥΠΟΛΟΓΙΣΜΟ!")
        else:
            print("  ✅ Ο υπολογισμός είναι σωστός")
        
        print()
        
        # 6. Προτάσεις διόρθωσης
        print("🔧 ΠΡΟΤΑΣΕΙΣ ΔΙΟΡΘΩΣΗΣ")
        print("-" * 50)
        
        if problematic_apartments:
            print("Προτεινόμενα βήματα:")
            print("1. Επαναυπολογισμός υπολοίπων από transactions")
            print("2. Έλεγχος για διπλές εγγραφές")
            print("3. Διόρθωση του _get_historical_balance method")
            print("4. Ενημέρωση του transaction flow")
            print("5. Δημιουργία automated tests")
        else:
            print("Δεν απαιτούνται άμεσες διορθώσεις")
        
        print()
        
        # 7. Σύνοψη
        print("📋 ΣΥΝΟΨΗ")
        print("-" * 50)
        print(f"Σύνολο διαμερισμάτων: {apartments.count()}")
        print(f"Διαμερίσματα με πρόβλημα: {len(problematic_apartments)}")
        print(f"Σύνολο συναλλαγών: {all_transactions.count()}")
        print(f"Σύνολο πληρωμών: {all_payments.count()}")
        print(f"Συνολικό previous_balance: {total_previous_balance}€")
        print(f"Συνολικό current_balance: {total_current_balance}€")

if __name__ == "__main__":
    comprehensive_balance_analysis()
