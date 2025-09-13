import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MeterReading
from buildings.models import Building
from django.db.models import Q
from datetime import datetime

# All database operations within tenant context
with schema_context('demo'):
    print("🔍 Checking meter readings for September 2025...")
    
    # Get building 1 (Αλκμάνος 22)
    building = Building.objects.get(id=1)
    print(f"📋 Building: {building.name}")
    
    # Check all meter readings for September 2025
    september_readings = MeterReading.objects.filter(
        Q(reading_date__year=2025) & Q(reading_date__month=9)
    ).order_by('reading_date', 'apartment')
    
    print(f"\n📊 Total meter readings in September 2025: {september_readings.count()}")
    
    if september_readings.exists():
        print("\n📋 Meter readings found:")
        for reading in september_readings:
            print(f"  - Apartment {reading.apartment}: {reading.meter_type} = {reading.value} (Date: {reading.reading_date})")
            # Check if MeterReading has previous_value field or notes field
            try:
                print(f"    Notes: {getattr(reading, 'notes', 'No notes field')}")
            except:
                pass
    else:
        print("❌ No meter readings found for September 2025")
    
    # Check meter readings for building 1 specifically
    print(f"\n🏢 Checking meter readings for Building {building.id} in September 2025...")
    building_readings = MeterReading.objects.filter(
        apartment__in=[1,2,3,4,5,6,7,8,9,10],  # Apartment IDs for building 1
        reading_date__year=2025,
        reading_date__month=9
    ).order_by('apartment', 'reading_date')
    
    print(f"📊 Building-specific readings: {building_readings.count()}")
    
    if building_readings.exists():
        print("\n📋 Building readings found:")
        for reading in building_readings:
            print(f"  - Apt {reading.apartment}: {reading.meter_type} = {reading.value} (Date: {reading.reading_date})")
    
    # Check all meter readings regardless of month to see what data we have
    print(f"\n🔍 All meter readings in the database:")
    all_readings = MeterReading.objects.all().order_by('-reading_date')[:20]
    print(f"📊 Total readings in DB: {MeterReading.objects.count()}")
    print("📋 Last 20 readings:")
    
    for reading in all_readings:
        print(f"  - Apt {reading.apartment}: {reading.meter_type} = {reading.value} (Date: {reading.reading_date})")