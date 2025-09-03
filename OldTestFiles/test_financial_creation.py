#!/usr/bin/env python
"""
Script για δοκιμή δημιουργίας μόνο οικονομικών δεδομένων
"""

import os
import sys
import django
from decimal import Decimal
import random
from datetime import datetime

# Προσθήκη backend στον PYTHONPATH
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense

def test_financial_data_creation():
    print("🧪 Δοκιμή δημιουργίας οικονομικών δεδομένων με νέα λογική")
    print("=" * 70)
    
    with schema_context('demo'):
        # Βρίσκουμε όλα τα κτίρια
        created_buildings = list(Building.objects.all())
        
        print(f"🏢 Βρέθηκαν {len(created_buildings)} κτίρια:")
        for building in created_buildings:
            print(f"   - {building.name}")
        
        print("\n" + "=" * 50)
        print("💸 ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΩΝ")
        print("=" * 50)
        
        # Γενικές δαπάνες (όπως στο αρχικό script)
        expenses_data = [
            {
                'title': 'TEST - Καθαρισμός Κοινοχρήστων',
                'amount': 450.00,
                'category': 'cleaning',
                'distribution_type': 'by_participation_mills',
                'date': datetime(2024, 8, 15).date(),
            },
            {
                'title': 'TEST - ΔΕΗ Κοινοχρήστων',
                'amount': 320.00,
                'category': 'electricity_common',
                'distribution_type': 'by_participation_mills',
                'date': datetime(2024, 8, 20).date(),
            }
        ]
        
        # ΝΕΟΣ ΤΡΟΠΟΣ: Εξαιρούμε το Αλκμάνος 22
        buildings_for_expenses = [b for b in created_buildings if b.name != 'Πολυκατοικία Αλκμάνος 22']
        print(f"📊 Θα δημιουργηθούν δαπάνες για {len(buildings_for_expenses)} κτίρια (εξαιρουμένου του Αλκμάνος 22):")
        for building in buildings_for_expenses:
            print(f"   ✅ {building.name}")
        
        for building in created_buildings:
            if building.name == 'Πολυκατοικία Αλκμάνος 22':
                print(f"   ❌ {building.name} (εξαιρείται)")
        
        for expense_data in expenses_data:
            for building in buildings_for_expenses:
                expense, created = Expense.objects.get_or_create(
                    building=building,
                    title=expense_data['title'],
                    defaults={
                        'amount': expense_data['amount'],
                        'category': expense_data['category'],
                        'distribution_type': expense_data['distribution_type'],
                        'date': expense_data['date'],
                        'is_issued': True
                    }
                )
                if created:
                    print(f"✅ Δημιουργήθηκε δαπάνη: {expense.title} ({building.name})")
                else:
                    print(f"ℹ️ Υπάρχει ήδη δαπάνη: {expense.title} ({building.name})")
        
        print("\n" + "=" * 50)
        print("💰 ΔΗΜΙΟΥΡΓΙΑ ΕΙΣΠΡΑΞΕΩΝ")
        print("=" * 50)
        
        # ΝΕΟΣ ΤΡΟΠΟΣ: Εξαιρούμε το Αλκμάνος 22
        buildings_for_payments = [b for b in created_buildings if b.name != 'Πολυκατοικία Αλκμάνος 22']
        print(f"📊 Θα δημιουργηθούν εισπράξεις για {len(buildings_for_payments)} κτίρια:")
        for building in buildings_for_payments:
            print(f"   ✅ {building.name}")
        
        for building in created_buildings:
            if building.name == 'Πολυκατοικία Αλκμάνος 22':
                print(f"   ❌ {building.name} (εξαιρείται)")
        
        payment_methods = ['bank_transfer', 'cash']
        payment_dates = [datetime(2024, 8, 5).date(), datetime(2024, 8, 15).date()]
        
        for apartment in Apartment.objects.filter(building__in=buildings_for_payments):
            # Δημιουργούμε 1 είσπραξη ανά διαμέρισμα για δοκιμή
            payment_date = random.choice(payment_dates)
            payment_amount = Decimal(random.randint(50, 150))
            payment_method = random.choice(payment_methods)
            
            payment, created = Payment.objects.get_or_create(
                apartment=apartment,
                amount=payment_amount,
                date=payment_date,
                method=payment_method,
                defaults={
                    'notes': f'TEST - Είσπραξη κοινοχρήστων - {payment_date.strftime("%B %Y")}'
                }
            )
            if created:
                print(f"✅ Δημιουργήθηκε είσπραξη: {apartment.building.name} - {apartment.number} - {payment_amount}€")
            else:
                print(f"ℹ️ Υπάρχει ήδη είσπραξη: {apartment.building.name} - {apartment.number}")
        
        # Τελικός έλεγχος
        print("\n" + "=" * 70)
        print("📊 ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ ΑΝΑ ΚΤΙΡΙΟ")
        print("=" * 70)
        
        for building in created_buildings:
            apartments = Apartment.objects.filter(building=building)
            payments_count = Payment.objects.filter(apartment__in=apartments).count()
            expenses_count = Expense.objects.filter(building=building).count()
            
            print(f"\n🏢 {building.name}:")
            print(f"   💸 Δαπάνες: {expenses_count}")
            print(f"   💰 Εισπράξεις: {payments_count}")
            
            if building.name == 'Πολυκατοικία Αλκμάνος 22':
                if payments_count == 0 and expenses_count == 0:
                    print("   🎉 ΤΕΛΕΙΑ! Κανένα οικονομικό δεδομένο!")
                else:
                    print("   ⚠️ ΠΡΟΒΛΗΜΑ! Βρέθηκαν οικονομικά δεδομένα!")

if __name__ == "__main__":
    test_financial_data_creation()
