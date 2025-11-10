#!/usr/bin/env python3
"""
Script για έλεγχο υπολογισμού monthly_due
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.serializers import PaymentSerializer
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from datetime import datetime

def debug_monthly_due_calculation():
    """Έλεγχος υπολογισμού monthly_due για διαμέρισμα 3"""
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ MONTHLY_DUE")
        print("=" * 60)
        
        # 1. Βάση δεδομένων κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Δαπάνες διαχείρισης ανά διαμέρισμα: {building.management_fee_per_apartment}€")
        print(f"🏦 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months} μήνες")
        print()
        
        # 2. Διαμέρισμα 3
        apartment = Apartment.objects.get(id=3)
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
        print(f"📊 Χιλιοστά συμμετοχής: {apartment.participation_mills}")
        print(f"💳 Τρέχον υπόλοιπο: {apartment.current_balance}€")
        print()
        
        # 3. Υπολογισμός αποθεματικού
        print("🏦 ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            apartment_reserve_share = (monthly_target * apartment.participation_mills) / 1000
            print(f"📊 Μηνιαίος στόχος: {monthly_target}€")
            print(f"📊 Μερίδιο διαμερίσματος: {apartment_reserve_share}€")
        else:
            apartment_reserve_share = Decimal('0.00')
            print("❌ Δεν έχει ρυθμιστεί αποθεματικό")
        print()
        
        # 4. Υπολογισμός διαχείρισης
        print("💰 ΥΠΟΛΟΓΙΣΜΟΣ ΔΙΑΧΕΙΡΙΣΗΣ")
        management_fee = building.management_fee_per_apartment or Decimal('0.00')
        print(f"💰 Δαπάνες διαχείρισης ανά διαμέρισμα: {management_fee}€")
        print()
        
        # 5. Συνολικό monthly_due
        print("📋 ΣΥΝΟΛΙΚΟ MONTHLY_DUE")
        total_monthly_due = apartment_reserve_share + management_fee
        print(f"🏦 Αποθεματικό: {apartment_reserve_share}€")
        print(f"💰 Διαχείριση: {management_fee}€")
        print(f"📊 ΣΥΝΟΛΟ: {total_monthly_due}€")
        print()
        
        # 6. Έλεγχος PaymentSerializer
        print("🔧 ΕΛΕΓΧΟΣ PAYMENTSERIALIZER")
        payments = Payment.objects.filter(apartment=apartment)
        if payments.exists():
            payment = payments.first()
            serializer = PaymentSerializer()
            monthly_due_from_serializer = serializer.get_monthly_due(payment)
            print(f"📊 Monthly due από serializer: {monthly_due_from_serializer}€")
            
            if abs(monthly_due_from_serializer - float(total_monthly_due)) > 0.01:
                print(f"⚠️ ΔΙΑΦΟΡΑ: {monthly_due_from_serializer - float(total_monthly_due)}€")
            else:
                print("✅ Υπολογισμός σωστός")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές για το διαμέρισμα")
        print()
        
        # 7. Έλεγχος CommonExpenseCalculator
        print("🧮 ΕΛΕΓΧΟΣ COMMONEXPENSECALCULATOR")
        calculator = CommonExpenseCalculator(building.id)
        shares = calculator.calculate_shares()
        
        if apartment.id in shares:
            share_data = shares[apartment.id]
            print(f"📊 Total amount: {share_data['total_amount']}€")
            print(f"🏦 Reserve fund amount: {share_data['reserve_fund_amount']}€")
            print("💰 Management fee (από breakdown): ", end="")
            
            management_from_breakdown = Decimal('0.00')
            for item in share_data['breakdown']:
                if item['distribution_type'] == 'management_fee':
                    management_from_breakdown = item['apartment_share']
                    break
            
            print(f"{management_from_breakdown}€")
            
            total_from_calculator = share_data['total_amount'] + share_data['reserve_fund_amount']
            print(f"📊 ΣΥΝΟΛΟ από calculator: {total_from_calculator}€")
            
            if abs(float(total_from_calculator) - float(total_monthly_due)) > 0.01:
                print(f"⚠️ ΔΙΑΦΟΡΑ: {float(total_from_calculator) - float(total_monthly_due)}€")
            else:
                print("✅ Υπολογισμός σωστός")
        else:
            print("❌ Δεν βρέθηκε το διαμέρισμα στα shares")
        print()
        
        # 8. Έλεγχος τρέχουσων εξόδων
        print("📅 ΕΛΕΓΧΟΣ ΤΡΕΧΟΥΣΩΝ ΕΞΟΔΩΝ")
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        expenses = Expense.objects.filter(
            building_id=building.id,
            date__year=current_year,
            date__month=current_month
        )
        
        total_expenses = sum(exp.amount for exp in expenses)
        print(f"📊 Συνολικές δαπάνες τρέχοντος μήνα: {total_expenses}€")
        
        if total_expenses > 0:
            apartments = Apartment.objects.filter(building_id=building.id)
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            
            if total_mills > 0:
                apartment_share = (total_expenses * apartment.participation_mills) / total_mills
                print(f"📊 Μερίδιο διαμερίσματος σε δαπάνες: {apartment_share}€")
            else:
                print("❌ Δεν υπάρχουν χιλιοστά συμμετοχής")
        else:
            print("✅ Δεν υπάρχουν δαπάνες για τον τρέχοντα μήνα")
        
        print("\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    debug_monthly_due_calculation()
