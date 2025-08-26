#!/usr/bin/env python3
"""
Script για ανάλυση του προβλήματος με τη μεταφορά υπολοίπων
New Concierge - Building Management System

Αυτό το script αναλύει το πρόβλημα που εντοπίστηκε στον έλεγχο:
- Η μεταφορά υπολοίπων μεταξύ μηνών δεν λειτουργεί σωστά
- Διαφορά: 150.00€ ανά μήνα
- Επηρεάζει: Μήνες 1/2024 έως 5/2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
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

def analyze_balance_transfer_issue():
    """Ανάλυση του προβλήματος με τη μεταφορά υπολοίπων"""
    
    with schema_context('demo'):
        print("🔍 ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 60)
        
        # 1. Βασικές πληροφορίες κτιρίου
        building = Building.objects.get(id=1)  # Αραχώβης 12
        apartments = Apartment.objects.filter(building_id=1)
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        print()
        
        # 2. Έλεγχος τρέχοντος υπολογιστή
        print("📊 ΕΛΕΓΧΟΣ ΤΡΕΧΟΝΤΟΣ ΥΠΟΛΟΓΙΣΤΗ")
        print("-" * 40)
        
        calculator = CommonExpenseCalculator(building_id=1)
        shares = calculator.calculate_shares()
        
        print("Τρέχοντα μερίδια:")
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            print(f"  {apartment.number}: previous_balance={share_data['previous_balance']}€, total_amount={share_data['total_amount']}€")
        
        print()
        
        # 3. Ανάλυση ιστορικών υπολοίπων
        print("📜 ΑΝΑΛΥΣΗ ΙΣΤΟΡΙΚΩΝ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 40)
        
        # Έλεγχος για διαμέρισμα Α3 (με ελληνικό χαρακτήρα)
        try:
            apartment_a3 = Apartment.objects.get(number='Α3')
        except Apartment.DoesNotExist:
            print("❌ Δεν βρέθηκε διαμέρισμα Α3")
            # Δοκιμή με διαμέρισμα Α1
            apartment_a3 = Apartment.objects.get(number='Α1')
            print(f"✅ Χρησιμοποιούμε διαμέρισμα {apartment_a3.number}")
        
        # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/12/2023
        end_date_2023 = date(2023, 12, 31)
        historical_balance_2023 = calculator._get_historical_balance(apartment_a3, end_date_2023)
        
        print(f"Διαμέρισμα {apartment_a3.number} - Ιστορικό υπόλοιπο μέχρι 31/12/2023: {historical_balance_2023}€")
        
        # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/01/2024
        end_date_jan_2024 = date(2024, 1, 31)
        historical_balance_jan_2024 = calculator._get_historical_balance(apartment_a3, end_date_jan_2024)
        
        print(f"Διαμέρισμα {apartment_a3.number} - Ιστορικό υπόλοιπο μέχρι 31/01/2024: {historical_balance_jan_2024}€")
        
        # Υπολογισμός ιστορικού υπολοίπου μέχρι 31/02/2024
        end_date_feb_2024 = date(2024, 2, 29)  # 2024 είναι leap year
        historical_balance_feb_2024 = calculator._get_historical_balance(apartment_a3, end_date_feb_2024)
        
        print(f"Διαμέρισμα {apartment_a3.number} - Ιστορικό υπόλοιπο μέχρι 29/02/2024: {historical_balance_feb_2024}€")
        
        print()
        
        # 4. Ανάλυση συναλλαγών ανά μήνα
        print("💳 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ ΑΝΑ ΜΗΝΑ")
        print("-" * 40)
        
        # Συναλλαγές Ιανουαρίου 2024
        jan_start = date(2024, 1, 1)
        jan_end = date(2024, 1, 31)
        jan_transactions = Transaction.objects.filter(
            apartment=apartment_a3,
            date__gte=timezone.make_aware(datetime.combine(jan_start, datetime.min.time())),
            date__lte=timezone.make_aware(datetime.combine(jan_end, datetime.max.time()))
        ).order_by('date', 'id')
        
        print(f"Συναλλαγές Ιανουαρίου 2024: {jan_transactions.count()}")
        for transaction in jan_transactions:
            print(f"  {transaction.date}: {transaction.type} - {transaction.amount}€")
        
        # Συναλλαγές Φεβρουαρίου 2024
        feb_start = date(2024, 2, 1)
        feb_end = date(2024, 2, 29)
        feb_transactions = Transaction.objects.filter(
            apartment=apartment_a3,
            date__gte=timezone.make_aware(datetime.combine(feb_start, datetime.min.time())),
            date__lte=timezone.make_aware(datetime.combine(feb_end, datetime.max.time()))
        ).order_by('date', 'id')
        
        print(f"\nΣυναλλαγές Φεβρουαρίου 2024: {feb_transactions.count()}")
        for transaction in feb_transactions:
            print(f"  {transaction.date}: {transaction.type} - {transaction.amount}€")
        
        print()
        
        # 5. Ανάλυση πληρωμών ανά μήνα
        print("💰 ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ ΑΝΑ ΜΗΝΑ")
        print("-" * 40)
        
        # Πληρωμές Ιανουαρίου 2024
        jan_payments = Payment.objects.filter(
            apartment=apartment_a3,
            date__gte=jan_start,
            date__lte=jan_end
        ).order_by('date')
        
        print(f"Πληρωμές Ιανουαρίου 2024: {jan_payments.count()}")
        for payment in jan_payments:
            print(f"  {payment.date}: {payment.payment_type} - {payment.amount}€")
        
        # Πληρωμές Φεβρουαρίου 2024
        feb_payments = Payment.objects.filter(
            apartment=apartment_a3,
            date__gte=feb_start,
            date__lte=feb_end
        ).order_by('date')
        
        print(f"\nΠληρωμές Φεβρουαρίου 2024: {feb_payments.count()}")
        for payment in feb_payments:
            print(f"  {payment.date}: {payment.payment_type} - {payment.amount}€")
        
        print()
        
        # 6. Ανάλυση όλων των συναλλαγών και πληρωμών
        print("🔍 ΑΝΑΛΥΣΗ ΟΛΩΝ ΤΩΝ ΣΥΝΑΛΛΑΓΩΝ ΚΑΙ ΠΛΗΡΩΜΩΝ")
        print("-" * 40)
        
        # Όλες οι συναλλαγές
        all_transactions = Transaction.objects.filter(
            apartment=apartment_a3
        ).order_by('date', 'id')
        
        print(f"Σύνολο συναλλαγών: {all_transactions.count()}")
        for transaction in all_transactions:
            print(f"  {transaction.date}: {transaction.type} - {transaction.amount}€")
        
        # Όλες οι πληρωμές
        all_payments = Payment.objects.filter(
            apartment=apartment_a3
        ).order_by('date')
        
        print(f"\nΣύνολο πληρωμών: {all_payments.count()}")
        for payment in all_payments:
            print(f"  {payment.date}: {payment.payment_type} - {payment.amount}€")
        
        print()
        
        # 7. Υπολογισμός διαφορών
        print("🔢 ΥΠΟΛΟΓΙΣΜΟΣ ΔΙΑΦΟΡΩΝ")
        print("-" * 40)
        
        # Διαφορά μεταξύ μηνών
        balance_diff_jan_feb = historical_balance_feb_2024 - historical_balance_jan_2024
        print(f"Διαφορά υπολοίπου Ιανουαρίου-Φεβρουαρίου: {balance_diff_jan_feb}€")
        
        # Υπολογισμός αναμενόμενης διαφοράς
        # Αναμενόμενη διαφορά = Πληρωμές Φεβρουαρίου - Χρεώσεις Φεβρουαρίου
        feb_payments_total = feb_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        feb_charges_total = feb_transactions.filter(
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        expected_diff = feb_payments_total - feb_charges_total
        print(f"Αναμενόμενη διαφορά: {expected_diff}€")
        print(f"  Πληρωμές Φεβρουαρίου: {feb_payments_total}€")
        print(f"  Χρεώσεις Φεβρουαρίου: {feb_charges_total}€")
        
        # Διαφορά μεταξύ αναμενόμενης και πραγματικής
        actual_vs_expected_diff = balance_diff_jan_feb - expected_diff
        print(f"Διαφορά πραγματικής vs αναμενόμενης: {actual_vs_expected_diff}€")
        
        print()
        
        # 8. Ανάλυση του προβλήματος
        print("🚨 ΑΝΑΛΥΣΗ ΤΟΥ ΠΡΟΒΛΗΜΑΤΟΣ")
        print("-" * 40)
        
        if abs(actual_vs_expected_diff) > Decimal('0.01'):
            print("❌ ΠΡΟΒΛΗΜΑ ΕΝΤΟΠΙΣΘΗΚΕ!")
            print(f"   Η διαφορά είναι: {actual_vs_expected_diff}€")
            print()
            print("🔍 ΠΙΘΑΝΕΣ ΑΙΤΙΕΣ:")
            print("   1. Λανθασμένος υπολογισμός ιστορικού υπολοίπου")
            print("   2. Διπλές χρεώσεις ή πληρωμές")
            print("   3. Λανθασμένη μεταφορά υπολοίπου μεταξύ μηνών")
            print("   4. Προβλήματα με το transaction flow")
            print()
            print("🔧 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΔΙΟΡΘΩΣΕΙΣ:")
            print("   1. Έλεγχος του _get_historical_balance method")
            print("   2. Έλεγχος του transaction creation process")
            print("   3. Έλεγχος για διπλές εγγραφές")
            print("   4. Επαναυπολογισμός υπολοίπων από transactions")
        else:
            print("✅ Δεν βρέθηκε πρόβλημα με τη μεταφορά υπολοίπων")
        
        print()
        
        # 9. Σύνοψη
        print("📋 ΣΥΝΟΨΗ")
        print("-" * 40)
        print(f"Τρέχον υπόλοιπο διαμερίσματος {apartment_a3.number}: {apartment_a3.current_balance}€")
        print(f"Ιστορικό υπόλοιπο μέχρι 31/12/2023: {historical_balance_2023}€")
        print(f"Ιστορικό υπόλοιπο μέχρι 31/01/2024: {historical_balance_jan_2024}€")
        print(f"Ιστορικό υπόλοιπο μέχρι 29/02/2024: {historical_balance_feb_2024}€")
        print(f"Διαφορά μεταξύ μηνών: {balance_diff_jan_feb}€")
        print(f"Αναμενόμενη διαφορά: {expected_diff}€")
        print(f"Πραγματική vs Αναμενόμενη: {actual_vs_expected_diff}€")

if __name__ == "__main__":
    analyze_balance_transfer_issue()
