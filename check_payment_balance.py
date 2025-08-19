import os
import sys
import django
from decimal import Decimal
from django_tenants.utils import schema_context

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

# Configure tenant settings
from django.conf import settings
if not hasattr(settings, 'TENANT_DB_ALIAS'):
    settings.TENANT_DB_ALIAS = 'default'

from financial.models import Payment, Transaction
from apartments.models import Apartment
from django.db import models

def check_payment_balance():
    with schema_context('demo'):
        # Βρες το διαμέρισμα 10
        apartment = Apartment.objects.filter(building_id=4, number='10').first()
        if not apartment:
            print("❌ Δεν βρέθηκε διαμέρισμα 10")
            return
        
        print(f"🏠 Διαμέρισμα: {apartment.number}")
        print(f"👤 Ενοικιαστής: {apartment.tenant_name}")
        print(f"💰 Τρέχον Υπόλοιπο: {apartment.current_balance}€")
        
        # Βρες την τελευταία πληρωμή
        latest_payment = Payment.objects.filter(
            apartment=apartment,
            payment_type='common_expense'
        ).order_by('-date').first()
        
        if latest_payment:
            print(f"\n📊 Τελευταία Πληρωμή:")
            print(f"   Ημερομηνία: {latest_payment.date}")
            print(f"   Ποσό: {latest_payment.amount}€")
            print(f"   Αποθεματικό: {latest_payment.reserve_fund_amount}€")
            print(f"   Σύνολο: {latest_payment.amount + (latest_payment.reserve_fund_amount or 0)}€")
        
        # Βρες όλες τις συναλλαγές
        transactions = Transaction.objects.filter(
            apartment=apartment
        ).order_by('date')
        
        print(f"\n📜 Ιστορικό Συναλλαγών:")
        running_balance = Decimal('0.00')
        
        for i, transaction in enumerate(transactions):
            if transaction.type == 'payment':
                running_balance += transaction.amount
            else:  # charge
                running_balance -= transaction.amount
            
            print(f"   {i+1}. {transaction.date}: {transaction.description}")
            print(f"      Ποσό: {transaction.amount}€ ({transaction.type})")
            print(f"      Υπόλοιπο μετά: {transaction.balance_after}€")
            print(f"      Υπολογισμένο: {running_balance}€")
            print()
        
        print(f"🎯 Τελικό Υπολογισμένο Υπόλοιπο: {running_balance}€")
        print(f"🎯 Τρέχον Υπόλοιπο από DB: {apartment.current_balance}€")
        
        # Υπολογισμός από πληρωμές και χρεώσεις
        total_payments = Payment.objects.filter(
            apartment=apartment,
            payment_type='common_expense'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        total_reserve_payments = Payment.objects.filter(
            apartment=apartment,
            payment_type='reserve_fund'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"\n💰 Συνολικές Εισπράξεις:")
        print(f"   Κοινόχρηστα: {total_payments}€")
        print(f"   Αποθεματικό: {total_reserve_payments}€")
        print(f"   Σύνολο: {total_payments + total_reserve_payments}€")
        
        # Υπολογισμός χρεώσεων (κοινόχρηστα)
        from financial.services import CommonExpenseCalculator
        calculator = CommonExpenseCalculator(4)  # building_id = 4
        shares = calculator.calculate_shares()
        
        apartment_share = shares.get(apartment.id, {})
        total_charges = apartment_share.get('total_amount', Decimal('0.00'))
        
        print(f"\n💳 Συνολικές Χρεώσεις:")
        print(f"   Κοινόχρηστα: {total_charges}€")
        
        # Υπολογισμός τελικού υπολοίπου
        final_balance = (total_payments + total_reserve_payments) - total_charges
        print(f"\n🎯 Τελικός Υπολογισμός:")
        print(f"   Εισπράξεις - Χρεώσεις = {final_balance}€")
        print(f"   Διαφορά από DB: {final_balance - apartment.current_balance}€")

if __name__ == "__main__":
    check_payment_balance()
