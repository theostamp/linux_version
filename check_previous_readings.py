import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MeterReading
from datetime import datetime

# All database operations within tenant context
with schema_context('demo'):
    print("🔍 Checking ALL meter readings to understand consumption calculation...")
    
    # Get all meter readings ordered by date
    all_readings = MeterReading.objects.all().order_by('reading_date', 'apartment')
    
    print(f"\n📊 Total meter readings in database: {all_readings.count()}")
    
    # Group by apartment to see history
    apartment_readings = {}
    
    for reading in all_readings:
        apt_key = reading.apartment
        if apt_key not in apartment_readings:
            apartment_readings[apt_key] = []
        apartment_readings[apt_key].append({
            'date': reading.reading_date,
            'value': reading.value,
            'meter_type': reading.meter_type
        })
    
    print(f"\n🏠 Found readings for {len(apartment_readings)} apartments:")
    
    for apt_key, readings in apartment_readings.items():
        print(f"\n📋 Apartment: {apt_key}")
        for reading in readings:
            print(f"  - {reading['date']}: {reading['value']} ({reading['meter_type']})")
        
        # Calculate consumption if there are multiple readings
        if len(readings) > 1:
            heating_readings = [r for r in readings if 'heating' in r['meter_type']]
            if len(heating_readings) > 1:
                heating_readings.sort(key=lambda x: x['date'])
                latest = heating_readings[-1]
                previous = heating_readings[-2]
                consumption = float(latest['value']) - float(previous['value'])
                print(f"  💡 Consumption: {latest['value']} - {previous['value']} = {consumption}")
            else:
                print(f"  💡 Only one heating reading, consumption = {readings[0]['value']} (no previous)")
        else:
            print(f"  💡 Only one reading, consumption = {readings[0]['value']} (first reading)")
    
    print(f"\n🔍 Check if there are readings for other months:")
    
    # Check for readings in other months
    readings_by_month = {}
    for reading in all_readings:
        month_key = f"{reading.reading_date.year}-{reading.reading_date.month:02d}"
        if month_key not in readings_by_month:
            readings_by_month[month_key] = 0
        readings_by_month[month_key] += 1
    
    print("📅 Readings by month:")
    for month, count in sorted(readings_by_month.items()):
        print(f"  - {month}: {count} readings")