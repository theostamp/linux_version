#!/usr/bin/env python3
"""
Script για έλεγχο δεδομένων στο demo tenant
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from tenants.models import Client
from django_tenants.utils import tenant_context

def check_demo_data():
    """Ελέγχει τα δεδομένα στο demo tenant"""
    try:
        # Βρίσκουμε το demo client
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε demo client: {client.name}")
        
        # Ελέγχουμε τα κτίρια στο demo tenant
        from buildings.models import Building
        with tenant_context(client):
            buildings = Building.objects.all()
            print(f"📋 Βρέθηκαν {buildings.count()} κτίρια στο demo:")
            
            for building in buildings:
                print(f"   - {building.name}: {building.address}")
                
                # Ελέγχουμε τα διαμερίσματα
                from apartments.models import Apartment
                apartments = Apartment.objects.filter(building=building)
                print(f"     Διαμερίσματα: {apartments.count()}")
                
                # Ελέγχουμε τις δαπάνες
                from financial.models import Expense
                expenses = Expense.objects.filter(building=building, is_issued=False)
                print(f"     Ανέκδοτες δαπάνες: {expenses.count()}")
                
                if expenses.exists():
                    total_amount = sum(exp.amount for exp in expenses)
                    print(f"     Συνολικό ποσό δαπανών: {total_amount}€")
                
                print()
        
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_demo_data()
