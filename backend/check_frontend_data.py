#!/usr/bin/env python3
"""
Script to check what data the frontend receives from the API
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
from apartments.models import Apartment
from buildings.models import Building

def check_frontend_data():
    """Check what data the frontend receives from the API"""
    
    with schema_context('demo'):
        # Get the Alkmanos building
        building = Building.objects.get(id=4)  # Αλκμάνος 22, Αθήνα 115 28
        apartment_5 = Apartment.objects.get(building=building, number='5')
        
        print(f"🏢 Building: {building.name}")
        print(f"💰 Reserve Contribution per Apartment: {building.reserve_contribution_per_apartment}€")
        print(f"🏠 Apartment 5: {apartment_5.number}")
        print(f"📊 Participation Mills: {apartment_5.participation_mills}")
        
        # Calculate reserve fund amount
        if apartment_5.participation_mills and building.reserve_contribution_per_apartment:
            reserve_amount = float(apartment_5.participation_mills / 1000) * float(building.reserve_contribution_per_apartment)
            print("🧮 Reserve Fund Calculation:")
            print(f"   ({apartment_5.participation_mills} / 1000) × {building.reserve_contribution_per_apartment}€ = {reserve_amount:.2f}€")
            print(f"   {apartment_5.participation_mills / 1000} × {building.reserve_contribution_per_apartment}€ = {reserve_amount:.2f}€")
        
        # Check if there's a different reserve contribution value
        print("\n🔍 Checking for different reserve contribution values:")
        print(f"   Building.reserve_contribution_per_apartment: {building.reserve_contribution_per_apartment}€")
        
        # Check if there's a hardcoded value in the frontend
        print("\n💡 Frontend might be using hardcoded value instead of building data")
        print(f"   Expected: {building.reserve_contribution_per_apartment}€")
        print("   If frontend uses 5€: (105 / 1000) × 5€ = 0.53€ ✅")
        print("   If frontend uses 6€: (105 / 1000) × 6€ = 0.63€")
        print("   If frontend uses 4€: (105 / 1000) × 4€ = 0.42€")

if __name__ == "__main__":
    check_frontend_data()
