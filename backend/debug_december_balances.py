#!/usr/bin/env python
"""
Debug Script - Ελέγχει γιατί οι οφειλές εξαφανίζονται τον Δεκέμβριο (Multi-tenant Aware)
"""

import os
import django
import sys
from decimal import Decimal
from datetime import date

# Setup Django
sys.path.insert(0, '/app') # Railway path
sys.path.insert(0, '/home/theo/project/backend') # Local path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment, MonthlyBalance
from financial.balance_service import BalanceCalculationService
from financial.services import FinancialDashboardService

def debug_tenant(tenant):
    print(f"\n🔍 Analyzing Tenant: {tenant.name} (Schema: {tenant.schema_name})")
    
    with schema_context(tenant.schema_name):
        building = Building.objects.first()
        if not building:
            print("   ❌ Δεν βρέθηκε building!")
            return

        print(f"   🏢 Building: {building.name} (ID: {building.id})")
        print(f"      Financial System Start Date: {building.financial_system_start_date}")
        
        if not building.financial_system_start_date:
             print("      ❌ ΠΡΟΒΛΗΜΑ: Λείπει το start date! Το BalanceCalculationService θα επιστρέφει 0.")

        # Βρες το πρώτο διαμέρισμα (Α1)
        apartment = building.apartments.first()
        if not apartment:
            print("   ❌ Δεν βρέθηκε διαμέρισμα!")
            return

        print(f"   🏠 Apartment: {apartment.number}")
        
        # Έλεγχος δαπανών Νοεμβρίου
        nov_expenses = Expense.objects.filter(
            building=building,
            date__gte=date(2025, 11, 1),
            date__lt=date(2025, 12, 1)
        )
        print(f"      Δαπάνες Νοεμβρίου: {nov_expenses.count()}")

        # Έλεγχος MonthlyBalance records
        monthly_balances = MonthlyBalance.objects.filter(building=building).order_by('year', 'month')
        
        mb_nov = monthly_balances.filter(year=2025, month=11).first()
        mb_dec = monthly_balances.filter(year=2025, month=12).first()
        
        if mb_nov:
            print(f"      📅 Nov 2025: Closed={mb_nov.is_closed}, CarryFwd={mb_nov.carry_forward}")
        else:
            print(f"      📅 Nov 2025: ❌ MISSING")
            
        if mb_dec:
            print(f"      📅 Dec 2025: PrevOblig={mb_dec.previous_obligations}")
        else:
            print(f"      📅 Dec 2025: ❌ MISSING (Αυτό είναι το πρόβλημα!)")
            
        # Υπολογισμός Balance
        try:
            previous_balance = BalanceCalculationService.calculate_historical_balance(
                apartment,
                date(2025, 12, 1),
                include_management_fees=True,
                include_reserve_fund=True
            )
            print(f"      💰 Calculated Previous Balance (Dec 1st): €{previous_balance:.2f}")
        except Exception as e:
            print(f"      ❌ ERROR calculating balance: {e}")

def debug_december_balances():
    print("\n" + "="*80)
    print("DEBUG: ΕΞΑΦΑΝΙΣΗ ΟΦΕΙΛΩΝ ΔΕΚΕΜΒΡΙΟΥ (MULTI-TENANT)")
    print("="*80)
    
    tenants = Client.objects.all()
    print(f"Found {tenants.count()} tenants.")
    
    for tenant in tenants:
        if tenant.schema_name == 'public':
            continue
        try:
            debug_tenant(tenant)
        except Exception as e:
            print(f"❌ Error debugging tenant {tenant.name}: {e}")

if __name__ == '__main__':
    debug_december_balances()
