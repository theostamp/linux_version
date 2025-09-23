#!/usr/bin/env python3
"""
Script to debug management fees calculation in historical balance
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.db.models import Sum, Q
from django_tenants.utils import schema_context

from apartments.models import Apartment
from financial.models import Payment, Expense, Transaction
from financial.services import FinancialDashboardService

def debug_management_fees_calculation():
    """Debug why management fees are being calculated incorrectly"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🔍 ΕΡΕΥΝΑ ΥΠΟΛΟΓΙΣΜΟΥ ΔΑΠΑΝΩΝ ΔΙΑΧΕΙΡΙΣΗΣ")
        print("=" * 80)
        
        building_id = 1
        
        # Get building info
        from buildings.models import Building
        building = Building.objects.get(id=building_id)
        management_fee_per_apartment = building.management_fee_per_apartment or Decimal('0.00')
        
        print(f"Δαπάνη διαχείρισης ανά διαμέρισμα: {management_fee_per_apartment:.2f} €")
        
        # Check September 2024 calculation
        print(f"\n📅 ΥΠΟΛΟΓΙΣΜΟΣ ΣΕΠΤΕΜΒΡΙΟΥ 2024:")
        print("-" * 50)
        
        sept_service = FinancialDashboardService(building_id)
        sept_apartments = sept_service.get_apartment_balances('2024-09')
        
        # Manual calculation of management fees for September 2024
        month_start = date(2024, 9, 1)
        start_date = date(2025, 1, 1)  # This is the problem!
        
        print(f"Αρχική ημερομηνία υπολογισμού: {start_date}")
        print(f"Ημερομηνία μήνα: {month_start}")
        
        months_to_charge = 0
        current_date = start_date
        
        while current_date < month_start:
            months_to_charge += 1
            print(f"  Μήνας {months_to_charge}: {current_date.year}-{current_date.month:02d}")
            # Πάμε στον επόμενο μήνα
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        print(f"\nΣυνολικοί μήνες για χρέωση: {months_to_charge}")
        
        if management_fee_per_apartment > 0:
            total_management_fees = management_fee_per_apartment * months_to_charge
            print(f"Συνολικές δαπάνες διαχείρισης ανά διαμέρισμα: {total_management_fees:.2f} €")
            
            # Calculate total for all apartments
            apartments = Apartment.objects.filter(building_id=building_id)
            total_management_fees_all = total_management_fees * apartments.count()
            print(f"Συνολικές δαπάνες διαχείρισης για όλα τα διαμερίσματα: {total_management_fees_all:.2f} €")
        
        # Check what the service actually returns
        print(f"\n📊 ΑΠΟΤΕΛΕΣΜΑΤΑ ΑΠΟ ΤΟ SERVICE:")
        print("-" * 50)
        
        total_previous_balance = 0
        for apt_data in sept_apartments:
            apt_id = apt_data['id']
            apartment = Apartment.objects.get(id=apt_id)
            previous_balance = apt_data.get('previous_balance', 0)
            total_previous_balance += abs(previous_balance)
            
            print(f"Διαμέρισμα {apartment.number}: {previous_balance:.2f} €")
        
        print(f"\nΣυνολικές παλαιότερες οφειλές: {total_previous_balance:.2f} €")
        
        # Check if this matches the expected calculation
        expected_management_fees = management_fee_per_apartment * months_to_charge * apartments.count()
        print(f"Αναμενόμενες δαπάνες διαχείρισης: {expected_management_fees:.2f} €")
        
        # Check the difference
        difference = total_previous_balance - expected_management_fees
        print(f"Διαφορά: {difference:.2f} €")
        
        # Check what the original balance should be (without management fees)
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΧΩΡΙΣ ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ:")
        print("-" * 50)
        
        # Calculate balance without management fees
        sept_start = date(2024, 9, 1)
        
        for apt_data in sept_apartments:
            apt_id = apt_data['id']
            apartment = Apartment.objects.get(id=apt_id)
            
            # Get payments
            total_payments = Payment.objects.filter(
                apartment=apartment,
                date__lt=sept_start
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Get charges from expenses before September
            expenses_before_sept = Expense.objects.filter(
                building_id=building_id,
                date__lt=sept_start
            )
            
            expense_ids_before_sept = list(expenses_before_sept.values_list('id', flat=True))
            
            if expense_ids_before_sept:
                total_charges = Transaction.objects.filter(
                    apartment=apartment,
                    reference_type='expense',
                    reference_id__in=[str(exp_id) for exp_id in expense_ids_before_sept],
                    type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                             'interest_charge', 'penalty_charge']
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            else:
                total_charges = Decimal('0.00')
            
            balance_without_management = total_charges - total_payments
            
            print(f"Διαμέρισμα {apartment.number}:")
            print(f"  Χρεώσεις: {total_charges:.2f} €")
            print(f"  Πληρωμές: {total_payments:.2f} €")
            print(f"  Υπόλοιπο χωρίς διαχείριση: {balance_without_management:.2f} €")
            print(f"  Υπόλοιπο με διαχείριση: {apt_data.get('previous_balance', 0):.2f} €")
            print()
        
        print("=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        print("❌ ΠΡΟΒΛΗΜΑ: Η αρχική ημερομηνία υπολογισμού είναι 2025-01-01")
        print("   αλλά υπολογίζουμε για Σεπτέμβριο 2024!")
        print("   Αυτό προκαλεί υπολογισμό δαπανών διαχείρισης για 9 μήνες")
        print("   που δεν υπάρχουν ακόμα (Ιαν-Σεπ 2024)")

if __name__ == "__main__":
    debug_management_fees_calculation()
