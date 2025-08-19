#!/usr/bin/env python3
"""
Debug script για το πρόβλημα με τις πληρωμές
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from financial.models import Payment, Expense
from tenants.models import Client

def check_payments():
    """Ελέγχει τις πληρωμές στο demo tenant"""
    try:
        # Βρες το demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {tenant.name} (schema: {tenant.schema_name})")
        
        # Ελέγχος πληρωμές στο tenant context
        with tenant_context(tenant):
            payments_count = Payment.objects.count()
            print(f"📊 Συνολικές πληρωμές: {payments_count}")
            
            if payments_count > 0:
                # Εμφάνισε τις πρώτες 5 πληρωμές
                payments = Payment.objects.all()[:5]
                print("\n📋 Πρώτες 5 πληρωμές:")
                for i, payment in enumerate(payments, 1):
                    print(f"  {i}. ID: {payment.id}, Διαμέρισμα: {payment.apartment}, Ποσό: {payment.amount}, Ημερομηνία: {payment.date}")
            else:
                print("⚠️  Δεν βρέθηκαν πληρωμές!")
                
            # Ελέγχος και τις δαπάνες
            expenses_count = Expense.objects.count()
            print(f"\n💰 Συνολικές δαπάνες: {expenses_count}")
            
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    check_payments() 