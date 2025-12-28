#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to update existing buildings with reserve fund goals
"""

import os
import django
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building

def update_reserve_fund_goals():
    """
    Update existing buildings with reserve fund goals
    """
    print("🚀 Ενημέρωση στόχων αποθεματικού για υπάρχοντα κτίρια...")
    
    # Get all tenants
    tenants = Client.objects.all()
    
    for tenant in tenants:
        if tenant.schema_name == 'public':
            continue
            
        print(f"\n🏢 TENANT: {tenant.name} (schema: {tenant.schema_name})")
        print("-" * 50)
        
        with tenant_context(tenant):
            buildings = Building.objects.all()
            
            for building in buildings:
                print(f"\n   🏢 ΚΤΙΡΙΟ: {building.name}")
                
                # Set reserve fund goal based on building characteristics
                apartments_count = building.apartments.count()
                
                if apartments_count > 0:
                    # Calculate goal: 1000€ per apartment
                    goal = apartments_count * 1000
                    
                    # Set duration: 12 months
                    duration_months = 12
                    
                    # Calculate start and target dates
                    start_date = date(2025, 8, 1)  # August 2025
                    target_date = start_date + timedelta(days=365)  # 1 year later
                    
                    # Update building
                    building.reserve_fund_goal = Decimal(str(goal))
                    building.reserve_fund_duration_months = duration_months
                    building.reserve_fund_start_date = start_date
                    building.reserve_fund_target_date = target_date
                    building.save()
                    
                    # Calculate monthly target
                    monthly_target = goal / duration_months
                    
                    print("      ✅ Ενημερώθηκε:")
                    print(f"         • Στόχος: {goal}€")
                    print(f"         • Διάρκεια: {duration_months} μήνες")
                    print(f"         • Μηνιαία δόση: {monthly_target:.2f}€")
                    print(f"         • Έναρξη: {start_date}")
                    print(f"         • Λήξη: {target_date}")
                else:
                    print("      ⚠️  Δεν έχει διαμερίσματα - παραλείπεται")
    
    print("\n✅ ΕΝΗΜΕΡΩΣΗ ΟΛΟΚΛΗΡΩΘΗΚΕ")

if __name__ == "__main__":
    update_reserve_fund_goals()
