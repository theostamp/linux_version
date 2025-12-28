#!/usr/bin/env python3
"""
Debug script για να ελέγξουμε το πρόβλημα με το σύνολο των πληρωμών
"""

import os
import sys
import django

# Setup Django for container environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
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
    large_payments = payments.filter(amount__gt=10000)
    if large_payments.exists():
        print(f"⚠️  Βρέθηκαν {large_payments.count()} πληρωμές με ποσό > 10.000€")
    
    # Check for duplicate payments
    from django.db.models import Count
    duplicate_payments = payments.values('apartment', 'amount', 'date').annotate(
        count=Count('id')
    ).filter(count__gt=1)
    
    if duplicate_payments.exists():
        print(f"⚠️  Βρέθηκαν {duplicate_payments.count()} πιθανές διπλές πληρωμές")
    
    print("\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    debug_payment_total() 