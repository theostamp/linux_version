#!/usr/bin/env python3
"""
Script για έλεγχο πεδίων αμοιβής διαχείρισης στη βάση δεδομένων
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from django.db import connection
from decimal import Decimal

def check_management_fee_fields():
    """Ελέγχει τα πεδία σχετικά με την αμοιβή διαχείρισης"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΠΕΔΙΩΝ ΑΜΟΙΒΗΣ ΔΙΑΧΕΙΡΙΣΗΣ")
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
            
            # Check Building model fields
            print(f"   📋 Πεδία Building model:")
            building_fields = [field.name for field in Building._meta.get_fields()]
            management_related_fields = [field for field in building_fields if 'management' in field.lower() or 'fee' in field.lower() or 'cost' in field.lower()]
            
            if management_related_fields:
                print(f"      ✅ Βρέθηκαν σχετικά πεδία: {management_related_fields}")
                for field in management_related_fields:
                    try:
                        value = getattr(building, field)
                        print(f"         - {field}: {value}")
                    except:
                        print(f"         - {field}: [δεν μπορεί να διαβαστεί]")
            else:
                print(f"      ❌ Δεν βρέθηκαν πεδία σχετικά με διαχείριση")
            
            # Check apartments count
            apartments_count = Apartment.objects.filter(building_id=building.id).count()
            print(f"   🏠 Αριθμός διαμερισμάτων: {apartments_count}")
            
            # Check if there are any management fee expenses
            management_expenses = Expense.objects.filter(
                building_id=building.id,
                title__icontains='διαχείριση'
            )
            print(f"   💰 Δαπάνες διαχείρισης: {management_expenses.count()}")
            for expense in management_expenses:
                print(f"      - {expense.title}: {expense.amount}€ ({expense.date})")
        
        # Check database schema for management fee fields
        print(f"\n🔍 ΕΛΕΓΧΟΣ SCHEMA ΒΑΣΗΣ ΔΕΔΟΜΕΝΩΝ:")
        with connection.cursor() as cursor:
            # Get table info for buildings table
            cursor.execute("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'buildings_building' 
                AND column_name ILIKE '%management%' OR column_name ILIKE '%fee%' OR column_name ILIKE '%cost%'
                ORDER BY column_name;
            """)
            
            management_columns = cursor.fetchall()
            if management_columns:
                print(f"   ✅ Βρέθηκαν σχετικές στήλες στη βάση:")
                for column in management_columns:
                    print(f"      - {column[0]} ({column[1]}, nullable: {column[2]})")
            else:
                print(f"   ❌ Δεν βρέθηκαν σχετικές στήλες στη βάση")
            
            # Check all columns in buildings table
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'buildings_building' 
                ORDER BY column_name;
            """)
            
            all_columns = cursor.fetchall()
            print(f"   📋 Όλες οι στήλες του πίνακα buildings:")
            for column in all_columns:
                print(f"      - {column[0]} ({column[1]})")

if __name__ == "__main__":
    check_management_fee_fields()
