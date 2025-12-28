#!/usr/bin/env python3
"""
Script για έλεγχο της καρτέλας Δαπάνες Διαχείρισης
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from decimal import Decimal

def test_management_fees_card():
    """Ελέγχει τα δεδομένα για την καρτέλα Δαπάνες Διαχείρισης"""
    
    print("🧪 ΕΛΕΓΧΟΣ ΚΑΡΤΕΛΑΣ ΔΑΠΑΝΕΣ ΔΙΑΧΕΙΡΙΣΗΣ")
    print("=" * 60)
    
    # Get demo tenant
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {client.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Check in tenant context
    with tenant_context(client):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name}")
            print(f"   ID: {building.id}")
            
            # Check management fee data
            management_fee = building.management_fee_per_apartment or Decimal('0.00')
            apartments_count = Apartment.objects.filter(building_id=building.id).count()
            total_management_cost = management_fee * apartments_count
            
            print(f"   💰 Αμοιβή ανά διαμέρισμα: {management_fee}€")
            print(f"   🏠 Αριθμός διαμερισμάτων: {apartments_count}")
            print(f"   💸 Συνολικό κόστος διαχείρισης: {total_management_cost}€")
            print(f"   📋 Υπολογισμός: {apartments_count} × {management_fee}€ = {total_management_cost}€")
            
            # Check management office info
            if building.management_office_name:
                print(f"   🏢 Γραφείο διαχείρισης: {building.management_office_name}")
                if building.management_office_phone:
                    print(f"   📞 Τηλέφωνο: {building.management_office_phone}")
                if building.management_office_address:
                    print(f"   📍 Διεύθυνση: {building.management_office_address}")
            else:
                print("   ⚠️  Δεν έχει οριστεί γραφείο διαχείρισης")
            
            # Test different scenarios
            print("   🧪 Δοκιμές:")
            
            # Scenario 1: Zero management fee
            if management_fee == 0:
                print("      ✅ Σενάριο 1: Μηδενική αμοιβή διαχείρισης")
            else:
                print("      ✅ Σενάριο 1: Υπάρχει αμοιβή διαχείρισης")
            
            # Scenario 2: No apartments
            if apartments_count == 0:
                print("      ⚠️  Σενάριο 2: Δεν υπάρχουν διαμερίσματα")
            else:
                print(f"      ✅ Σενάριο 2: Υπάρχουν {apartments_count} διαμερίσματα")
            
            # Scenario 3: Management office info
            if building.management_office_name:
                print("      ✅ Σενάριο 3: Υπάρχουν πληροφορίες γραφείου")
            else:
                print("      ⚠️  Σενάριο 3: Δεν υπάρχουν πληροφορίες γραφείου")

if __name__ == "__main__":
    test_management_fees_card()
