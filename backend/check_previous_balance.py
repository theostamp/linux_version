import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment

# Check the previous_balance field data
with schema_context('demo'):
    print("🔍 Checking previous_balance field data...")
    
    # Get all apartments with their previous_balance
    apartments = Apartment.objects.all().order_by('number')
    
    print(f"\n📊 Total apartments found: {apartments.count()}")
    print("\n🏠 Apartment details:")
    
    total_previous_balance = 0
    for apt in apartments:
        print(f"  Apartment {apt.number}: previous_balance = {apt.previous_balance}€")
        total_previous_balance += apt.previous_balance or 0
    
    print(f"\n💰 Total previous_balance across all apartments: {total_previous_balance}€")
    
    # Check if the field exists and has data
    sample_apt = apartments.first()
    if sample_apt:
        print(f"\n✅ Sample apartment fields: {[field.name for field in sample_apt._meta.fields]}")
        print(f"✅ Sample apartment previous_balance type: {type(sample_apt.previous_balance)}")
        print(f"✅ Sample apartment previous_balance value: {sample_apt.previous_balance}")
    
    print("\n🎯 Verification complete!")
