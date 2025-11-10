#!/usr/bin/env python3
"""
Απλό test script για τη νέα λογική κατάστασης
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Payment, Transaction
from financial.views import calculate_payment_delay_status


def test_status_direct():
    """Test της νέας λογικής κατάστασης απευθείας"""
    
    with schema_context('demo'):
        print("🧪 Testing νέα λογική κατάστασης απευθείας")
        print("=" * 60)
        
        # Λήψη όλων των διαμερισμάτων
        apartments = Apartment.objects.filter(building_id=2)  # Αλκμάνος 22
        
        print(f"📊 Συνολικά διαμερίσματα: {apartments.count()}")
        print()
        
        status_counts = {
            'Ενεργό': 0,
            'Οφειλή': 0,
            'Κρίσιμο': 0,
            'Πιστωτικό': 0
        }
        
        for apartment in apartments:
            # Υπολογισμός τρέχοντος υπολοίπου
            total_payments = Payment.objects.filter(apartment=apartment).aggregate(
                total=django.db.models.Sum('amount')
            )['total'] or Decimal('0.00')
            
            total_charges = Transaction.objects.filter(
                apartment=apartment,
                type__in=['common_expense_charge', 'expense_payment']
            ).aggregate(
                total=django.db.models.Sum('amount')
            )['total'] or Decimal('0.00')
            
            current_balance = total_charges - total_payments
            
            # Υπολογισμός νέας κατάστασης
            status = calculate_payment_delay_status(apartment)
            status_counts[status] += 1
            
            # Λήψη τελευταίας πληρωμής
            last_payment = Payment.objects.filter(apartment=apartment).order_by('-date').first()
            last_payment_date = last_payment.date if last_payment else None
            
            print(f"🏠 Διαμέρισμα {apartment.number}:")
            print(f"   Ιδιοκτήτης: {apartment.owner_name or 'Άγνωστος'}")
            print(f"   Υπόλοιπο: {current_balance:,.2f}€")
            print(f"   Κατάσταση: {status}")
            if last_payment_date:
                print(f"   Τελευταία πληρωμή: {last_payment_date.strftime('%d/%m/%Y')}")
            print()
        
        print("📈 Σύνοψη καταστάσεων:")
        print("-" * 40)
        for status, count in status_counts.items():
            percentage = (count / apartments.count()) * 100 if apartments.count() > 0 else 0
            print(f"   {status}: {count} διαμερίσματα ({percentage:.1f}%)")
        
        print()
        print("✅ Test ολοκληρώθηκε!")


if __name__ == "__main__":
    test_status_direct()
