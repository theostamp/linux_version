#!/usr/bin/env python3
"""
Script για δημιουργία missing management fee transactions (FIXED VERSION)
Δημιουργεί transactions για όλους τους μήνες από Ιανουάριο έως Σεπτέμβριο 2024
με σωστό υπολογισμό balance_after
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
from django.db.models import Sum

def calculate_apartment_balance(apartment, transaction_date):
    """Υπολογίζει το υπόλοιπο ενός διαμερίσματος σε μια συγκεκριμένη ημερομηνία"""
    
    # Υπολογισμός συνολικών υποχρεώσεων μέχρι την ημερομηνία
    total_obligations = Transaction.objects.filter(
        apartment=apartment,
        date__lte=transaction_date,
        type__in=['common_expense_charge', 'expense_created', 'expense_issued', 'interest_charge', 'penalty_charge']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Υπολογισμός συνολικών πληρωμών μέχρι την ημερομηνία
    total_payments = Transaction.objects.filter(
        apartment=apartment,
        date__lte=transaction_date,
        type__in=['common_expense_payment', 'expense_payment', 'payment_received', 'refund']
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Υπόλοιπο = Πληρωμές - Υποχρεώσεις (θετικό = πληρωμένο, αρνητικό = οφειλή)
    balance = total_payments - total_obligations
    return balance

def create_missing_management_fees_fixed():
    """Δημιουργία missing management fee transactions με σωστό υπολογισμό balance"""
    
    with schema_context('demo'):
        print("🔧 Δημιουργία Missing Management Fee Transactions (FIXED)")
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
                    # Υπολογισμός balance_before (υπόλοιπο πριν από το transaction)
                    balance_before = calculate_apartment_balance(apartment, transaction_date)
                    
                    # Υπολογισμός balance_after (υπόλοιπο μετά από το transaction)
                    # Το management_fee είναι υποχρέωση, οπότε το balance_after = balance_before - amount
                    balance_after = balance_before - building.management_fee_per_apartment
                    
                    transaction = Transaction.objects.create(
                        apartment=apartment,
                        building=building,
                        type='management_fee',
                        amount=building.management_fee_per_apartment,
                        date=transaction_date,
                        description=f"Πακέτο Διαχείρισης - {year}-{month:02d}",
                        notes=f"Αυτόματη δημιουργία - Πακέτο διαχείρισης για {apartment.number}",
                        balance_before=balance_before,
                        balance_after=balance_after,
                        status='completed'
                    )
                    month_created += 1
                    total_created += 1
                    
                    print(f"   ✅ {apartment.number}: €{building.management_fee_per_apartment} (balance: {balance_before} → {balance_after})")
                    
                except Exception as e:
                    print(f"   ❌ Σφάλμα δημιουργίας transaction για διαμέρισμα {apartment.number}: {e}")
            
            print(f"   📊 Δημιουργήθηκαν {month_created} transactions")
        
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
        
        # Έλεγχος συνολικού ποσού
        total_amount = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        print(f"   - Συνολικό ποσό management_fee transactions: €{total_amount}")
        
        print("\n" + "=" * 60)
        print("✅ Δημιουργία ολοκληρώθηκε")

if __name__ == "__main__":
    create_missing_management_fees_fixed()
