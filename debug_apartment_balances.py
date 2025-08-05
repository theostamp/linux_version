#!/usr/bin/env python3
"""
Debug script για τα apartment balances
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from financial.models import Payment, Expense, Transaction, Apartment
from tenants.models import Client
from decimal import Decimal
from django.db.models import Sum
from buildings.models import Building

def debug_apartment_balances():
    """Debug τα apartment balances"""
    try:
        # Βρες το demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {tenant.name} (schema: {tenant.schema_name})")
        
        # Ελέγχος στο tenant context
        with tenant_context(tenant):
            apartments = Apartment.objects.all()
            print(f"\n🏢 Συνολικά διαμερίσματα: {apartments.count()}")
            
            for apartment in apartments:
                print(f"\n📋 Διαμέρισμα {apartment.number}:")
                print(f"  - Τρέχον Υπόλοιπο: {apartment.current_balance}€")
                print(f"  - Χιλιοστά: {apartment.participation_mills}")
                
                # Ελέγχος πληρωμές
                payments = Payment.objects.filter(apartment=apartment)
                total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                print(f"  - Συνολικές Πληρωμές: {total_payments}€ ({payments.count()} πληρωμές)")
                
                # Ελέγχος transactions
                transactions = Transaction.objects.filter(apartment=apartment)
                print(f"  - Transactions: {transactions.count()}")
                
                # Υπολογισμός υπολοίπου
                calculated_balance = total_payments
                print(f"  - Υπολογισμένο Υπόλοιπο: {calculated_balance}€")
                
                if apartment.current_balance != calculated_balance:
                    print(f"  ⚠️  ΔΙΑΦΟΡΑ: {apartment.current_balance}€ vs {calculated_balance}€")
                    
                    # Ενημέρωση του υπολοίπου
                    apartment.current_balance = calculated_balance
                    apartment.save()
                    print(f"  ✅ Ενημερώθηκε το υπόλοιπο σε {calculated_balance}€")
            
            # Ελέγχος building reserve
            buildings = Building.objects.all()
            for building in buildings:
                print(f"\n🏢 Κτίριο {building.name}:")
                print(f"  - Τρέχον Αποθεματικό: {building.current_reserve}€")
                
                # Υπολογισμός αποθεματικού από πληρωμές
                building_payments = Payment.objects.filter(apartment__building=building)
                total_building_payments = building_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                building_expenses = Expense.objects.filter(building=building)
                total_building_expenses = building_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                calculated_reserve = total_building_payments - total_building_expenses
                print(f"  - Συνολικές Πληρωμές: {total_building_payments}€")
                print(f"  - Συνολικές Δαπάνες: {total_building_expenses}€")
                print(f"  - Υπολογισμένο Αποθεματικό: {calculated_reserve}€")
                
                if building.current_reserve != calculated_reserve:
                    print(f"  ⚠️  ΔΙΑΦΟΡΑ: {building.current_reserve}€ vs {calculated_reserve}€")
                    
                    # Ενημέρωση του αποθεματικού
                    building.current_reserve = calculated_reserve
                    building.save()
                    print(f"  ✅ Ενημερώθηκε το αποθεματικό σε {calculated_reserve}€")
            
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_apartment_balances() 