#!/usr/bin/env python3
"""
Script για έλεγχο των δεδομένων του κτιρίου 3
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append('/home/theo/projects/linux_version/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Transaction, Expense
from apartments.models import Apartment
from buildings.models import Building
from django.db.models import Sum, Q

def debug_building_3():
    """Ελέγχος δεδομένων κτιρίου 3"""
    
    try:
        client = Client.objects.get(schema_name='demo')
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε client 'demo'")
        return
    
    with tenant_context(client):
        try:
            building = Building.objects.get(id=3)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:10.2f}€")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 3")
            return
        
        # All apartments in building 3
        apartments = Apartment.objects.filter(building_id=3)
        print(f"\n🏠 Διαμερίσματα στο κτίριο: {apartments.count()}")
        
        for apartment in apartments:
            print(f"  - {apartment.number}: {apartment.current_balance:8.2f}€ (owner: {apartment.owner_name})")
        
        # All payments for building 3
        payments = Payment.objects.filter(apartment__building_id=3)
        print(f"\n💰 Συνολικές εισπράξεις: {payments.count()} πληρωμές")
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"💰 Συνολικό ποσό εισπράξεων: {total_payments:10.2f}€")
        
        # Show payments by apartment
        print(f"\n📊 ΕΙΣΠΡΑΞΕΙΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        for payment in payments.order_by('apartment__number', 'date'):
            print(f"  - {payment.apartment.number}: {payment.amount:8.2f}€ ({payment.date}) - {payment.get_method_display()}")
        
        # All transactions for building 3
        transactions = Transaction.objects.filter(building_id=3)
        print(f"\n💸 Συνολικές συναλλαγές: {transactions.count()} συναλλαγές")
        
        # Show transactions by apartment
        print(f"\n📊 ΣΥΝΑΛΛΑΓΕΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        for transaction in transactions.order_by('apartment__number', 'date'):
            apartment_num = transaction.apartment.number if transaction.apartment else transaction.apartment_number
            print(f"  - {apartment_num}: {transaction.amount:8.2f}€ ({transaction.date}) - {transaction.get_type_display()}")
        
        # Check for missing transactions
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΑΝΑΝΤΙΣΤΟΙΧΙΩΝ:")
        
        # Check if payments have corresponding transactions
        payments_without_transactions = []
        for payment in payments:
            # Check if there's a transaction for this payment
            transaction_exists = Transaction.objects.filter(
                building_id=3,
                apartment=payment.apartment,
                amount=payment.amount,
                date__date=payment.date,
                type='common_expense_payment'
            ).exists()
            
            if not transaction_exists:
                payments_without_transactions.append(payment)
        
        if payments_without_transactions:
            print(f"  ⚠️  Βρέθηκαν {len(payments_without_transactions)} πληρωμές χωρίς αντίστοιχες συναλλαγές:")
            for payment in payments_without_transactions:
                print(f"    - {payment.apartment.number}: {payment.amount:8.2f}€ ({payment.date})")
        else:
            print("  ✅ Όλες οι πληρωμές έχουν αντίστοιχες συναλλαγές")
        
        # Check apartment balances calculation
        print(f"\n🧮 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΥΠΟΛΟΙΠΩΝ:")
        for apartment in apartments:
            # Calculate balance from transactions
            apartment_transactions = Transaction.objects.filter(apartment=apartment)
            calculated_balance = Decimal('0.00')
            
            for transaction in apartment_transactions.order_by('date', 'id'):
                if transaction.type in ['common_expense_charge', 'expense_created']:
                    calculated_balance -= transaction.amount
                elif transaction.type in ['common_expense_payment', 'payment_received']:
                    calculated_balance += transaction.amount
            
            # Compare with stored balance
            stored_balance = apartment.current_balance or Decimal('0.00')
            difference = abs(calculated_balance - stored_balance)
            
            if difference > Decimal('0.01'):
                print(f"  ⚠️  {apartment.number}: Υπολογισμένο: {calculated_balance:8.2f}€, Αποθηκευμένο: {stored_balance:8.2f}€ (Διαφορά: {difference:8.2f}€)")
            else:
                print(f"  ✅ {apartment.number}: Υπολογισμένο: {calculated_balance:8.2f}€, Αποθηκευμένο: {stored_balance:8.2f}€")
        
        print(f"\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    debug_building_3()
