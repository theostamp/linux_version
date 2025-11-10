#!/usr/bin/env python3
"""
Script to check what reserve fund data the users have actually entered
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def check_user_reserve_data():
    """Check what reserve fund data the users have actually entered"""
    
    with schema_context('demo'):
        buildings = Building.objects.all()
        
        print("🔍 Checking reserve fund data for all buildings...")
        print("-" * 80)
        
        for building in buildings:
            goal = float(building.reserve_fund_goal or 0)
            duration = building.reserve_fund_duration_months or 0
            monthly = goal / duration if duration > 0 else 0
            start_date = building.reserve_fund_start_date
            target_date = building.reserve_fund_target_date
            contribution_per_apt = float(building.reserve_contribution_per_apartment or 0)
            
            print(f"🏢 {building.name} (ID: {building.id})")
            print(f"   - Στόχος: {goal:.2f}€")
            print(f"   - Διάρκεια: {duration} μήνες")
            print(f"   - Μηνιαία δόση: {monthly:.2f}€")
            print(f"   - Εισφορά ανά διαμέρισμα: {contribution_per_apt:.2f}€")
            print(f"   - Ημερομηνία έναρξης: {start_date or 'Δεν έχει οριστεί'}")
            print(f"   - Ημερομηνία ολοκλήρωσης: {target_date or 'Δεν έχει οριστεί'}")
            
            if goal > 0 and duration > 0:
                print(f"   - Πρόοδος: {monthly * duration:.2f}€ από {goal:.2f}€")
            
            print()

if __name__ == '__main__':
    check_user_reserve_data()
