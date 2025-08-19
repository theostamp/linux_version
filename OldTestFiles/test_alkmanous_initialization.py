#!/usr/bin/env python
"""
Script για δοκιμή δημιουργίας κτιρίου Αλκμάνος 22 χωρίς οικονομικά δεδομένα
"""

import os
import sys
import django
from decimal import Decimal

# Προσθήκη backend στον PYTHONPATH
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense, Transaction

def test_alkmanous_clean_initialization():
    print("🧪 Δοκιμή καθαρής δημιουργίας κτιρίου Αλκμάνος 22")
    print("=" * 60)
    
    with schema_context('demo'):
        # Διαγραφή υπαρχόντων δεδομένων Αλκμάνος 22
        try:
            alkmanous_building = Building.objects.get(name="Πολυκατοικία Αλκμάνος 22")
            
            # Διαγραφή εισπράξεων
            alkmanous_apartments = Apartment.objects.filter(building=alkmanous_building)
            payments_count = Payment.objects.filter(apartment__in=alkmanous_apartments).count()
            if payments_count > 0:
                Payment.objects.filter(apartment__in=alkmanous_apartments).delete()
                print(f"🗑️ Διαγράφηκαν {payments_count} εισπράξεις")
            
            # Διαγραφή δαπανών
            expenses_count = Expense.objects.filter(building=alkmanous_building).count()
            if expenses_count > 0:
                Expense.objects.filter(building=alkmanous_building).delete()
                print(f"🗑️ Διαγράφηκαν {expenses_count} δαπάνες")
            
            # Διαγραφή συναλλαγών
            transactions_count = Transaction.objects.filter(apartment__in=alkmanous_apartments).count()
            if transactions_count > 0:
                Transaction.objects.filter(apartment__in=alkmanous_apartments).delete()
                print(f"🗑️ Διαγράφηκαν {transactions_count} συναλλαγές")
            
            # Μηδενισμός υπολοίπων διαμερισμάτων
            for apt in alkmanous_apartments:
                if apt.current_balance != 0:
                    apt.current_balance = Decimal('0.00')
                    apt.save()
                    print(f"🔄 Μηδενίστηκε υπόλοιπο διαμερίσματος {apt.number}")
            
            # Μηδενισμός αποθεματικού κτιρίου
            if alkmanous_building.current_reserve != 0:
                alkmanous_building.current_reserve = Decimal('0.00')
                alkmanous_building.save()
                print(f"🔄 Μηδενίστηκε αποθεματικό κτιρίου")
            
            print("\n✅ Καθαρισμός ολοκληρώθηκε!")
            
        except Building.DoesNotExist:
            print("ℹ️ Το κτίριο δεν βρέθηκε")
        
        # Έλεγχος τελικού αποτελέσματος
        print("\n" + "=" * 60)
        print("📊 ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ:")
        
        try:
            building = Building.objects.get(name="Πολυκατοικία Αλκμάνος 22")
            apartments = Apartment.objects.filter(building=building)
            
            print(f"🏢 Κτίριο: {building.name}")
            print(f"   Αποθεματικό: {building.current_reserve}€")
            
            total_balance = Decimal('0.00')
            for apt in apartments:
                total_balance += apt.current_balance or Decimal('0.00')
            
            payments_count = Payment.objects.filter(apartment__in=apartments).count()
            expenses_count = Expense.objects.filter(building=building).count()
            transactions_count = Transaction.objects.filter(apartment__in=apartments).count()
            
            print(f"📈 Σύνολο υπολοίπων διαμερισμάτων: {total_balance}€")
            print(f"💰 Αριθμός εισπράξεων: {payments_count}")
            print(f"💸 Αριθμός δαπανών: {expenses_count}")
            print(f"🔄 Αριθμός συναλλαγών: {transactions_count}")
            
            if (building.current_reserve == 0 and total_balance == 0 and 
                payments_count == 0 and expenses_count == 0 and transactions_count == 0):
                print("\n🎉 ΕΠΙΤΥΧΙΑ! Το κτίριο Αλκμάνος 22 είναι πλήρως καθαρό από οικονομικά δεδομένα!")
            else:
                print("\n⚠️ ΠΡΟΣΟΧΗ! Υπάρχουν ακόμη οικονομικά δεδομένα!")
                
        except Building.DoesNotExist:
            print("❌ Το κτίριο δεν βρέθηκε")

if __name__ == "__main__":
    test_alkmanous_clean_initialization()
