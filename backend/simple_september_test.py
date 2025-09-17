#!/usr/bin/env python3
"""
Simple test για τον Σεπτέμβριο
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance
from buildings.models import Building

with schema_context('demo'):
    print("=== Simple September Test ===")
    
    building = Building.objects.get(id=1)
    
    # Έλεγχος Αύγουστου 2025
    august_balance = MonthlyBalance.objects.filter(
        building=building,
        year=2025,
        month=8
    ).first()
    
    if august_balance:
        print(f"August 2025: carry_forward=€{august_balance.carry_forward}")
    else:
        print("No August 2025 MonthlyBalance found!")
    
    # Έλεγχος Σεπτεμβρίου 2025
    september_balance = MonthlyBalance.objects.filter(
        building=building,
        year=2025,
        month=9
    ).first()
    
    if september_balance:
        print(f"September 2025: previous_obligations=€{september_balance.previous_obligations}")
        print(f"September 2025: total_obligations=€{september_balance.total_obligations}")
    else:
        print("No September 2025 MonthlyBalance found!")
    
    print("\n=== API Test ===")
    import requests
    
    response = requests.get("http://localhost:8000/api/financial/dashboard/improved-summary/?building_id=1&month=2025-09")
    if response.status_code == 200:
        data = response.json()
        print(f"API previous_obligations: €{data.get('previous_obligations', 0)}")
        print(f"API management_fees: €{data.get('management_fees', 0)}")
        print(f"API reserve_fund_contribution: €{data.get('reserve_fund_contribution', 0)}")
        print(f"API total_obligations: €{data.get('total_obligations', 0)}")
    else:
        print(f"API error: {response.status_code}")


