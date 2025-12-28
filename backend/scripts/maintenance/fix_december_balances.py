#!/usr/bin/env python
"""
Διόρθωση Προβλήματος Εξαφάνισης Οφειλών Δεκεμβρίου (Multi-tenant Aware)

Λογική:
1. Itersate σε όλους τους Tenants
2. Μέσα σε κάθε Tenant schema:
    a. Ελέγχει αν το Building έχει financial_system_start_date
    b. Αν όχι, το ορίζει
    c. Ελέγχει αν υπάρχει MonthlyBalance για Δεκέμβριο
    d. Αν όχι, δημιουργεί με τη σωστή previous_obligations
"""

import os
import django
import sys
from datetime import date
from decimal import Decimal

# Setup Django
sys.path.insert(0, '/app') # Railway path
sys.path.insert(0, '/home/theo/project/backend') # Local path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from tenants.models import Client
from buildings.models import Building
from financial.models import Expense, MonthlyBalance
from financial.monthly_balance_service import MonthlyBalanceService

def fix_december_balances_for_tenant(tenant):
    print(f"\n🔍 Checking Tenant: {tenant.name} (Schema: {tenant.schema_name})")
    
    with schema_context(tenant.schema_name):
        buildings = Building.objects.all()
        if not buildings.exists():
            print("   No buildings found.")
            return 0

        fixed_count = 0
        for building in buildings:
            print(f"\n   🏢 Building: {building.name} (ID: {building.id})")
            has_issues = False
            
            # ΕΛΕΓΧΟΣ 1: financial_system_start_date
            if not building.financial_system_start_date:
                has_issues = True
                print(f"      ❌ Δεν έχει financial_system_start_date!")
                
                # Βρες την πρώτη δαπάνη
                first_expense = Expense.objects.filter(building=building).order_by('date').first()
                
                if first_expense:
                    start_date = first_expense.date.replace(day=1)
                    print(f"      🔧 Ορίζεται σε: {start_date} (βάσει πρώτης δαπάνης)")
                else:
                    # Default στον τρέχοντα μήνα
                    start_date = date.today().replace(day=1)
                    print(f"      🔧 Ορίζεται σε: {start_date} (default)")
                
                building.financial_system_start_date = start_date
                building.save()
                print(f"      ✅ Διορθώθηκε!")
            else:
                print(f"      ✅ financial_system_start_date: {building.financial_system_start_date}")
            
            # ΕΛΕΓΧΟΣ 2: MonthlyBalance για Δεκέμβριο 2025
            dec_balance = MonthlyBalance.objects.filter(
                building=building,
                year=2025,
                month=12
            ).first()
            
            if not dec_balance:
                # Έλεγξε αν υπάρχει Νοέμβριος
                nov_balance = MonthlyBalance.objects.filter(
                    building=building,
                    year=2025,
                    month=11
                ).first()
                
                if nov_balance:
                    has_issues = True
                    print(f"      ❌ Δεν υπάρχει MonthlyBalance για Δεκέμβριο!")
                    
                    if not nov_balance.is_closed:
                        print(f"      🔧 Κλείνεται ο Νοέμβριος...")
                        service = MonthlyBalanceService(building)
                        try:
                            nov_balance, dec_balance = service.close_month_and_create_next(2025, 11)
                            print(f"      ✅ Δεκέμβριος δημιουργήθηκε!")
                            print(f"         - Νοέμβριος carry_forward: €{nov_balance.carry_forward}")
                            print(f"         - Δεκέμβριος previous_obligations: €{dec_balance.previous_obligations}")
                        except Exception as e:
                            print(f"      ❌ ERROR: {e}")
                    else:
                        print(f"      ⚠️  Ο Νοέμβριος είναι κλειστός αλλά δεν υπάρχει Δεκέμβριος!")
                        print(f"         Carry forward: €{nov_balance.carry_forward}")
                        print(f"      🔧 Δημιουργείται ο Δεκέμβριος χειροκίνητα...")
                        
                        # Δημιουργία Δεκεμβρίου με previous_obligations από Νοέμβριο
                        dec_balance = MonthlyBalance.objects.create(
                            building=building,
                            year=2025,
                            month=12,
                            balance_year=2025,
                            previous_obligations=nov_balance.carry_forward,
                            carry_forward=nov_balance.carry_forward,
                            total_expenses=Decimal('0.00'),
                            total_payments=Decimal('0.00'),
                            reserve_fund_amount=Decimal('0.00'),
                            management_fees=Decimal('0.00'),
                            scheduled_maintenance_amount=Decimal('0.00'),
                            annual_carry_forward=Decimal('0.00'),
                            main_balance_carry_forward=Decimal('0.00'),
                            reserve_balance_carry_forward=Decimal('0.00'),
                            management_balance_carry_forward=Decimal('0.00'),
                        )
                        print(f"      ✅ Δεκέμβριος δημιουργήθηκε!")
                        print(f"         - Previous Obligations: €{dec_balance.previous_obligations}")
                else:
                    print(f"      ⚠️  Δεν υπάρχει ούτε Νοέμβριος - πιθανά νέο building")
            else:
                print(f"      ✅ MonthlyBalance Δεκεμβρίου υπάρχει")
                print(f"         - Previous Obligations: €{dec_balance.previous_obligations}")
            
            if has_issues:
                fixed_count += 1
                
        return fixed_count

def fix_december_balances():
    print("\n" + "="*80)
    print("ΔΙΟΡΘΩΣΗ ΕΞΑΦΑΝΙΣΗΣ ΟΦΕΙΛΩΝ ΔΕΚΕΜΒΡΙΟΥ (MULTI-TENANT)")
    print("="*80)
    
    tenants = Client.objects.all()
    total_tenants = tenants.count()
    total_fixed_buildings = 0
    
    print(f"Found {total_tenants} tenants.")
    
    for tenant in tenants:
        # Skip public schema usually, but check if your app uses it for buildings
        if tenant.schema_name == 'public':
            continue
            
        try:
            total_fixed_buildings += fix_december_balances_for_tenant(tenant)
        except Exception as e:
            print(f"❌ Error processing tenant {tenant.name}: {e}")
    
    # ΣΥΝΟΨΗ
    print("\n" + "="*80)
    print("ΣΥΝΟΨΗ")
    print("="*80)
    print(f"Σύνολο Tenants: {total_tenants}")
    print(f"Σύνολο Buildings που διορθώθηκαν: {total_fixed_buildings}")
    
    if total_fixed_buildings > 0:
        print(f"\n✅ Διορθώθηκαν {total_fixed_buildings} building(s)!")
        print("   Πήγαινε στο UI και έλεγξε αν εμφανίζονται οι οφειλές Δεκεμβρίου.")
    else:
        print("\n✅ Όλα τα buildings είναι εντάξει!")
    
    print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    fix_december_balances()
