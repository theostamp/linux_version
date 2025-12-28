#!/usr/bin/env python3
"""
Script to reset all apartment balances to zero and clean up orphaned transactions
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime
from django.db.models import Sum

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment
from buildings.models import Building

def reset_apartment_balances():
    """Reset all apartment balances to zero and clean up orphaned transactions"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔧 ΜΗΔΕΝΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ - ΑΛΚΜΑΝΟΣ 22")
        print("=" * 80)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print(f"📅 Ημερομηνία: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print()
        
        # 1. Καταγραφή αρχικής κατάστασης
        print("📊 1. ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print("🏠 Αρχικά υπόλοιπα διαμερισμάτων:")
        for apartment in apartments:
            print(f"   Διαμέρισμα {apartment.number}: {apartment.current_balance:,.2f}€")
        
        print()
        
        # 2. Καθαρισμός orphaned συναλλαγών
        print("📊 2. ΚΑΘΑΡΙΣΜΟΣ ORPHANED ΣΥΝΑΛΛΑΓΩΝ")
        print("-" * 50)
        
        orphaned_transactions = Transaction.objects.filter(apartment__isnull=True)
        orphaned_count = orphaned_transactions.count()
        
        print(f"🔗 Βρέθηκαν {orphaned_count} orphaned συναλλαγές")
        
        if orphaned_count > 0:
            print("🗑️ Διαγραφή orphaned συναλλαγών...")
            orphaned_transactions.delete()
            print(f"✅ Διαγράφηκαν {orphaned_count} orphaned συναλλαγές")
        else:
            print("✅ Δεν υπάρχουν orphaned συναλλαγές")
        
        print()
        
        # 3. Καθαρισμός συναλλαγών χωρίς σύνδεση με διαμέρισμα
        print("📊 3. ΚΑΘΑΡΙΣΜΟΣ ΣΥΝΑΛΛΑΓΩΝ ΧΩΡΙΣ ΔΙΑΜΕΡΙΣΜΑ")
        print("-" * 50)
        
        # Έλεγχος για συναλλαγές που δεν ανήκουν σε διαμέρισμα του κτιρίου
        building_apartment_ids = list(apartments.values_list('id', flat=True))
        invalid_transactions = Transaction.objects.exclude(apartment_id__in=building_apartment_ids)
        invalid_count = invalid_transactions.count()
        
        print(f"🔗 Βρέθηκαν {invalid_count} συναλλαγές χωρίς έγκυρο διαμέρισμα")
        
        if invalid_count > 0:
            print("🗑️ Διαγραφή συναλλαγών χωρίς έγκυρο διαμέρισμα...")
            invalid_transactions.delete()
            print(f"✅ Διαγράφηκαν {invalid_count} συναλλαγές")
        else:
            print("✅ Όλες οι συναλλαγές έχουν έγκυρα διαμερίσματα")
        
        print()
        
        # 4. Μηδενισμός υπολοίπων διαμερισμάτων
        print("📊 4. ΜΗΔΕΝΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 50)
        
        updated_count = 0
        for apartment in apartments:
            if apartment.current_balance != Decimal('0.00'):
                old_balance = apartment.current_balance
                apartment.current_balance = Decimal('0.00')
                apartment.save()
                print(f"   Διαμέρισμα {apartment.number}: {old_balance:,.2f}€ → 0.00€")
                updated_count += 1
            else:
                print(f"   Διαμέρισμα {apartment.number}: ήδη 0.00€")
        
        print(f"\n✅ Ενημερώθηκαν {updated_count} διαμερίσματα")
        print()
        
        # 5. Επαναυπολογισμός αποθεματικού κτιρίου
        print("📊 5. ΕΠΑΝΑΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 50)
        
        building = Building.objects.get(id=building_id)
        old_reserve = building.current_reserve
        
        # Υπολογισμός νέου αποθεματικού από συναλλαγές
        total_transactions = Transaction.objects.filter(
            apartment__building_id=building_id
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        building.current_reserve = total_transactions
        building.save()
        
        print(f"🏦 Παλιό αποθεματικό: {old_reserve:,.2f}€")
        print(f"🏦 Νέο αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"💰 Συνολικές συναλλαγές: {total_transactions:,.2f}€")
        print()
        
        # 6. Τελική κατάσταση
        print("📊 6. ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        # Επαναφόρτωση διαμερισμάτων με νέα δεδομένα
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print("🏠 Τελικά υπόλοιπα διαμερισμάτων:")
        for apartment in apartments:
            print(f"   Διαμέρισμα {apartment.number}: {apartment.current_balance:,.2f}€")
        
        print()
        
        # Έλεγχος συναλλαγών
        remaining_transactions = Transaction.objects.filter(
            apartment__building_id=building_id
        ).count()
        
        print(f"💰 Εναπομείναντες συναλλαγές: {remaining_transactions}")
        
        if remaining_transactions > 0:
            print("📋 Λεπτομέρειες εναπομείναντων συναλλαγών:")
            for trans in Transaction.objects.filter(apartment__building_id=building_id):
                print(f"   • ID: {trans.id} | Διαμέρισμα: {trans.apartment.number} | Ποσό: {trans.amount:,.2f}€")
        
        print()
        print("=" * 80)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΜΗΔΕΝΙΣΜΟΣ")

if __name__ == "__main__":
    reset_apartment_balances()
