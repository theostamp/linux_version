#!/usr/bin/env python3
"""
Script για debugging των οικονομικών υπολογισμών
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment, Transaction
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum

def debug_financial_calculations():
    """Ελέγχει τους υπολογισμούς των οικονομικών δεδομένων"""
    
    with schema_context('demo'):
        building_id = 1  # Αραχώβης 12
        
        print("🔍 DEBUGGING ΟΙΚΟΝΟΜΙΚΩΝ ΥΠΟΛΟΓΙΣΜΩΝ")
        print("=" * 50)
        
        # 1. Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building_id=building_id)
        print(f"📊 Διαμερίσματα: {apartments.count()}")
        
        # 2. Ελέγχος υπόλοιπων διαμερισμάτων
        total_apartment_balance = sum(apt.current_balance or Decimal('0.00') for apt in apartments)
        negative_balances = sum(abs(apt.current_balance) for apt in apartments if apt.current_balance and apt.current_balance < 0)
        
        print(f"💰 Συνολικό υπόλοιπο διαμερισμάτων: {total_apartment_balance}")
        print(f"💸 Αρνητικά υπόλοιπα (οφειλές): {negative_balances}")
        
        # 3. Ελέγχος δαπανών
        total_expenses = Expense.objects.filter(building_id=building_id).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"💳 Συνολικές δαπάνες: {total_expenses}")
        
        # 4. Ελέγχος πληρωμών
        total_payments = Payment.objects.filter(apartment__building_id=building_id).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"💵 Συνολικές πληρωμές: {total_payments}")
        
        # 5. Ελέγχος διαχείρισης
        building = Building.objects.get(id=building_id)
        management_fee = building.management_fee_per_apartment or Decimal('0.00')
        total_management_cost = management_fee * apartments.count()
        print(f"🏢 Αμοιβή διαχείρισης ανά διαμέρισμα: {management_fee}")
        print(f"🏢 Συνολικό κόστος διαχείρισης: {total_management_cost}")
        
        # 6. Υπολογισμός τρέχοντος ταμείου
        current_reserve = total_payments - total_expenses - total_management_cost
        print(f"💼 Τρέχον ταμείο (πληρωμές - δαπάνες - διαχείριση): {current_reserve}")
        
        # 7. Ελέγχος αποθεματικού
        reserve_goal = building.reserve_fund_goal or Decimal('0.00')
        reserve_duration = building.reserve_fund_duration_months or 1
        monthly_target = reserve_goal / reserve_duration
        print(f"🎯 Στόχος αποθεματικού: {reserve_goal}")
        print(f"📅 Διάρκεια: {reserve_duration} μήνες")
        print(f"📊 Μηνιαίος στόχος: {monthly_target}")
        
        # 8. Ελέγχος τρέχοντος αποθεματικού
        current_reserve_from_building = building.current_reserve or Decimal('0.00')
        print(f"💼 Τρέχον αποθεματικό (από building): {current_reserve_from_building}")
        
        # 9. Υπολογισμός συνολικού υπολοίπου
        total_balance = current_reserve
        print(f"📈 Συνολικό υπόλοιπο: {total_balance}")
        
        # 10. Υπολογισμός τρέχουσων υποχρεώσεων
        # Για τρέχουσα προβολή: οφειλές + διαχείριση
        current_obligations = negative_balances + total_management_cost
        print(f"📋 Τρέχουσες υποχρεώσεις (οφειλές + διαχείριση): {current_obligations}")
        
        # 11. Ελέγχος API υπολογισμών
        print("\n🔍 ΕΛΕΓΧΟΣ API ΥΠΟΛΟΓΙΣΜΩΝ")
        print("-" * 30)
        
        from financial.services import FinancialDashboardService
        service = FinancialDashboardService(building_id)
        summary = service.get_summary()
        
        print(f"API total_balance: {summary['total_balance']}")
        print(f"API current_obligations: {summary['current_obligations']}")
        print(f"API current_reserve: {summary['current_reserve']}")
        print(f"API average_monthly_expenses: {summary['average_monthly_expenses']}")
        print(f"API total_management_cost: {summary['total_management_cost']}")
        
        # 12. Σύγκριση
        print("\n📊 ΣΥΓΚΡΙΣΗ ΥΠΟΛΟΓΙΣΜΩΝ")
        print("-" * 30)
        print(f"Script total_balance: {total_balance}")
        print(f"API total_balance: {summary['total_balance']}")
        print(f"Διαφορά: {abs(float(total_balance) - summary['total_balance'])}")
        
        print(f"Script current_obligations: {current_obligations}")
        print(f"API current_obligations: {summary['current_obligations']}")
        print(f"Διαφορά: {abs(float(current_obligations) - summary['current_obligations'])}")
        
        print(f"Script current_reserve: {current_reserve}")
        print(f"API current_reserve: {summary['current_reserve']}")
        print(f"Διαφορά: {abs(float(current_reserve) - summary['current_reserve'])}")
        
        # 13. Ελέγχος για μηνιαία προβολή
        print("\n📅 ΕΛΕΓΧΟΣ ΜΗΝΙΑΙΑΣ ΠΡΟΒΟΛΗΣ")
        print("-" * 30)
        
        # Τρέχων μήνας
        from datetime import datetime
        current_month = datetime.now().strftime('%Y-%m')
        monthly_summary = service.get_summary(current_month)
        
        print(f"Μήνας: {current_month}")
        print(f"Monthly total_balance: {monthly_summary['total_balance']}")
        print(f"Monthly current_obligations: {monthly_summary['current_obligations']}")
        print(f"Monthly average_monthly_expenses: {monthly_summary['average_monthly_expenses']}")
        print(f"Monthly total_expenses_month: {monthly_summary['total_expenses_month']}")
        print(f"Monthly total_payments_month: {monthly_summary['total_payments_month']}")

if __name__ == "__main__":
    debug_financial_calculations()
