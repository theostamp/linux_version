#!/usr/bin/env python3
"""
Comprehensive financial analysis for the Common Expense Modal
Analyzes all financial data needed to populate the modal dynamically
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Apartment, Transaction
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal

def comprehensive_financial_analysis():
    """Comprehensive analysis of all financial data for the modal"""
    
    with schema_context('demo'):
        # Get building data
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Αριθμός διαμερισμάτων: {Apartment.objects.filter(building=building).count()}")
        print("=" * 80)
        
        # TARGET MONTH: September 2025 (August usage)
        target_month = "2025-09"
        usage_month = "2025-08"
        print(f"🎯 ΕΡΕΥΝΑ ΓΙΑ: {target_month} (χρήση {usage_month})")
        print("=" * 80)
        
        # 1. EXPENSES ANALYSIS
        print("🔍 1. ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        # Get all expenses for the building
        all_expenses = Expense.objects.filter(building=building).order_by('date')
        print(f"Συνολικές δαπάνες: {all_expenses.count()}")
        
        if all_expenses.exists():
            print("\n📊 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΑΠΑΝΩΝ:")
            for expense in all_expenses:
                print(f"  📅 {expense.date}: {expense.title}")
                print(f"     💰 Ποσό: {expense.amount}€")
                print(f"     🏷️  Κατηγορία: {expense.category}")
                print(f"     📊 Τρόπος κατανομής: {expense.distribution_type}")
                print()
        
        # 2. PAYMENTS ANALYSIS
        print("🔍 2. ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ:")
        print("-" * 50)
        
        # Get payments for target month
        target_payments = Payment.objects.filter(
            apartment__building=building,
            date__startswith=target_month
        )
        
        print(f"Πληρωμές για {target_month}: {target_payments.count()}")
        
        if target_payments.exists():
            total_target_amount = target_payments.aggregate(total=Sum('amount'))['total'] or 0
            print(f"Συνολικό ποσό {target_month}: {total_target_amount}€")
            
            print("\n📊 ΛΕΠΤΟΜΕΡΕΙΕΣ ΠΛΗΡΩΜΩΝ:")
            for payment in target_payments:
                print(f"  🏠 Διαμ. {payment.apartment.number}: {payment.amount}€")
        
        # 3. APARTMENT FINANCIAL DATA
        print("\n🔍 3. ΟΙΚΟΝΟΜΙΚΑ ΔΕΔΟΜΕΝΑ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 60)
        
        apartments = Apartment.objects.filter(building=building)
        total_mills = 0
        
        print("📊 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        for apt in apartments:
            mills = apt.participation_mills or 0
            total_mills += mills
            print(f"  🏠 Διαμ. {apt.number}: {mills} χιλιοστά")
        
        print(f"\n💰 ΣΥΝΟΛΟ ΧΙΛΙΟΣΤΩΝ: {total_mills}")
        print("🎯 ΣΤΟΧΟΣ: 1000 χιλιοστά")
        
        if total_mills != 1000:
            print("⚠️  ΠΡΟΣΟΧΗ: Τα χιλιοστά δεν αθροίζουν σε 1000!")
        
        # 4. BUILDING SETTINGS
        print("\n🔍 4. ΡΥΘΜΙΣΕΙΣ ΚΤΙΡΙΟΥ:")
        print("-" * 40)
        
        building_fields = [field.name for field in building._meta.fields]
        print(f"Διαθέσιμα πεδία: {building_fields}")
        
        # Check specific fields
        management_fields = [field for field in building_fields if 'management' in field.lower() or 'fee' in field.lower()]
        reserve_fields = [field for field in building_fields if 'reserve' in field.lower() or 'fund' in field.lower()]
        
        print(f"\n🏷️  Πεδία διαχείρισης: {management_fields}")
        for field_name in management_fields:
            value = getattr(building, field_name, None)
            print(f"  {field_name}: {value}")
        
        print(f"\n💰 Πεδία αποθεματικού: {reserve_fields}")
        for field_name in reserve_fields:
            value = getattr(building, field_name, None)
            print(f"  {field_name}: {value}")
        
        # 5. TRANSACTION ANALYSIS
        print("\n🔍 5. ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ:")
        print("-" * 45)
        
        # Check if Transaction model exists and has data
        try:
            transactions = Transaction.objects.filter(
                apartment__building=building
            )
            print(f"Συναλλαγές: {transactions.count()}")
            
            if transactions.exists():
                print("\n📊 ΛΕΠΤΟΜΕΡΕΙΕΣ ΣΥΝΑΛΛΑΓΩΝ:")
                for i, trans in enumerate(transactions[:5]):  # Show first 5
                    print(f"  {i+1}. {trans.date}: {trans.amount}€ - {trans.apartment.number}")
        except Exception as e:
            print(f"❌ Σφάλμα με το Transaction model: {e}")
        
        # 6. CALCULATIONS FOR MODAL
        print("\n🔍 6. ΥΠΟΛΟΓΙΣΜΟΙ ΓΙΑ ΤΟ MODAL:")
        print("-" * 50)
        
        # Calculate total expenses
        total_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        # Calculate monthly expenses (assuming they're distributed)
        monthly_expenses = total_expenses / 12 if total_expenses > 0 else 0
        
        # Estimate management fee (10% of monthly expenses)
        estimated_management_fee = monthly_expenses * Decimal('0.10')
        
        # Estimate reserve fund (5% of monthly expenses)
        estimated_reserve_fund = monthly_expenses * Decimal('0.05')
        
        # Calculate common expenses (remaining 85%)
        common_expenses = monthly_expenses * Decimal('0.85')
        
        print(f"💰 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ: {total_expenses}€")
        print(f"📅 ΜΗΝΙΑΙΕΣ ΔΑΠΑΝΕΣ: {monthly_expenses:.2f}€")
        print(f"🏷️  ΕΚΤΙΜΩΜΕΝΟ ΚΟΣΤΟΣ ΔΙΑΧΕΙΡΙΣΗΣ: {estimated_management_fee:.2f}€")
        print(f"💰 ΕΚΤΙΜΩΜΕΝΟ ΑΠΟΘΕΜΑΤΙΚΟ: {estimated_reserve_fund:.2f}€")
        print(f"⚡ ΕΚΤΙΜΩΜΕΝΕΣ ΚΟΙΝΕΣ ΔΑΠΑΝΕΣ: {common_expenses:.2f}€")
        
        # 7. COMPARISON WITH USER'S EXPECTED VALUES
        print("\n🔍 7. ΣΥΓΚΡΙΣΗ ΜΕ ΤΙΣ ΑΠΑΙΤΗΣΕΙΣ:")
        print("-" * 55)
        
        expected_values = {
            'common': 200.00,
            'management': 80.00,
            'reserve': 1083.33,
            'previous_balance': 5000.00,
            'total': 6363.33
        }
        
        print("📋 ΑΠΑΙΤΟΥΜΕΝΑ ΠΟΣΑ:")
        print(f"  1. Λειτουργικές Δαπάνες: {expected_values['common']}€")
        print(f"  2. Κόστος διαχείρισης: {expected_values['management']}€")
        print(f"  3. Αποθεματικό Ταμείο: {expected_values['reserve']}€")
        print(f"  4. Παλαιότερες οφειλές: {expected_values['previous_balance']}€")
        print(f"  ΣΥΝΟΛΟ: {expected_values['total']}€")
        
        print("\n📊 ΣΥΓΚΡΙΣΗ:")
        print(f"  ✅ ΔΕΗ δαπάνη (παλαιότερες): {5000.00}€ vs {expected_values['previous_balance']}€")
        print(f"  ❓ Λειτουργικές: {common_expenses:.2f}€ vs {expected_values['common']}€")
        print(f"  ❓ Διαχείριση: {estimated_management_fee:.2f}€ vs {expected_values['management']}€")
        print(f"  ❓ Αποθεματικό: {estimated_reserve_fund:.2f}€ vs {expected_values['reserve']}€")
        
        # 8. RECOMMENDATIONS
        print("\n🔍 8. ΣΥΜΒΟΥΛΕΣ ΚΑΙ ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("-" * 60)
        
        print("✅ ΤΙ ΕΧΟΥΜΕ:")
        print("  - ΔΕΗ δαπάνη 5.000€ (παλαιότερες οφειλές)")
        print("  - ΔΕΗ δαπάνη 200€ (τρέχουσες)")
        print("  - Χιλιοστά συμμετοχής ανά διαμέρισμα")
        print("  - Ρυθμίσεις κτιρίου")
        
        print("\n❌ ΤΙ ΛΕΙΠΕΙ:")
        print("  - Λεπτομερής ανάλυση λειτουργικών δαπανών")
        print("  - Εξακριβισμένο κόστος διαχείρισης")
        print("  - Εξακριβισμένο αποθεματικό ταμείο")
        
        print("\n🚀 ΤΙ ΠΡΕΠΕΙ ΝΑ ΚΑΝΟΥΜΕ:")
        print("  1. Συνδέσουμε το modal με τα υπάρχοντα δεδομένα")
        print("  2. Εφαρμόσουμε fallback values για τα λειπόμενα")
        print("  3. Δημιουργήσουμε δυναμικό σύστημα ενημέρωσης")
        print("  4. Επιβεβαιώσουμε τα ποσά με τον χρήστη")

if __name__ == "__main__":
    comprehensive_financial_analysis()
