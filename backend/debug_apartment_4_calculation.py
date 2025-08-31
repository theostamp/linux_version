#!/usr/bin/env python3
"""
Debug script to understand how the 37.67€ value is calculated for apartment 4
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Apartment
from buildings.models import Building
from decimal import Decimal

def debug_apartment_4_calculation():
    """Debug how the 37.67€ value is calculated for apartment 4"""
    
    with schema_context('demo'):
        print("🔍 DEBUG APARTMENT 4 CALCULATION")
        print("=" * 60)
        
        # Get building and apartment 4
        building = Building.objects.get(id=1)
        apartment_4 = Apartment.objects.filter(building_id=building.id, number='4').first()
        
        if not apartment_4:
            print("❌ Δεν βρέθηκε το διαμέρισμα 4")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"🏠 Διαμέρισμα 4: {apartment_4.owner_name}")
        print(f"📊 Χιλιοστά: {apartment_4.participation_mills}")
        print()
        
        # Get all apartments for total mills calculation
        apartments = Apartment.objects.filter(building_id=building.id)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        apartments_count = apartments.count()
        
        print(f"📊 Συνολικά χιλιοστά: {total_mills}")
        print(f"🏠 Συνολικά διαμερίσματα: {apartments_count}")
        print()
        
        # Test with actual expenses
        expenses = Expense.objects.filter(building_id=building.id)
        
        print("📋 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        total_share = 0.0
        expense_details = []
        
        for expense in expenses:
            share_amount = 0.0
            
            if expense.distribution_type == 'by_participation_mills':
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            elif expense.distribution_type == 'equal_share':
                share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            
            total_share += share_amount
            expense_details.append({
                'title': expense.title,
                'amount': float(expense.amount),
                'share': share_amount,
                'type': expense.distribution_type
            })
            
            print(f"📄 {expense.title}: {expense.amount}€ → {share_amount}€ ({expense.distribution_type})")
        
        print(f"\n💰 ΣΥΝΟΛΙΚΟ ΜΕΡΙΔΙΟ ΔΑΠΑΝΩΝ: {total_share}€")
        
        # Check management fees
        management_fee = float(building.management_fee_per_apartment or 0)
        print(f"💼 Διαχειριστικά: {management_fee}€")
        
        # Check reserve fund contribution
        reserve_contribution = 0.0
        if building.reserve_fund_goal and building.reserve_fund_duration_months and total_mills > 0:
            monthly_reserve_total = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            reserve_contribution = round((monthly_reserve_total / total_mills) * (apartment_4.participation_mills or 0), 2)
        
        print(f"🏦 Αποθεματικό: {reserve_contribution}€")
        
        # Total calculation
        total_monthly_obligation = total_share + management_fee + reserve_contribution
        print(f"\n🎯 ΣΥΝΟΛΙΚΗ ΜΗΝΙΑΙΑ ΥΠΟΧΡΕΩΣΗ: {total_monthly_obligation}€")
        
        # Check if this matches 37.67
        if abs(total_monthly_obligation - 37.67) < 0.01:
            print("✅ Βρέθηκε η πηγή του 37.67€!")
        else:
            print(f"❌ Δεν ταιριάζει με το 37.67€ (διαφορά: {abs(total_monthly_obligation - 37.67):.2f}€)")
        
        # Try different combinations
        print(f"\n🔍 ΔΙΑΦΟΡΕΣ ΣΥΝΔΥΑΣΜΟΙ:")
        print(f"   • Μόνο δαπάνες: {total_share}€")
        print(f"   • Δαπάνες + διαχειριστικά: {total_share + management_fee}€")
        print(f"   • Δαπάνες + αποθεματικό: {total_share + reserve_contribution}€")
        print(f"   • Διαχειριστικά + αποθεματικό: {management_fee + reserve_contribution}€")
        
        # Check if there are any other expenses that might not be in the current month
        from datetime import datetime
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        current_month_expenses = expenses.filter(date__year=current_year, date__month=current_month)
        other_month_expenses = expenses.exclude(date__year=current_year, date__month=current_month)
        
        print(f"\n📅 ΕΝΑΛΛΑΓΤΙΚΕΣ ΔΙΑΔΡΟΜΕΣ:")
        print(f"   • Τρέχοντος μήνα δαπάνες: {current_month_expenses.count()}")
        print(f"   • Άλλων μηνών δαπάνες: {other_month_expenses.count()}")
        
        # Calculate with only current month expenses
        current_month_share = 0.0
        for expense in current_month_expenses:
            if expense.distribution_type == 'by_participation_mills':
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            elif expense.distribution_type == 'equal_share':
                share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            else:
                mills = apartment_4.participation_mills or 0
                if total_mills > 0:
                    share_amount = round(float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills)))), 2)
                else:
                    share_amount = round(float(expense.amount / Decimal(str(apartments_count))), 2)
            current_month_share += share_amount
        
        current_month_total = current_month_share + management_fee + reserve_contribution
        print(f"   • Τρέχοντος μήνα συνολικό: {current_month_total}€")
        
        print("\n✅ Διερεύνηση ολοκληρώθηκε!")

if __name__ == '__main__':
    debug_apartment_4_calculation()
