#!/usr/bin/env python3
"""
Simple test script για Meter Readings
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Προσθήκη του backend directory στο path
sys.path.append('/home/theo/projects/linux_version/backend')

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import MeterReading, Expense
from apartments.models import Apartment
from buildings.models import Building

def main():
    """Main test function"""
    print("🚀 Starting Simple Meter Readings Test...\n")
    
    try:
        # Get the test tenant
        tenant = Client.objects.get(schema_name='test_tenant')
        print(f"✅ Found tenant: {tenant.name}")
        
        # Test in tenant context
        with tenant_context(tenant):
            # Get building and apartment
            building = Building.objects.first()
            if not building:
                print("❌ No building found")
                return
            
            apartment = Apartment.objects.filter(building=building).first()
            if not apartment:
                print("❌ No apartment found")
                return
            
            print(f"✅ Found building: {building.name}")
            print(f"✅ Found apartment: {apartment.number}")
            
            # Create meter readings
            reading1 = MeterReading.objects.create(
                apartment=apartment,
                reading_date=datetime.now().date() - timedelta(days=30),
                value=Decimal('100.50'),
                meter_type='heating',
                notes='Test reading 1'
            )
            
            reading2 = MeterReading.objects.create(
                apartment=apartment,
                reading_date=datetime.now().date(),
                value=Decimal('150.75'),
                meter_type='heating',
                notes='Test reading 2'
            )
            
            print(f"✅ Created reading 1: {reading1}")
            print(f"✅ Created reading 2: {reading2}")
            
            # Test consumption calculation
            consumption = reading2.calculate_consumption()
            print(f"📊 Consumption: {consumption}")
            
            # Test building consumption
            consumption_data = MeterReading.calculate_building_consumption(
                building_id=building.id,
                meter_type='heating',
                date_from=datetime.now().date() - timedelta(days=60),
                date_to=datetime.now().date()
            )
            
            print(f"📊 Building consumption: {consumption_data['total_consumption']}")
            print(f"🏢 Apartments with readings: {len(consumption_data['apartments'])}")
            
            # Create expense with meter distribution
            expense = Expense.objects.create(
                building=building,
                title='Test Heating Expense',
                amount=Decimal('500.00'),
                date=datetime.now().date(),
                category='heating_fuel',
                distribution_type='by_meters',
                notes='Test expense with meter distribution'
            )
            
            print(f"✅ Created expense: {expense.title}")
            
            # Cleanup
            reading1.delete()
            reading2.delete()
            expense.delete()
            
            print("✅ Test completed successfully!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 