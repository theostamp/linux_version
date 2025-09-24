#!/usr/bin/env python3
"""
Script για δημιουργία missing management fee transactions
Δημιουργεί transactions για όλους τους μήνες από Ιανουάριο έως Σεπτέμβριο 2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction
from django.utils import timezone

def create_missing_management_fees():
    """Δημιουργία missing management fee transactions"""
    
    with schema_context('demo'):
        print("🔧 Δημιουργία Missing Management Fee Transactions")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Πακέτο διαχείρισης ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        
        # Ελέγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        
        # Μήνες που πρέπει να δημιουργήσουμε transactions
        months_to_create = [
            (2024, 1), (2024, 2), (2024, 3), (2024, 4), (2024, 5),
            (2024, 6), (2024, 7), (2024, 8), (2024, 9)
        ]
        
        total_created = 0
        
        for year, month in months_to_create:
            print(f"\n📅 Δημιουργία transactions για {year}-{month:02d}")
            
            # Ημερομηνία για το transaction (1η του μήνα)
            transaction_date = timezone.make_aware(datetime(year, month, 1))
            
            # Έλεγχος αν υπάρχουν ήδη transactions για αυτόν τον μήνα
            existing_transactions = Transaction.objects.filter(
                apartment__building=building,
                type='management_fee',
                date__year=year,
                date__month=month
            ).count()
            
            if existing_transactions > 0:
                print(f"   ⏭️ Υπάρχουν ήδη {existing_transactions} transactions - παρακάμπτεται")
                continue
            
            # Δημιουργία transactions για κάθε διαμέρισμα
            month_created = 0
            for apartment in apartments:
                try:
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        building=building,
                        type='management_fee',
                        amount=building.management_fee_per_apartment,
                        date=transaction_date,
                        description=f"Πακέτο Διαχείρισης - {year}-{month:02d}",
                        notes=f"Αυτόματη δημιουργία - Πακέτο διαχείρισης για {apartment.number}"
                    )
                    month_created += 1
                    total_created += 1
                    
                except Exception as e:
                    print(f"   ❌ Σφάλμα δημιουργίας transaction για διαμέρισμα {apartment.number}: {e}")
            
            print(f"   ✅ Δημιουργήθηκαν {month_created} transactions")
        
        print(f"\n📊 Σύνοψη:")
        print(f"   - Συνολικές transactions που δημιουργήθηκαν: {total_created}")
        print(f"   - Συνολικό ποσό: €{total_created * building.management_fee_per_apartment}")
        
        # Επαλήθευση
        print(f"\n🔍 Επαλήθευση:")
        all_management_transactions = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        ).count()
        
        print(f"   - Συνολικές management_fee transactions στη βάση: {all_management_transactions}")
        
        # Έλεγχος ανά μήνα
        for year, month in months_to_create:
            month_transactions = Transaction.objects.filter(
                apartment__building=building,
                type='management_fee',
                date__year=year,
                date__month=month
            ).count()
            print(f"   - {year}-{month:02d}: {month_transactions} transactions")
        
        print("\n" + "=" * 60)
        print("✅ Δημιουργία ολοκληρώθηκε")

if __name__ == "__main__":
    create_missing_management_fees()
