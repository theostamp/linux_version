#!/usr/bin/env python3
"""
Script to update the _calculate_historical_balance method to include management fees
"""

# This is the updated method that should be added to FinancialDashboardService
updated_method = '''
def _calculate_historical_balance(self, apartment, end_date) -> Decimal:
    """
    Υπολογισμός ιστορικού υπολοίπου διαμερίσματος μέχρι συγκεκριμένη ημερομηνία
    ΣΥΜΠΕΡΙΛΑΜΒΑΝΟΝΤΑΣ τις δαπάνες διαχείρισης

    Args:
        apartment: Το διαμέρισμα για το οποίο υπολογίζουμε το υπόλοιπο
        end_date: Η ημερομηνία μέχρι την οποία υπολογίζουμε

    Returns:
        Decimal: Το υπόλοιπο του διαμερίσματος μέχρι την δοθείσα ημερομηνία
    """
    from decimal import Decimal
    from .models import Transaction, Payment
    from django.utils import timezone
    from datetime import datetime
    from calendar import monthrange

    # Υπολογισμός πληρωμών μέχρι την ημερομηνία
    total_payments = Payment.objects.filter(
        apartment=apartment,
        date__lt=end_date
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # Βεβαιωθείτε ότι το end_date είναι date object
    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # Υπολογισμός αρχής του μήνα
    month_start = end_date.replace(day=1)

    # Βρίσκουμε δαπάνες που δημιουργήθηκαν ΠΡΙΝ από την αρχή του μήνα
    expenses_before_month = Expense.objects.filter(
        building_id=apartment.building_id,
        date__lt=month_start
    )

    expense_ids_before_month = list(expenses_before_month.values_list('id', flat=True))

    # Υπολογισμός χρεώσεων από δαπάνες
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

    # ΠΡΟΣΘΗΚΗ: Υπολογισμός δαπανών διαχείρισης για προηγούμενους μήνες
    # Υπολογίζουμε πόσους μήνες έχουν περάσει και πρέπει να χρεωθούν
    management_fee_per_apartment = apartment.building.management_fee_per_apartment or Decimal('0.00')

    if management_fee_per_apartment > 0:
        # Βρίσκουμε την αρχική ημερομηνία του κτιρίου ή χρησιμοποιούμε default
        # Ας υποθέσουμε ότι ξεκινάμε από την αρχή του 2025
        start_date = date(2025, 1, 1)

        # Υπολογίζουμε πόσους μήνες πρέπει να χρεώσουμε
        months_to_charge = 0
        current_date = start_date

        while current_date < month_start:
            months_to_charge += 1
            # Πάμε στον επόμενο μήνα
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

        # Προσθέτουμε τις δαπάνες διαχείρισης στις συνολικές χρεώσεις
        management_fees_total = management_fee_per_apartment * months_to_charge
        total_charges += management_fees_total

        print(f"🔧 Management Fees Calculation for {apartment.number}:")
        print(f"   Months to charge: {months_to_charge}")
        print(f"   Fee per month: €{management_fee_per_apartment}")
        print(f"   Total management fees: €{management_fees_total}")

    # Υπόλοιπο = Χρεώσεις - Πληρωμές (θετικό = χρέος, αρνητικό = πίστωση)
    historical_balance = total_charges - total_payments

    return historical_balance
'''

print("="*80)
print("UPDATED METHOD FOR MANAGEMENT FEES")
print("="*80)
print("\nThe _calculate_historical_balance method needs to be updated in:")
print("/app/financial/services.py")
print("\nKey changes:")
print("1. Adds calculation for management fees based on months elapsed")
print("2. Includes management fees in total charges")
print("3. Ensures management fees are carried over as previous obligations")
print("\nTo apply this fix:")
print("1. Back up the current services.py file")
print("2. Replace the _calculate_historical_balance method with the updated version")
print("3. Restart the Django server")