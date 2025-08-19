#!/usr/bin/env python3
"""
Debug script για να ελέγξουμε το πρόβλημα με το σύνολο των πληρωμών
"""

import os
import sys
import django

# Setup Django for container environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from financial.models import Payment
from decimal import Decimal

def debug_payment_total():
    """Debug το σύνολο των πληρωμών"""
    print("🔍 Debug Payment Total Issue")
    print("=" * 50)
    
    # Get all payments
    payments = Payment.objects.all().order_by('-date')
    
    print(f"📊 Συνολικές πληρωμές στη βάση: {payments.count()}")
    
    if payments.count() == 0:
        print("❌ Δεν βρέθηκαν πληρωμές στη βάση")
        return
    
    # Show all payments
    print("\n📋 Λίστα όλων των πληρωμών:")
    print("-" * 80)
    total_amount = Decimal('0.00')
    
    for i, payment in enumerate(payments, 1):
        amount = Decimal(str(payment.amount))
        total_amount += amount
        
        print(f"{i:2d}. ID: {payment.id:3d} | "
              f"Διαμέρισμα: {payment.apartment.number:3s} | "
              f"Ποσό: {amount:10.2f}€ | "
              f"Ημερομηνία: {payment.date} | "
              f"Μέθοδος: {payment.method}")
    
    print("-" * 80)
    print(f"💰 ΣΥΝΟΛΙΚΟ ΠΟΣΟ: {total_amount:10.2f}€")
    
    # Check for any issues
    print("\n🔍 Έλεγχος για πιθανά προβλήματα:")
    
    # Check for negative amounts
    negative_payments = payments.filter(amount__lt=0)
    if negative_payments.exists():
        print(f"⚠️  Βρέθηκαν {negative_payments.count()} πληρωμές με αρνητικό ποσό")
    
    # Check for zero amounts
    zero_payments = payments.filter(amount=0)
    if zero_payments.exists():
        print(f"⚠️  Βρέθηκαν {zero_payments.count()} πληρωμές με μηδενικό ποσό")
    
    # Check for very large amounts
    large_payments = payments.filter(amount__gt=100000)
    if large_payments.exists():
        print(f"⚠️  Βρέθηκαν {large_payments.count()} πληρωμές με ποσό > 100,000€")
        for payment in large_payments:
            print(f"   - ID {payment.id}: {payment.amount}€ (Διαμέρισμα {payment.apartment.number})")
    
    # Check for duplicate payments
    print("\n🔍 Έλεγχος για διπλές εγγραφές:")
    payment_counts = {}
    for payment in payments:
        key = f"{payment.apartment.id}_{payment.amount}_{payment.date}"
        payment_counts[key] = payment_counts.get(key, 0) + 1
    
    duplicates = {k: v for k, v in payment_counts.items() if v > 1}
    if duplicates:
        print(f"⚠️  Βρέθηκαν {len(duplicates)} πιθανές διπλές εγγραφές")
        for key, count in duplicates.items():
            print(f"   - {key}: {count} φορές")
    
    # Calculate expected total based on what you mentioned
    expected_payments = [
        (201, 666.00),
        (202, 33.00),
        (202, 150000.00),
        (202, 555.00)
    ]
    
    expected_total = sum(amount for _, amount in expected_payments)
    print(f"\n📊 Αναμενόμενο σύνολο βάσει της περιγραφής: {expected_total:10.2f}€")
    print(f"📊 Πραγματικό σύνολο από τη βάση: {total_amount:10.2f}€")
    
    if total_amount != expected_total:
        print(f"❌ ΔΙΑΦΟΡΑ: {abs(total_amount - expected_total):10.2f}€")
        print("🔍 Πιθανές αιτίες:")
        print("   - Λάθος στον υπολογισμό στο frontend")
        print("   - Φιλτράρισμα που αποκλείει κάποιες πληρωμές")
        print("   - Διαφορετικά δεδομένα στη βάση")
    else:
        print("✅ Τα ποσά ταιριάζουν!")

if __name__ == "__main__":
    debug_payment_total() 