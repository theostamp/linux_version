#!/usr/bin/env python3
"""
Add management fees calculation to existing _calculate_historical_balance method
"""

def add_management_fees():
    """Add management fees to the existing method"""

    services_path = '/app/financial/services.py'

    # Read the file
    with open(services_path, 'r') as f:
        lines = f.readlines()

    # Find the line where we return historical_balance
    for i, line in enumerate(lines):
        if 'historical_balance = total_charges - total_payments' in line:
            print(f"Found calculation at line {i+1}")

            # Insert the management fee calculation BEFORE this line
            indent = '        '  # 8 spaces for proper indentation

            management_code = f'''
{indent}# ΠΡΟΣΘΗΚΗ: Υπολογισμός δαπανών διαχείρισης για προηγούμενους μήνες
{indent}management_fee_per_apartment = apartment.building.management_fee_per_apartment or Decimal('0.00')
{indent}
{indent}if management_fee_per_apartment > 0:
{indent}    # Βρίσκουμε την αρχική ημερομηνία για υπολογισμό (Ιανουάριος 2025)
{indent}    from datetime import date
{indent}    start_date = date(2025, 1, 1)
{indent}
{indent}    # Υπολογίζουμε πόσους μήνες πρέπει να χρεώσουμε
{indent}    months_to_charge = 0
{indent}    current_date = start_date
{indent}
{indent}    while current_date < month_start:
{indent}        months_to_charge += 1
{indent}        # Πάμε στον επόμενο μήνα
{indent}        if current_date.month == 12:
{indent}            current_date = current_date.replace(year=current_date.year + 1, month=1)
{indent}        else:
{indent}            current_date = current_date.replace(month=current_date.month + 1)
{indent}
{indent}    # Προσθέτουμε τις δαπάνες διαχείρισης στις συνολικές χρεώσεις
{indent}    management_fees_total = management_fee_per_apartment * months_to_charge
{indent}    total_charges += management_fees_total
{indent}
{indent}    # Debug output για να βλέπουμε τι υπολογίζεται
{indent}    if months_to_charge > 0:
{indent}        print(f"💰 Management fees for apt {{apartment.number}}: {{months_to_charge}} months × €{{management_fee_per_apartment}} = €{{management_fees_total}}")
{indent}
'''

            # Insert the new code
            lines.insert(i, management_code)
            print("✅ Management fee code added!")
            break

    # Write the modified file
    with open(services_path, 'w') as f:
        f.writelines(lines)

    print("✅ File updated successfully!")

if __name__ == '__main__':
    add_management_fees()
    print("\n⚠️  Please restart the Django server for changes to take effect.")