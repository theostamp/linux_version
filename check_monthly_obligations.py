#!/usr/bin/env python3

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def check_monthly_obligations():
    """Check how monthly obligations are calculated for August 2025"""
    
    with schema_context('demo'):
        from apartments.models import Apartment, Building
        from financial.models import Payment, Expense
        from financial.services import CommonExpenseCalculator
        
        print("🔍 Έλεγχος Μηνιαίων Υποχρεώσεων Αυγούστου 2025")
        print("=" * 60)
        
        # Get building 1 (Αραχώβης)
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.address}")
        
        # Get all apartments
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        
        print()
        print("💰 ΑΝΑΛΥΣΗ ΜΗΝΙΑΙΩΝ ΥΠΟΧΡΕΩΣΕΩΝ:")
        print("-" * 40)
        
        # Management fees calculation
        management_fee_per_apartment = 12.00
        total_management_fees = apartments.count() * management_fee_per_apartment
        print(f"📋 Κόστος διαχείρισης:")
        print(f"   - Ανά διαμέρισμα: {management_fee_per_apartment}€")
        print(f"   - Σύνολο: {total_management_fees}€ ({apartments.count()} × {management_fee_per_apartment}€)")
        
        # Reserve fund calculation
        reserve_fund_per_apartment = 10.00
        total_reserve_fund = apartments.count() * reserve_fund_per_apartment
        print(f"🏦 Εισφορά αποθεματικού:")
        print(f"   - Ανά διαμέρισμα: {reserve_fund_per_apartment}€")
        print(f"   - Σύνολο: {total_reserve_fund}€ ({apartments.count()} × {reserve_fund_per_apartment}€)")
        
        # Total monthly obligations
        total_monthly_obligations = total_management_fees + total_reserve_fund
        obligation_per_apartment = total_monthly_obligations / apartments.count()
        
        print(f"💸 Συνολικές μηνιαίες υποχρεώσεις:")
        print(f"   - Σύνολο: {total_monthly_obligations}€")
        print(f"   - Ανά διαμέρισμα: {obligation_per_apartment}€")
        
        print()
        print("💳 ΑΝΑΛΥΣΗ ΠΛΗΡΩΜΩΝ ΑΥΓΟΥΣΤΟΥ:")
        print("-" * 40)
        
        # Get August 2025 payments
        august_payments = Payment.objects.filter(
            date__month=8,
            date__year=2025,
            apartment__building=building
        ).select_related('apartment')
        
        total_payments = 0
        apartments_paid = []
        
        for payment in august_payments:
            apartment = payment.apartment
            apartments_paid.append(apartment.id)
            total_payments += float(payment.amount)
            
            # Calculate what this apartment should owe
            expected_obligation = obligation_per_apartment
            actual_balance = float(payment.amount) - expected_obligation
            
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   - Πληρωμή: {payment.amount}€")
            print(f"   - Οφειλή: {expected_obligation}€")
            print(f"   - Πραγματικό υπόλοιπο: {actual_balance:+.2f}€ {'(Πιστωτικό)' if actual_balance > 0 else '(Χρεωστικό)' if actual_balance < 0 else '(Εξοφλημένο)'}")
        
        print()
        print("📊 ΣΥΓΚΕΝΤΡΩΤΙΚΑ ΣΤΟΙΧΕΙΑ:")
        print("-" * 30)
        print(f"✅ Διαμερίσματα που πλήρωσαν: {len(apartments_paid)}/{apartments.count()}")
        print(f"💰 Συνολικές πληρωμές: {total_payments}€")
        print(f"💸 Συνολικές υποχρεώσεις: {total_monthly_obligations}€")
        print(f"⚖️ Διαφορά: {total_payments - total_monthly_obligations:+.2f}€")
        
        coverage_percentage = (total_payments / total_monthly_obligations) * 100
        print(f"📈 Κάλυψη υποχρεώσεων: {coverage_percentage:.1f}%")
        
        print()
        print("🔍 ΔΙΑΜΕΡΙΣΜΑΤΑ ΠΟΥ ΔΕΝ ΠΛΗΡΩΣΑΝ:")
        print("-" * 35)
        
        unpaid_apartments = apartments.exclude(id__in=apartments_paid)
        for apartment in unpaid_apartments:
            print(f"❌ Διαμέρισμα {apartment.number}: Οφείλει {obligation_per_apartment}€")
        
        print()
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 20)
        
        if total_payments < total_monthly_obligations:
            deficit = total_monthly_obligations - total_payments
            print(f"🚨 Έλλειμμα: {deficit}€")
            print("📝 Το κτίριο έχει αρνητικό υπόλοιπο γιατί δεν έχουν πληρώσει όλα τα διαμερίσματα")
        elif total_payments > total_monthly_obligations:
            surplus = total_payments - total_monthly_obligations
            print(f"✅ Πλεόνασμα: {surplus}€")
            print("📝 Το κτίριο έχει θετικό υπόλοιπο")
        else:
            print("⚖️ Ισοσκελισμένο - πληρωμές ίσες με υποχρεώσεις")

if __name__ == "__main__":
    check_monthly_obligations()
