#!/usr/bin/env python3
"""
Script to debug the mismatch between current_balance and previous_balance calculations
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

def debug_balance_calculation_mismatch():
    """Debug the mismatch between current_balance and previous_balance"""
    
    with schema_context('demo'):
        print("=" * 80)
        print("🔍 ΕΡΕΥΝΑ ΑΣΥΜΦΩΝΙΑΣ ΥΠΟΛΟΓΙΣΜΟΥ ΥΠΟΛΟΙΠΟΥ")
        print("=" * 80)
        
        building_id = 1
        month = '2024-09'
        
        # Parse month
        year, mon = map(int, month.split('-'))
        month_start = date(year, mon, 1)
        if mon == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, mon + 1, 1)
        
        print(f"Μήνας: {month}")
        print(f"Αρχή μήνα: {month_start}")
        print(f"Τέλος μήνα: {end_date}")
        
        # Get service
        service = FinancialDashboardService(building_id)
        
        # Get apartment balances
        apartment_balances = service.get_apartment_balances(month)
        
        print(f"\n🏠 ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        for apartment in apartments:
            apt_data = next((a for a in apartment_balances if a['id'] == apartment.id), None)
            
            if apt_data:
                current_balance = apt_data.get('current_balance', 0)
                previous_balance = apt_data.get('previous_balance', 0)
                expense_share = apt_data.get('expense_share', 0)
                net_obligation = apt_data.get('net_obligation', 0)
                
                print(f"Διαμέρισμα {apartment.number}:")
                print(f"  current_balance: {current_balance:.2f} €")
                print(f"  previous_balance: {previous_balance:.2f} €")
                print(f"  expense_share: {expense_share:.2f} €")
                print(f"  net_obligation: {net_obligation:.2f} €")
                
                # Manual calculation
                manual_current = service._calculate_historical_balance(apartment, end_date)
                manual_previous = service._calculate_historical_balance(apartment, month_start)
                
                print(f"  Manual current (end_date): {manual_current:.2f} €")
                print(f"  Manual previous (month_start): {manual_previous:.2f} €")
                
                # Check if they match
                if abs(current_balance - manual_current) < 0.01:
                    print("  ✅ current_balance matches manual calculation")
                else:
                    print(f"  ❌ current_balance mismatch: {abs(current_balance - manual_current):.2f} €")
                
                if abs(previous_balance - manual_previous) < 0.01:
                    print("  ✅ previous_balance matches manual calculation")
                else:
                    print(f"  ❌ previous_balance mismatch: {abs(previous_balance - manual_previous):.2f} €")
                
                print()
        
        # Check the summary
        print(f"\n📊 ΑΝΑΛΥΣΗ SUMMARY:")
        print("-" * 50)
        
        summary = service.get_summary(month)
        print(f"Previous Obligations (summary): {summary.get('previous_obligations', 0):.2f} €")
        
        # Calculate total from apartment balances
        total_previous_from_apartments = sum(abs(apt.get('previous_balance', 0)) for apt in apartment_balances)
        print(f"Total Previous from Apartments: {total_previous_from_apartments:.2f} €")
        
        # Calculate total from current_balance (what frontend might be using)
        total_current_from_apartments = sum(abs(apt.get('current_balance', 0)) for apt in apartment_balances)
        print(f"Total Current from Apartments: {total_current_from_apartments:.2f} €")
        
        print(f"\n💰 ΣΥΓΚΡΙΣΗ:")
        print(f"Summary previous_obligations: {summary.get('previous_obligations', 0):.2f} €")
        print(f"Sum of apartment previous_balance: {total_previous_from_apartments:.2f} €")
        print(f"Sum of apartment current_balance: {total_current_from_apartments:.2f} €")
        
        if abs(summary.get('previous_obligations', 0) - total_previous_from_apartments) < 0.01:
            print("✅ Summary και apartment balances ταιριάζουν")
        else:
            print("❌ Summary και apartment balances ΔΕΝ ταιριάζουν")
        
        print("\n" + "=" * 80)
        print("📋 ΣΥΜΠΕΡΑΣΜΑ:")
        print("=" * 80)
        
        if total_current_from_apartments == 0:
            print("❌ ΠΡΟΒΛΗΜΑ: Όλα τα διαμερίσματα έχουν current_balance = 0,00 €")
            print("   Αυτό σημαίνει ότι το frontend βλέπει 0,00 € αντί για 650,00 €")
            print("   Το πρόβλημα είναι ότι το current_balance υπολογίζεται με end_date")
            print("   που περιλαμβάνει όλες τις δαπάνες μέχρι το τέλος του μήνα")
        else:
            print("✅ Το current_balance δεν είναι 0,00 €")

if __name__ == "__main__":
    debug_balance_calculation_mismatch()
