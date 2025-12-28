#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment

def verify_existing_payments():
    """
    Επιβεβαίωση όλων των παλαιών πληρωμών πριν από μια συγκεκριμένη ημερομηνία.
    """
    with schema_context('demo'):
        # Εύρεση των παλαιότερων πληρωμών (όχι πρόσφατων)
        from datetime import datetime, timedelta
        cutoff_date = datetime.now().date() - timedelta(days=30)  # Πληρωμές παλαιότερες από 30 ημέρες
        
        older_payments = Payment.objects.filter(date__lt=cutoff_date, is_verified=False)
        print(f"🔍 Βρέθηκαν {older_payments.count()} παλαιότερες μη επιβεβαιωμένες πληρωμές")
        
        # Επιβεβαίωση των παλαιών πληρωμών
        verified_count = 0
        for payment in older_payments:
            payment.is_verified = True
            payment.save()
            verified_count += 1
            if verified_count % 10 == 0:
                print(f"✅ Επιβεβαιώθηκαν {verified_count} πληρωμές...")
        
        print(f"\n✅ Επιβεβαιώθηκαν συνολικά {verified_count} πληρωμές")
        
        # Εμφάνιση των εκκρεμών πληρωμών
        pending_payments = Payment.objects.filter(is_verified=False)
        print(f"⚠️ Παραμένουν {pending_payments.count()} μη επιβεβαιωμένες πληρωμές")
        
        if pending_payments.count() > 0:
            print("\n📋 Λίστα εκκρεμών πληρωμών:")
            print(f"{'ID':<5} {'Διαμέρισμα':<15} {'Ημερομηνία':<15} {'Ποσό':<10} {'Μέθοδος':<20}")
            print("-" * 70)
            
            for payment in pending_payments:
                print(f"{payment.id:<5} {payment.apartment.number:<15} {payment.date.strftime('%d/%m/%Y'):<15} {float(payment.amount):<10.2f} {payment.get_method_display():<20}")

if __name__ == '__main__':
    verify_existing_payments()
