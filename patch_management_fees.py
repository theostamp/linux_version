#!/usr/bin/env python3
"""
Patch script to update the _calculate_historical_balance method
to include management fees in historical balance calculations
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def patch_services_file():
    """Apply the patch to services.py"""

    services_path = '/app/financial/services.py'

    # Read the current file
    with open(services_path, 'r') as f:
        content = f.read()

    # Check if already patched
    if 'management_fees_total' in content:
        print("✅ File already patched!")
        return False

    # Find the _calculate_historical_balance method
    method_start = content.find('def _calculate_historical_balance(self, apartment, end_date)')
    if method_start == -1:
        print("❌ Could not find _calculate_historical_balance method!")
        return False

    # Find the end of the method (next def or class)
    next_def = content.find('\n    def ', method_start + 10)
    next_class = content.find('\nclass ', method_start + 10)

    if next_def == -1:
        next_def = len(content)
    if next_class == -1:
        next_class = len(content)

    method_end = min(next_def, next_class)

    # Create the new method
    new_method = '''    def _calculate_historical_balance(self, apartment, end_date) -> Decimal:
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
        from .models import Transaction, Payment, Expense
        from django.utils import timezone
        from datetime import datetime, date
        from django.db.models import Sum

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
        management_fee_per_apartment = apartment.building.management_fee_per_apartment or Decimal('0.00')

        if management_fee_per_apartment > 0:
            # Βρίσκουμε την αρχική ημερομηνία για υπολογισμό (Ιανουάριος 2025)
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

            # Debug output
            if months_to_charge > 0:
                print(f"   💰 Management fees for apt {apartment.number}: {months_to_charge} months × €{management_fee_per_apartment} = €{management_fees_total}")

        # Υπόλοιπο = Χρεώσεις - Πληρωμές (θετικό = χρέος, αρνητικό = πίστωση)
        historical_balance = total_charges - total_payments

        return historical_balance
'''

    # Replace the old method with the new one
    new_content = content[:method_start] + new_method + content[method_end:]

    # Create backup
    import shutil
    from datetime import datetime
    backup_path = f'/app/financial/services.py.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    shutil.copy(services_path, backup_path)
    print(f"✅ Backup created: {backup_path}")

    # Write the patched file
    with open(services_path, 'w') as f:
        f.write(new_content)

    print("✅ File patched successfully!")
    print("⚠️  Please restart the Django server for changes to take effect.")
    return True

if __name__ == '__main__':
    success = patch_services_file()
    if success:
        print("\n" + "="*80)
        print("PATCH APPLIED SUCCESSFULLY!")
        print("="*80)
        print("\nThe management fees will now be included in historical balance calculations.")
        print("This means:")
        print("1. Management fees will accumulate each month")
        print("2. They will be carried forward as previous obligations")
        print("3. The 'Ενημέρωση Δεδομένων' button will recalculate everything correctly")
    else:
        print("\n⚠️  Patch was not applied. Check the messages above.")