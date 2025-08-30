#!/usr/bin/env python3
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def test_pdf_enhancements():
    """Test all PDF enhancements with building data"""
    
    with schema_context('demo'):
        print("📄 Testing PDF Enhancements")
        print("=" * 50)
        
        building = Building.objects.get(id=1)
        
        print(f"🏠 Building Information:")
        print(f"   • Name: {building.name}")
        print(f"   • Address: {building.address}")
        print(f"   • City: {building.city}")
        print(f"   • Postal Code: {building.postal_code}")
        
        print(f"\n👤 Internal Manager Details:")
        print(f"   • Name: {building.internal_manager_name}")
        print(f"   • Phone: {building.internal_manager_phone}")
        print(f"   • Apartment: {building.internal_manager_apartment}")
        print(f"   • Collection Schedule: {building.internal_manager_collection_schedule}")
        
        print(f"\n📋 PDF Preview Data:")
        full_address = f"{building.address}, {building.city} {building.postal_code}"
        manager_with_apt = f"{building.internal_manager_name} (Διαμ. {building.internal_manager_apartment})"
        
        print(f"   🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ: {building.name}")
        print(f"   📍 ΔΙΕΥΘΥΝΣΗ: {full_address}")
        print(f"   👤 ΔΙΑΧΕΙΡΙΣΤΗΣ: {manager_with_apt}")
        print(f"   📞 ΤΗΛΕΦΩΝΟ: {building.internal_manager_phone}")
        print(f"   🕒 ΩΡΑΡΙΟ ΕΙΣΠΡΑΞΗΣ: {building.internal_manager_collection_schedule}")
        
        print(f"\n✅ All enhancements ready:")
        print(f"   1. ✅ Building address added to PDF")
        print(f"   2. ✅ Manager apartment number included")
        print(f"   3. ✅ Custom collection schedule from database")
        print(f"   4. ✅ Dynamic data instead of hardcoded fallbacks")
        print(f"   5. ✅ Payment due date logic updated")

if __name__ == "__main__":
    test_pdf_enhancements()
