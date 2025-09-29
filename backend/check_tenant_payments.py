#!/usr/bin/env python3
"""
Script για έλεγχο πληρωμών στο demo tenant
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense, Transaction
from decimal import Decimal
from django.db import models

def check_tenant_payments():
    """Έλεγχος πληρωμών στο demo tenant"""
    print("🔍 Έλεγχος Πληρωμών στο Demo Tenant")
    print("=" * 50)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Check payments in demo tenant
    with tenant_context(client):
        payments = Payment.objects.all().order_by('-date')
        print(f"📊 Συνολικές πληρωμές: {payments.count()}")
        
        if payments.count() == 0:
            print("❌ Δεν βρέθηκαν πληρωμές")
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
        
        # Check expenses
        expenses = Expense.objects.all()
        total_expenses = expenses.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        print(f"💸 ΣΥΝΟΛΙΚΕΣ ΔΑΠΑΝΕΣ: {total_expenses:10.2f}€")
        
        # Check transactions
        transactions = Transaction.objects.all()
        print(f"🔄 ΣΥΝΟΛΙΚΕΣ ΚΙΝΗΣΕΙΣ: {transactions.count()}")
        
        # Check apartment balances
        from apartments.models import Apartment
        apartments = Apartment.objects.all()
        total_balance = sum(apt.current_balance or Decimal('0.00') for apt in apartments)
        print(f"🏠 ΣΥΝΟΛΙΚΟ ΥΠΟΛΟΙΠΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ: {total_balance:10.2f}€")
        
        print("\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    check_tenant_payments() 