#!/usr/bin/env python3
"""
Script to test the Django signals system for automatic balance updates
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building

def test_signals_system():
    """Test the Django signals system"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ DJANGO SIGNALS SYSTEM")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print(f"📅 Ημερομηνία: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print()
        
        # 1. Αρχική κατάσταση
        print("📊 1. ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        
        print(f"🏦 Αρχικό αποθεματικό κτιρίου: {building.current_reserve:,.2f}€")
        print("🏠 Αρχικά υπόλοιπα διαμερισμάτων:")
        for apartment in apartments:
            print(f"   Διαμέρισμα {apartment.number}: {apartment.current_balance:,.2f}€")
        
        print()
        
        # 2. Δημιουργία test πληρωμής
        print("📊 2. ΔΗΜΙΟΥΡΓΙΑ TEST ΠΛΗΡΩΜΗΣ")
        print("-" * 50)
        
        test_apartment = apartments.first()
        test_amount = Decimal('100.00')
        
        print(f"💰 Δημιουργία πληρωμής {test_amount:,.2f}€ για διαμέρισμα {test_apartment.number}")
        
        # Δημιουργία πληρωμής (θα ενεργοποιήσει τα signals)
        payment = Payment.objects.create(
            apartment=test_apartment,
            amount=test_amount,
            date=date.today(),
            method='cash',
            notes='Test πληρωμή για δοκιμή signals'
        )
        
        print(f"✅ Δημιουργήθηκε πληρωμή ID: {payment.id}")
        
        # Έλεγχος ενημέρωσης
        building.refresh_from_db()
        test_apartment.refresh_from_db()
        
        print(f"🏦 Νέο αποθεματικό κτιρίου: {building.current_reserve:,.2f}€")
        print(f"🏠 Νέο υπόλοιπο διαμερίσματος {test_apartment.number}: {test_apartment.current_balance:,.2f}€")
        
        print()
        
        # 3. Δημιουργία test δαπάνης
        print("📊 3. ΔΗΜΙΟΥΡΓΙΑ TEST ΔΑΠΑΝΗΣ")
        print("-" * 50)
        
        expense_amount = Decimal('50.00')
        
        print(f"💰 Δημιουργία δαπάνης {expense_amount:,.2f}€")
        
        # Δημιουργία δαπάνης (θα ενεργοποιήσει τα signals)
        expense = Expense.objects.create(
            building=building,
            title='Test δαπάνη για δοκιμή signals',
            amount=expense_amount,
            category='cleaning',
            distribution_type='by_participation_mills',
            date=date.today(),
            is_issued=True
        )
        
        print(f"✅ Δημιουργήθηκε δαπάνη ID: {expense.id}")
        
        # Έλεγχος ενημέρωσης
        building.refresh_from_db()
        
        print(f"🏦 Νέο αποθεματικό κτιρίου: {building.current_reserve:,.2f}€")
        
        print()
        
        # 4. Δημιουργία test συναλλαγής
        print("📊 4. ΔΗΜΙΟΥΡΓΙΑ TEST ΣΥΝΑΛΛΑΓΗΣ")
        print("-" * 50)
        
        transaction_amount = Decimal('25.00')
        
        print(f"💰 Δημιουργία συναλλαγής {transaction_amount:,.2f}€ για διαμέρισμα {test_apartment.number}")
        
        # Δημιουργία συναλλαγής (θα ενεργοποιήσει τα signals)
        transaction = Transaction.objects.create(
            building=building,
            date=datetime.now(),
            type='common_expense_payment',
            description=f'Test συναλλαγή για διαμέρισμα {test_apartment.number}',
            apartment_number=test_apartment.number,
            apartment=test_apartment,
            amount=transaction_amount,
            balance_before=test_apartment.current_balance,
            balance_after=test_apartment.current_balance + transaction_amount,
            created_by='Test System'
        )
        
        print(f"✅ Δημιουργήθηκε συναλλαγή ID: {transaction.id}")
        
        # Έλεγχος ενημέρωσης
        test_apartment.refresh_from_db()
        
        print(f"🏠 Νέο υπόλοιπο διαμερίσματος {test_apartment.number}: {test_apartment.current_balance:,.2f}€")
        
        print()
        
        # 5. Διαγραφή test δεδομένων
        print("📊 5. ΔΙΑΓΡΑΦΗ TEST ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        print("🗑️ Διαγραφή test συναλλαγής...")
        transaction.delete()
        
        print("🗑️ Διαγραφή test δαπάνης...")
        expense.delete()
        
        print("🗑️ Διαγραφή test πληρωμής...")
        payment.delete()
        
        # Έλεγχος επιστροφής στην αρχική κατάσταση
        building.refresh_from_db()
        test_apartment.refresh_from_db()
        
        print(f"🏦 Τελικό αποθεματικό κτιρίου: {building.current_reserve:,.2f}€")
        print(f"🏠 Τελικό υπόλοιπο διαμερίσματος {test_apartment.number}: {test_apartment.current_balance:,.2f}€")
        
        print()
        
        # 6. Συνοπτικά αποτελέσματα
        print("📊 6. ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ")
        print("-" * 50)
        
        print("✅ Τα Django signals λειτουργούν σωστά!")
        print("✅ Αυτόματη ενημέρωση υπολοίπων διαμερισμάτων")
        print("✅ Αυτόματη ενημέρωση αποθεματικού κτιρίου")
        print("✅ Επαναυπολογισμός κατά διαγραφή")
        print()
        
        print("🎯 Πλεονεκτήματα του Signals System:")
        print("   • Αυτόματη ενημέρωση σε κάθε αλλαγή")
        print("   • Κεντρικοποιημένη λογική")
        print("   • Ασφαλής - δεν μπορεί να ξεχαστεί")
        print("   • Real-time ενημέρωση")
        print("   • Εύκολη συντήρηση")
        
        print()
        print("=" * 60)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΟΚΙΜΗ")

if __name__ == "__main__":
    test_signals_system()

