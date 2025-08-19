#!/usr/bin/env python3
"""
Script to check participation mills for apartment 5
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

def check_apartment_mills():
    """Check participation mills for apartment 5"""
    
    with schema_context('demo'):
        # Get apartment 5
        apartment = Apartment.objects.get(id=5)
        print(f"🔍 Looking for apartment ID: 5")
        print(f"🔍 Found apartment: {apartment.number} in building: {apartment.building.name}")
        
        # Let's also check the Alkmanos building
        alkmanos_buildings = Building.objects.filter(name__icontains='Αλκμάνος')
        print(f"🔍 Found {alkmanos_buildings.count()} Alkmanos buildings:")
        for b in alkmanos_buildings:
            print(f"  - ID {b.id}: {b.name}")
        
        # Use the first Alkmanos building (should be the main one)
        alkmanos_building = alkmanos_buildings.first()
        print(f"🔍 Using Alkmanos building ID: {alkmanos_building.id}")
        
        # Get apartments from Alkmanos building
        alkmanos_apartments = Apartment.objects.filter(building=alkmanos_building)
        print(f"🔍 Alkmanos apartments: {[apt.number for apt in alkmanos_apartments]}")
        
        # Use the apartment from Alkmanos building instead
        apartment = alkmanos_apartments.first()  # Get first apartment from Alkmanos
        if not apartment:
            print("❌ No apartments found in Alkmanos building")
            return
        building = apartment.building
        
        print(f"🏢 Building: {building.name}")
        print(f"🏠 Apartment: {apartment.number}")
        print(f"👤 Owner: {apartment.owner_name}")
        print(f"👤 Tenant: {apartment.tenant_name}")
        print(f"📊 Participation Mills: {apartment.participation_mills}")
        print(f"💰 Reserve Contribution per Apartment: {building.reserve_contribution_per_apartment}€")
        
        # Calculate expected reserve fund amount
        if apartment.participation_mills and building.reserve_contribution_per_apartment:
            expected_reserve = float(apartment.participation_mills / 1000) * float(building.reserve_contribution_per_apartment)
            print(f"🧮 Expected Reserve Fund: ({apartment.participation_mills} / 1000) × {building.reserve_contribution_per_apartment}€ = {expected_reserve:.2f}€")
        else:
            print("⚠️ Missing participation_mills or reserve_contribution_per_apartment")
        
        # Check all apartments for comparison
        print(f"\n📋 All Apartments in Building:")
        all_apartments = Apartment.objects.filter(building=building).order_by('number')
        total_mills = 0
        
        for apt in all_apartments:
            mills = apt.participation_mills or 0
            total_mills += mills
            reserve_amount = float(mills / 1000) * float(building.reserve_contribution_per_apartment) if building.reserve_contribution_per_apartment else 0
            print(f"  {apt.number}: {mills} mills → {reserve_amount:.2f}€")
        
        print(f"\n📊 Total Mills: {total_mills} (should be 1000)")
        print(f"✅ Mills validation: {'✅ Correct' if total_mills == 1000 else '❌ Incorrect'}")

if __name__ == "__main__":
    check_apartment_mills()
