#!/usr/bin/env python3
"""
Script για έλεγχο της προέλευσης του ποσού 524,00€ στο αποθεματικό
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal

def check_reserve_524():
    """Ελέγχει την προέλευση του ποσού 524,00€ στο αποθεματικό"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΠΡΟΕΛΕΥΣΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ 524,00€")
    print("=" * 60)
    
    # Get demo tenant
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"✅ Βρέθηκε tenant: {client.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Check in tenant context
    with tenant_context(client):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name}")
            print(f"💰 Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
            
            # Calculate from transactions
            total_payments = Payment.objects.filter(
                apartment__building_id=building.id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            total_expenses = Expense.objects.filter(
                building_id=building.id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            calculated_reserve = total_payments - total_expenses
            
            print(f"\n📊 Υπολογισμός από συναλλαγές:")
            print(f"  - Συνολικές εισπράξεις: {total_payments}€")
            print(f"  - Συνολικές δαπάνες: {total_expenses}€")
            print(f"  - Υπολογισμένο αποθεματικό: {calculated_reserve}€")
            
            # Check if this matches 524.00€
            if abs(calculated_reserve - Decimal('524.00')) < Decimal('0.01'):
                print(f"🎯 ΒΡΕΘΗΚΕ! Το ποσό 524,00€ προέρχεται από αυτό το κτίριο!")
                
                # Show detailed transactions
                print(f"\n💳 ΛΕΠΤΟΜΕΡΕΙΕΣ ΕΙΣΠΡΑΞΕΩΝ:")
                payments = Payment.objects.filter(apartment__building_id=building.id).order_by('date')
                for payment in payments:
                    print(f"  - {payment.date}: {payment.amount}€ (Διαμέρισμα {payment.apartment.number})")
                
                print(f"\n💸 ΛΕΠΤΟΜΕΡΕΙΕΣ ΔΑΠΑΝΩΝ:")
                expenses = Expense.objects.filter(building_id=building.id).order_by('date')
                for expense in expenses:
                    # Check what fields are available on the Expense model
                    expense_info = f"{expense.amount}€"
                    if hasattr(expense, 'title'):
                        expense_info += f" - {expense.title}"
                    elif hasattr(expense, 'name'):
                        expense_info += f" - {expense.name}"
                    elif hasattr(expense, 'category'):
                        expense_info += f" - {expense.category}"
                    print(f"  - {expense.date}: {expense_info}")
                
                # Calculate running balance
                print(f"\n📈 ΥΠΟΛΟΓΙΣΜΟΣ ΚΑΤΑΣΤΑΣΗΣ:")
                all_transactions = []
                
                # Add payments as positive
                for payment in payments:
                    all_transactions.append({
                        'date': payment.date,
                        'amount': payment.amount,
                        'type': 'payment',
                        'description': f'Πληρωμή - Διαμέρισμα {payment.apartment.number}'
                    })
                
                # Add expenses as negative
                for expense in expenses:
                    expense_info = "Δαπάνη"
                    if hasattr(expense, 'title'):
                        expense_info += f" - {expense.title}"
                    elif hasattr(expense, 'name'):
                        expense_info += f" - {expense.name}"
                    elif hasattr(expense, 'category'):
                        expense_info += f" - {expense.category}"
                    
                    all_transactions.append({
                        'date': expense.date,
                        'amount': -expense.amount,
                        'type': 'expense',
                        'description': expense_info
                    })
                
                # Sort by date
                all_transactions.sort(key=lambda x: x['date'])
                
                running_balance = Decimal('0.00')
                for transaction in all_transactions:
                    running_balance += transaction['amount']
                    print(f"  {transaction['date']}: {transaction['amount']:+8.2f}€ = {running_balance:8.2f}€ ({transaction['description']})")
                
                return True
            else:
                print(f"❌ Δεν είναι αυτό το κτίριο (αναμενόμενο: 524,00€, πραγματικό: {calculated_reserve}€)")
    
    print(f"\n❌ Δεν βρέθηκε κτίριο με αποθεματικό 524,00€")
    return False

if __name__ == "__main__":
    check_reserve_524()
