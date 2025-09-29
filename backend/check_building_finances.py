#!/usr/bin/env python
"""
Script για έλεγχο οικονομικών δεδομένων κτιρίου Αλκμάνος 22
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

def main():
    print("🔍 Έλεγχος οικονομικών δεδομένων κτιρίου Πολυκατοικία Αλκμάνος 22")
    print("=" * 80)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(name="Πολυκατοικία Αλκμάνος 22")
            print(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
            print(f"   Διεύθυνση: {building.address}")
            print(f"   Πόλη: {building.city}")
            print(f"   Ταχυδρομικός Κώδικας: {building.postal_code}")
            print(f"   Αριθμός διαμερισμάτων: {building.apartments_count}")
            print(f"   Τρέχον αποθεματικό: {building.current_reserve}€")
            print()
            
        except Building.DoesNotExist:
            print("❌ Το κτίριο δεν βρέθηκε")
            return
        
        # Βρίσκουμε τα διαμερίσματα του κτιρίου
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Διαμερίσματα κτιρίου ({apartments.count()}):")
        print("-" * 50)
        total_apartment_balance = Decimal('0.00')
        
        for apt in apartments:
            balance = apt.current_balance or Decimal('0.00')
            total_apartment_balance += balance
            status = "Πιστωτικό" if balance > 0 else "Χρεωστικό" if balance < 0 else "Μηδέν"
            print(f"   {apt.number}: {apt.owner_name} - Υπόλοιπο: {balance}€ ({status})")
        
        print(f"\n📊 Άθροισμα υπολοίπων διαμερισμάτων: {total_apartment_balance}€")
        print()
        
        # Βρίσκουμε τις εισπράξεις του κτιρίου
        payments = Payment.objects.filter(apartment__building=building)
        print(f"💰 Εισπράξεις κτιρίου ({payments.count()}):")
        print("-" * 50)
        total_payments = Decimal('0.00')
        
        for payment in payments:
            total_payments += payment.amount
            print(f"   {payment.apartment.number}: {payment.amount}€ ({payment.date}) - {payment.method}")
        
        print(f"\n📊 Σύνολο εισπράξεων: {total_payments}€")
        print()
        
        # Βρίσκουμε τις δαπάνες του κτιρίου
        expenses = Expense.objects.filter(building=building)
        print(f"💸 Δαπάνες κτιρίου ({expenses.count()}):")
        print("-" * 50)
        total_expenses = Decimal('0.00')
        
        for expense in expenses:
            total_expenses += expense.amount
            print(f"   {expense.title}: {expense.amount}€ ({expense.date}) - {expense.category}")
        
        print(f"\n📊 Σύνολο δαπανών: {total_expenses}€")
        print()
        
        # Βρίσκουμε τις συναλλαγές του κτιρίου
        transactions = Transaction.objects.filter(apartment__building=building)
        print(f"🔄 Συναλλαγές κτιρίου ({transactions.count()}):")
        print("-" * 50)
        
        for transaction in transactions:
            trans_type = "Είσπραξη" if transaction.amount > 0 else "Δαπάνη"
            print(f"   {transaction.apartment.number}: {transaction.amount}€ - {trans_type} ({transaction.date})")
        
        # Υπολογισμός
        print("\n" + "=" * 80)
        print("📈 ΥΠΟΛΟΓΙΣΜΟΣ ΥΠΟΛΟΙΠΟΥ:")
        print(f"   Σύνολο εισπράξεων: +{total_payments}€")
        print(f"   Σύνολο δαπανών: -{total_expenses}€")
        print(f"   Καθαρό υπόλοιπο: {total_payments - total_expenses}€")
        print(f"   Υπόλοιπο διαμερισμάτων: {total_apartment_balance}€")
        print(f"   Αποθεματικό κτιρίου: {building.current_reserve}€")
        
        # Πιθανή εξήγηση
        mystery_amount = Decimal('24610.00')
        print(f"\n❓ Μυστήριο ποσό: {mystery_amount}€")
        
        if building.current_reserve == mystery_amount:
            print("💡 Το μυστήριο ποσό ταιριάζει με το current_reserve του κτιρίου!")
        
        if total_payments == mystery_amount:
            print("💡 Το μυστήριο ποσό ταιριάζει με το σύνολο εισπράξεων!")
        
        if total_apartment_balance == mystery_amount:
            print("💡 Το μυστήριο ποσό ταιριάζει με το σύνολο υπολοίπων διαμερισμάτων!")

if __name__ == "__main__":
    main()
