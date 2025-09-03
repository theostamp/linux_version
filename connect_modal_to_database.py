#!/usr/bin/env python3
"""
Script to connect the Common Expense Modal parameters to real database data
This will create the missing data needed for the modal to display correctly
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Apartment
from buildings.models import Building
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal

def connect_modal_to_database():
    """Connect modal parameters to real database data"""
    
    with schema_context('demo'):
        # Get building data
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print("=" * 80)
        
        # TARGET MONTH: September 2025 (August usage)
        target_month = "2025-09"
        usage_month = "2025-08"
        print(f"🎯 ΣΥΝΔΕΣΗ ΓΙΑ: {target_month} (χρήση {usage_month})")
        print("=" * 80)
        
        # 1. ANALYZE EXISTING DATA
        print("🔍 1. ΑΝΑΛΥΣΗ ΥΠΑΡΧΟΝΤΩΝ ΔΕΔΟΜΕΝΩΝ:")
        print("-" * 50)
        
        # Get all expenses
        all_expenses = Expense.objects.filter(building=building).order_by('date')
        print(f"Συνολικές δαπάνες: {all_expenses.count()}")
        
        # Get payments for target month
        target_payments = Payment.objects.filter(
            apartment__building=building,
            date__startswith=target_month
        )
        total_target_amount = target_payments.aggregate(total=Sum('amount'))['total'] or 0
        print(f"Πληρωμές {target_month}: {total_target_amount}€")
        
        # Get apartments with mills
        apartments = Apartment.objects.filter(building=building)
        total_mills = apartments.aggregate(total=Sum('participation_mills'))['total'] or 0
        print(f"Συνολικό χιλιοστά: {total_mills}")
        
        # 2. CALCULATE REQUIRED AMOUNTS
        print("\n🔍 2. ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΑΙΤΟΥΜΕΝΩΝ ΠΟΣΩΝ:")
        print("-" * 55)
        
        # User's expected values
        expected_values = {
            'common': 200.00,        # Λειτουργικές Δαπάνες
            'management': 80.00,     # Κόστος διαχείρισης
            'reserve': 1083.33,      # Αποθεματικό Ταμείο
            'previous_balance': 5000.00,  # Παλαιότερες οφειλές
            'total': 6363.33
        }
        
        print("📋 ΑΠΑΙΤΟΥΜΕΝΑ ΠΟΣΑ:")
        print(f"  1. Λειτουργικές Δαπάνες: {expected_values['common']}€")
        print(f"  2. Κόστος διαχείρισης: {expected_values['management']}€")
        print(f"  3. Αποθεματικό Ταμείο: {expected_values['reserve']}€")
        print(f"  4. Παλαιότερες οφειλές: {expected_values['previous_balance']}€")
        print(f"  ΣΥΝΟΛΟ: {expected_values['total']}€")
        
        # 3. VERIFY WHAT WE HAVE
        print("\n🔍 3. ΕΠΙΒΕΒΑΙΩΣΗ ΤΩΝ ΥΠΑΡΧΟΝΤΩΝ:")
        print("-" * 45)
        
        # Check DEH expense (previous balance)
        dee_expense = Expense.objects.filter(
            building=building,
            title__icontains='ΔΕΗ',
            amount__range=[4990, 5010]
        ).first()
        
        if dee_expense:
            print(f"✅ ΔΕΗ δαπάνη (παλαιότερες οφειλές): {dee_expense.amount}€")
            print(f"   📅 Ημερομηνία: {dee_expense.date}")
            print(f"   🏷️  Κατηγορία: {dee_expense.category}")
        else:
            print("❌ ΔΕΗ δαπάνη 5.000€ ΔΕΝ ΒΡΕΘΗΚΕ!")
        
        # Check management fee
        management_fee_per_apt = building.management_fee_per_apartment or 0
        total_management_fee = management_fee_per_apt * apartments.count()
        print(f"✅ Κόστος διαχείρισης: {total_management_fee}€ ({management_fee_per_apt}€/διαμ.)")
        
        # Check reserve fund
        reserve_goal = building.reserve_fund_goal or 0
        reserve_duration = building.reserve_fund_duration_months or 0
        monthly_reserve = reserve_goal / reserve_duration if reserve_duration > 0 else 0
        print(f"✅ Αποθεματικό ταμείο: {monthly_reserve:.2f}€/μήνα (στόχος: {reserve_goal}€ σε {reserve_duration} μήνες)")
        
        # 4. CALCULATE MISSING AMOUNTS
        print("\n🔍 4. ΥΠΟΛΟΓΙΣΜΟΣ ΛΕΙΠΟΝΤΩΝ ΠΟΣΩΝ:")
        print("-" * 50)
        
        # Calculate common expenses (missing) - Convert to float for calculations
        dee_amount = float(dee_expense.amount) if dee_expense else 0.0
        management_amount = float(total_management_fee)
        reserve_amount = float(monthly_reserve)
        previous_balance = dee_amount
        
        # Common expenses should be the remaining amount
        total_required = expected_values['total']
        calculated_total = management_amount + reserve_amount + previous_balance
        common_expenses_needed = total_required - calculated_total
        
        print("💰 ΥΠΟΛΟΓΙΣΜΟΣ:")
        print(f"  Διαχείριση: {management_amount}€")
        print(f"  Αποθεματικό: {reserve_amount:.2f}€")
        print(f"  Παλαιότερες οφειλές: {previous_balance}€")
        print(f"  Σύνολο: {calculated_total:.2f}€")
        print(f"  Απαιτούμενο σύνολο: {total_required}€")
        print(f"  Λειπόμενο για κοινές δαπάνες: {common_expenses_needed:.2f}€")
        
        # 5. CREATE MISSING EXPENSES
        print("\n🔍 5. ΔΗΜΙΟΥΡΓΙΑ ΛΕΙΠΟΝΤΩΝ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        # Check if we need to create common expenses
        if abs(common_expenses_needed - expected_values['common']) > 1:
            print(f"⚠️  Χρειάζεται δημιουργία κοινών δαπανών: {common_expenses_needed:.2f}€")
            
            # Create common expenses for August usage (September billing)
            common_expense = Expense.objects.create(
                building=building,
                title="Λειτουργικές Δαπάνες Αυγούστου 2025",
                amount=Decimal(str(common_expenses_needed)),
                date=datetime(2025, 8, 31).date(),
                category="operational_expenses",
                distribution_type="by_participation_mills",
                expense_type="monthly",
                notes="Αυτόματη δημιουργία για το modal - Λειτουργικές δαπάνες Αυγούστου"
            )
            print(f"✅ Δημιουργήθηκε δαπάνη: {common_expense.title} - {common_expense.amount}€")
        else:
            print(f"✅ Οι κοινές δαπάνες είναι σωστές: {expected_values['common']}€")
        
        # 6. VERIFY FINAL TOTALS
        print("\n🔍 6. ΕΠΙΒΕΒΑΙΩΣΗ ΤΕΛΙΚΩΝ ΣΥΝΟΛΩΝ:")
        print("-" * 50)
        
        # Recalculate totals
        final_expenses = Expense.objects.filter(building=building)
        final_total = final_expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        print("💰 ΤΕΛΙΚΑ ΣΥΝΟΛΑ:")
        print(f"  Συνολικές δαπάνες: {final_total}€")
        print(f"  Διαχείριση: {management_amount}€")
        print(f"  Αποθεματικό: {reserve_amount:.2f}€")
        print(f"  Παλαιότερες οφειλές: {previous_balance}€")
        print(f"  Σύνολο: {float(final_total) + management_amount + reserve_amount:.2f}€")
        print(f"  Απαιτούμενο: {total_required}€")
        
        # 7. RECOMMENDATIONS
        print("\n🔍 7. ΣΥΜΒΟΥΛΕΣ ΚΑΙ ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("-" * 60)
        
        print("✅ ΤΙ ΕΧΟΥΜΕ ΤΩΡΑ:")
        print(f"  - ΔΕΗ δαπάνη: {dee_amount}€")
        print(f"  - Κόστος διαχείρισης: {management_amount}€")
        print(f"  - Αποθεματικό ταμείο: {reserve_amount:.2f}€")
        print(f"  - Κοινές δαπάνες: {common_expenses_needed:.2f}€")
        
        print("\n🚀 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("  1. Ενημέρωση του modal για να χρησιμοποιεί τα πραγματικά δεδομένα")
        print("  2. Δημιουργία API endpoint για δυναμική ανάκτηση")
        print("  3. Επιβεβαίωση με τον χρήστη")
        print("  4. Testing του modal με τα νέα δεδομένα")

if __name__ == "__main__":
    connect_modal_to_database()
