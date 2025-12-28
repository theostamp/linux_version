#!/usr/bin/env python3
"""
Script για έλεγχο των Στόχος Αποθεματικού και Δαπάνες Διαχείρισης
Ελέγχει αν τα υπολογίσεις είναι σωστές και δεν έχουν hardcoded έτη
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense
from financial.services import CommonExpenseCalculator

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_reserve_fund():
    """Ελέγχει το Στόχος Αποθεματικού"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΣΤΟΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        current_year = datetime.now().year
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"💰 Reserve fund goal: {format_currency(building.reserve_fund_goal)}")
        print(f"📅 Reserve fund duration: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Reserve fund target date: {building.reserve_fund_target_date}")
        print(f"🎯 Reserve fund priority: {building.reserve_fund_priority}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"💰 Μηνιαίος στόχος: {format_currency(monthly_target)}")
        else:
            monthly_target = Decimal('0.00')
            print(f"💰 Μηνιαίος στόχος: {format_currency(monthly_target)} (δεν έχει οριστεί)")
        
        # Έλεγχος αν ο Οκτώβριος του τρέχοντος έτους ανήκει στο reserve fund timeline
        october_current = date(current_year, 10, 1)
        
        if building.reserve_fund_start_date and building.reserve_fund_target_date:
            in_timeline = building.reserve_fund_start_date <= october_current <= building.reserve_fund_target_date
            print(f"📅 Οκτώβριος {current_year} ανήκει στο timeline: {'Ναι' if in_timeline else 'Όχι'}")
            print(f"   Timeline: {building.reserve_fund_start_date} - {building.reserve_fund_target_date}")
        else:
            in_timeline = False
            print(f"📅 Οκτώβριος {current_year} ανήκει στο timeline: Όχι (δεν έχει οριστεί timeline)")
        
        # Υπολογισμός συνολικού reserve fund contribution
        if in_timeline and monthly_target > 0:
            total_reserve_contribution = monthly_target
            print(f"💰 Συνολικό reserve fund contribution: {format_currency(total_reserve_contribution)}")
        else:
            total_reserve_contribution = Decimal('0.00')
            print(f"💰 Συνολικό reserve fund contribution: {format_currency(total_reserve_contribution)} (δεν εφαρμόζεται)")
        
        return {
            'reserve_fund_goal': building.reserve_fund_goal,
            'reserve_fund_duration_months': building.reserve_fund_duration_months,
            'monthly_target': monthly_target,
            'in_timeline': in_timeline,
            'total_reserve_contribution': total_reserve_contribution
        }

def check_management_fees():
    """Ελέγχει τις Δαπάνες Διαχείρισης"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building)
        current_year = datetime.now().year
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"💼 Management fee per apartment: {format_currency(building.management_fee_per_apartment)}")
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Υπολογισμός συνολικού management fee
        if building.management_fee_per_apartment and apartments.count() > 0:
            total_management_fee = building.management_fee_per_apartment * apartments.count()
            print(f"💰 Συνολικό management fee: {format_currency(total_management_fee)}")
        else:
            total_management_fee = Decimal('0.00')
            print(f"💰 Συνολικό management fee: {format_currency(total_management_fee)} (δεν έχει οριστεί)")
        
        # Έλεγχος management fees expenses για το τρέχον έτος
        management_expenses_current = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=current_year
        ).order_by('date')
        
        print(f"\n📊 MANAGEMENT FEES EXPENSES {current_year}:")
        print(f"Αριθμός expenses: {management_expenses_current.count()}")
        
        total_management_expenses = Decimal('0.00')
        for expense in management_expenses_current:
            print(f"  - {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f}")
            total_management_expenses += expense.amount
        
        print(f"Συνολικό ποσό expenses {current_year}: €{total_management_expenses:.2f}")
        
        return {
            'management_fee_per_apartment': building.management_fee_per_apartment,
            'apartments_count': apartments.count(),
            'total_management_fee': total_management_fee,
            'management_expenses_count': management_expenses_current.count(),
            'total_management_expenses': total_management_expenses
        }

def check_combined_calculation():
    """Ελέγχει τον συνδυασμό αποθεματικού και management fees"""
    print("\n" + "=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ ΣΥΝΔΥΑΣΜΟΥ ΥΠΟΛΟΓΙΣΜΟΥ")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # Έλεγχος με τον CommonExpenseCalculator για τον τρέχοντα μήνα
        month_str = f"{current_year}-{current_month:02d}"
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΜΕ CommonExpenseCalculator για {month_str}:")
        
        try:
            calculator = CommonExpenseCalculator(building.id, month_str)
            shares_data = calculator.calculate_shares(include_reserve_fund=True)
            
            print(f"   Σύνολο δαπανών: {format_currency(shares_data.get('total_expenses', 0))}")
            print(f"   Reserve fund contribution: {format_currency(shares_data.get('reserve_fund_contribution', 0))}")
            print(f"   Management fees: {format_currency(shares_data.get('management_fees', 0))}")
            print(f"   Αριθμός διαμερισμάτων: {shares_data.get('apartments_count', 0)}")
            
            # Έλεγχος αν οι υπολογισμοί είναι συνεπείς
            expected_total = (shares_data.get('reserve_fund_contribution', 0) + 
                            shares_data.get('management_fees', 0))
            actual_total = shares_data.get('total_expenses', 0)
            
            print(f"\n📊 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ:")
            print(f"   Αναμενόμενο σύνολο (reserve + management): {format_currency(expected_total)}")
            print(f"   Πραγματικό σύνολο: {format_currency(actual_total)}")
            
            if abs(expected_total - actual_total) < Decimal('0.01'):
                print(f"   ✅ Οι υπολογισμοί είναι συνεπείς!")
            else:
                print(f"   ⚠️  Υπάρχει διαφορά: {format_currency(abs(expected_total - actual_total))}")
            
        except Exception as e:
            print(f"   ❌ Σφάλμα στον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ ΣΤΟΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΚΑΙ ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ")
    print("=" * 80)
    
    try:
        # Έλεγχος αποθεματικού
        reserve_result = check_reserve_fund()
        
        # Έλεγχος management fees
        management_result = check_management_fees()
        
        # Έλεγχος συνδυασμού
        check_combined_calculation()
        
        print(f"\n📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print(f"   Reserve fund contribution: {format_currency(reserve_result['total_reserve_contribution'])}")
        print(f"   Management fees: {format_currency(management_result['total_management_fee'])}")
        print(f"   Σύνολο: {format_currency(reserve_result['total_reserve_contribution'] + management_result['total_management_fee'])}")
        
        print(f"\n✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
