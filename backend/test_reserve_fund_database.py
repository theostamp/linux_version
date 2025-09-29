#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to verify reserve fund data in the database
Checks building settings, financial calculations, and data consistency
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from financial.models import Transaction, Expense
from financial.services import FinancialDashboardService

def test_reserve_fund_database():
    """
    Test reserve fund data in the database
    """
    print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΣΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 60)
    
    # Get all tenants
    tenants = Client.objects.all()
    print(f"📊 Βρέθηκαν {tenants.count()} tenants στη βάση δεδομένων")
    
    for tenant in tenants:
        # Skip public schema
        if tenant.schema_name == 'public':
            print(f"\n🏢 TENANT: {tenant.name} (schema: {tenant.schema_name}) - SKIPPING (public schema)")
            continue
            
        print(f"\n🏢 TENANT: {tenant.name} (schema: {tenant.schema_name})")
        print("-" * 50)
        
        # Use tenant context
        with tenant_context(tenant):
            # Get all buildings for this tenant
            buildings = Building.objects.all()
            print(f"   📋 Βρέθηκαν {buildings.count()} κτίρια για αυτόν τον tenant")
            
            for building in buildings:
                print(f"\n   🏢 ΚΤΙΡΙΟ: {building.name}")
                print("   " + "-" * 40)
                
                # Check building reserve fund settings
                print("      📋 Ρυθμίσεις Κτιρίου:")
                print(f"         • name: {building.name}")
                print(f"         • apartments_count: {building.apartments_count}")
                print(f"         • current_reserve: {building.current_reserve or 'Not set'}")
                
                # Check if reserve fund fields exist
                if hasattr(building, 'reserve_fund_goal'):
                    print(f"         • reserve_fund_goal: {building.reserve_fund_goal or 'Not set'}")
                else:
                    print("         • reserve_fund_goal: Field does not exist")
                    
                if hasattr(building, 'reserve_fund_duration_months'):
                    print(f"         • reserve_fund_duration_months: {building.reserve_fund_duration_months or 'Not set'}")
                else:
                    print("         • reserve_fund_duration_months: Field does not exist")
                    
                if hasattr(building, 'reserve_contribution_per_apartment'):
                    print(f"         • reserve_contribution_per_apartment: {building.reserve_contribution_per_apartment or 'Not set'}")
                else:
                    print("         • reserve_contribution_per_apartment: Field does not exist")
                
                # Calculate expected monthly target if fields exist
                if hasattr(building, 'reserve_fund_goal') and hasattr(building, 'reserve_fund_duration_months'):
                    if building.reserve_fund_goal and building.reserve_fund_duration_months:
                        expected_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
                        print(f"         • Expected monthly target: {expected_monthly:.2f}€")
                    else:
                        print("         • Expected monthly target: Cannot calculate (missing goal or duration)")
                else:
                    print("         • Expected monthly target: Cannot calculate (fields do not exist)")
                
                # Check apartments count
                apartments_count = building.apartments.count()
                print(f"      🏠 Διαμερίσματα: {apartments_count}")
                
                # Check financial dashboard service
                try:
                    service = FinancialDashboardService(building.id)
                    summary = service.get_summary()
                    
                    print("      💰 Financial Dashboard Summary:")
                    print(f"         • current_reserve: {summary.get('current_reserve', 'N/A')}€")
                    print(f"         • reserve_fund_goal: {summary.get('reserve_fund_goal', 'N/A')}€")
                    print(f"         • reserve_fund_contribution: {summary.get('reserve_fund_contribution', 'N/A')}€")
                    print(f"         • reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target', 'N/A')}€")
                    print(f"         • reserve_fund_duration_months: {summary.get('reserve_fund_duration_months', 'N/A')}")
                    
                    # Check if monthly target calculation is correct
                    api_monthly = summary.get('reserve_fund_monthly_target', 0)
                    if hasattr(building, 'reserve_fund_goal') and hasattr(building, 'reserve_fund_duration_months'):
                        if building.reserve_fund_goal and building.reserve_fund_duration_months:
                            expected_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                            if abs(api_monthly - expected_monthly) < 0.01:
                                print("         ✅ Monthly target calculation: CORRECT")
                            else:
                                print("         ❌ Monthly target calculation: WRONG")
                                print(f"            Expected: {expected_monthly:.2f}€, Got: {api_monthly:.2f}€")
                        else:
                            print("         ⚠️  Monthly target calculation: Cannot verify (missing data)")
                    else:
                        print("         ⚠️  Monthly target calculation: Cannot verify (fields do not exist)")
                        
                except Exception as e:
                    print(f"      ❌ Error getting financial summary: {e}")
                    print("         This might be due to missing reserve fund fields in the Building model")
                
                # Check transactions related to reserve fund
                reserve_transactions = Transaction.objects.filter(
                    building=building,
                    type__in=['reserve_fund_contribution', 'reserve_fund_expense']
                ).order_by('-created_at')[:5]
                
                print(f"      📊 Πρόσφατες Συναλλαγές Αποθεματικού ({reserve_transactions.count()}):")
                for tx in reserve_transactions:
                    print(f"         • {tx.created_at.strftime('%Y-%m-%d')}: {tx.amount}€ ({tx.type})")
                
                # Check expenses for reserve fund
                reserve_expenses = Expense.objects.filter(
                    building=building,
                    category='reserve_fund'
                ).order_by('-created_at')[:3]
                
                print(f"      💸 Δαπάνες Αποθεματικού ({reserve_expenses.count()}):")
                for exp in reserve_expenses:
                    print(f"         • {exp.created_at.strftime('%Y-%m-%d')}: {exp.amount}€ - {exp.description}")
    
    print("\n✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
    print("=" * 60)

def check_specific_building(tenant_schema, building_id):
    """
    Check a specific building in detail
    """
    try:
        tenant = Client.objects.get(schema_name=tenant_schema)
        print(f"\n🔍 ΛΕΠΤΟΜΕΡΗΣ ΕΛΕΓΧΟΣ ΚΤΙΡΙΟΥ: {tenant.name} - Building ID: {building_id}")
        print("=" * 60)
        
        with tenant_context(tenant):
            building = Building.objects.get(id=building_id)
            
            # Check all building fields
            print("�� Όλα τα πεδία κτιρίου:")
            for field in building._meta.fields:
                value = getattr(building, field.name)
                print(f"   • {field.name}: {value}")
            
            # Check apartments
            apartments = building.apartments.all()
            print(f"\n🏠 Διαμερίσματα ({apartments.count()}):")
            for apt in apartments:
                print(f"   • {apt.number}: {apt.owner_name} ({apt.participation_mills} χιλιοστά)")
            
            # Check financial service
            service = FinancialDashboardService(building.id)
            summary = service.get_summary()
            
            print("\n💰 Financial Dashboard Summary:")
            for key, value in summary.items():
                print(f"   • {key}: {value}")
                
    except Client.DoesNotExist:
        print(f"❌ Tenant με schema {tenant_schema} δεν βρέθηκε")
    except Building.DoesNotExist:
        print(f"❌ Κτίριο με ID {building_id} δεν βρέθηκε")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    print("🚀 Εκκίνηση ελέγχου αποθεματικού στη βάση δεδομένων...")
    
    # Check if specific building ID provided
    if len(sys.argv) > 2:
        try:
            tenant_schema = sys.argv[1]
            building_id = int(sys.argv[2])
            check_specific_building(tenant_schema, building_id)
        except ValueError:
            print("❌ Λάθος building ID. Χρησιμοποιήστε: python script.py <tenant_schema> <building_id>")
    else:
        # Check all buildings
        test_reserve_fund_database()
