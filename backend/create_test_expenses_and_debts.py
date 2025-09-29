#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Δημιουργία δοκιμαστικών δαπανών και οφειλών για το φύλλο κοινοχρήστων
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction, Payment
from apartments.models import Apartment
from buildings.models import Building

def create_test_expenses_and_debts():
    """Δημιουργία δοκιμαστικών δαπανών και οφειλών"""
    
    with schema_context('demo'):
        print("🔧 ΔΗΜΙΟΥΡΓΙΑ ΔΟΚΙΜΑΣΤΙΚΩΝ ΔΑΠΑΝΩΝ ΚΑΙ ΟΦΕΙΛΩΝ")
        print("=" * 60)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(name__icontains="Αλκμάνος")
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Δημιουργία δαπανών για τον Αύγουστο 2025
        print("📋 ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΩΝ ΑΥΓΟΥΣΤΟΥ 2025")
        print("-" * 40)
        
        expenses_data = [
            {
                'title': 'ΔΕΗ Κοινοχρήστων - Αύγουστος 2025',
                'amount': Decimal('450.00'),
                'distribution_type': 'by_participation_mills',
                'category': 'electricity',
                'date': date(2025, 8, 15)
            },
            {
                'title': 'Καθαρισμός Κοινοχρήστων Χώρων - Αύγουστος 2025',
                'amount': Decimal('280.00'),
                'distribution_type': 'equal_share',
                'category': 'cleaning',
                'date': date(2025, 8, 10)
            },
            {
                'title': 'Συντήρηση Ανελκυστήρα - Αύγουστος 2025',
                'amount': Decimal('180.00'),
                'distribution_type': 'by_participation_mills',
                'category': 'elevator',
                'date': date(2025, 8, 5)
            },
            {
                'title': 'Νερό Κοινοχρήστων - Αύγουστος 2025',
                'amount': Decimal('120.00'),
                'distribution_type': 'by_participation_mills',
                'category': 'water',
                'date': date(2025, 8, 12)
            }
        ]
        
        created_expenses = []
        for exp_data in expenses_data:
            expense = Expense.objects.create(
                building=building,
                title=exp_data['title'],
                amount=exp_data['amount'],
                distribution_type=exp_data['distribution_type'],
                category=exp_data['category'],
                date=exp_data['date'],
                notes=f"Δαπάνη {exp_data['title']} για τον Αύγουστο 2025"
            )
            created_expenses.append(expense)
            print(f"✅ Δημιουργήθηκε: {expense.title} - {expense.amount}€")
        
        print(f"\n📊 Συνολικές Δαπάνες: {sum(exp.amount for exp in created_expenses)}€")
        print()
        
        # Δημιουργία οφειλών για κάποια διαμερίσματα
        print("💰 ΔΗΜΙΟΥΡΓΙΑ ΟΦΕΙΛΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 40)
        
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        # Δημιουργία οφειλών για τα πρώτα 3 διαμερίσματα
        debts_data = [
            {'apartment_number': '1', 'debt_amount': Decimal('45.50')},
            {'apartment_number': '2', 'debt_amount': Decimal('120.00')},
            {'apartment_number': '3', 'debt_amount': Decimal('78.30')},
            {'apartment_number': '7', 'debt_amount': Decimal('95.20')},
            {'apartment_number': '10', 'debt_amount': Decimal('62.80')}
        ]
        
        for debt_data in debts_data:
            apartment = apartments.get(number=debt_data['apartment_number'])
            if apartment:
                # Δημιουργία αρνητικής συναλλαγής για την οφειλή
                transaction = Transaction.objects.create(
                    building=building,
                    apartment=apartment,
                    amount=-debt_data['debt_amount'],  # Αρνητικό ποσό = οφειλή
                    type='expense_created',
                    description=f"Οφειλή προηγούμενων μηνών - {debt_data['apartment_number']}",
                    date=datetime(2025, 7, 31, 12, 0, 0),  # Τέλος Ιουλίου
                    balance_before=apartment.current_balance or Decimal('0.00'),
                    balance_after=(apartment.current_balance or Decimal('0.00')) - debt_data['debt_amount']
                )
                
                # Ενημέρωση του υπολοίπου του διαμερίσματος
                apartment.current_balance = (apartment.current_balance or Decimal('0.00')) - debt_data['debt_amount']
                apartment.save()
                
                print(f"💰 Δημιουργήθηκε οφειλή: Διαμέρισμα {apartment.number} - {debt_data['debt_amount']}€")
        
        print()
        
        # Δημιουργία πληρωμών για κάποια διαμερίσματα
        print("💳 ΔΗΜΙΟΥΡΓΙΑ ΠΛΗΡΩΜΩΝ")
        print("-" * 30)
        
        payments_data = [
            {'apartment_number': '4', 'payment_amount': Decimal('25.00')},
            {'apartment_number': '6', 'payment_amount': Decimal('35.50')},
            {'apartment_number': '8', 'payment_amount': Decimal('18.75')}
        ]
        
        for payment_data in payments_data:
            apartment = apartments.get(number=payment_data['apartment_number'])
            if apartment:
                # Δημιουργία πληρωμής
                payment = Payment.objects.create(
                    apartment=apartment,
                    amount=payment_data['payment_amount'],
                    method='cash',
                    notes=f"Μερική πληρωμή - {payment_data['apartment_number']}",
                    date=date(2025, 8, 20)
                )
                
                # Δημιουργία θετικής συναλλαγής
                transaction = Transaction.objects.create(
                    building=building,
                    apartment=apartment,
                    amount=payment_data['payment_amount'],
                    type='payment_received',
                    description=f"Πληρωμή - {payment_data['apartment_number']}",
                    date=datetime(2025, 8, 20, 12, 0, 0),
                    balance_before=apartment.current_balance or Decimal('0.00'),
                    balance_after=(apartment.current_balance or Decimal('0.00')) + payment_data['payment_amount']
                )
                
                # Ενημέρωση του υπολοίπου του διαμερίσματος
                apartment.current_balance = (apartment.current_balance or Decimal('0.00')) + payment_data['payment_amount']
                apartment.save()
                
                print(f"💳 Δημιουργήθηκε πληρωμή: Διαμέρισμα {apartment.number} - {payment_data['payment_amount']}€")
        
        print()
        
        # Εμφάνιση τελικής κατάστασης
        print("📊 ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        print("-" * 40)
        
        total_balance = Decimal('0.00')
        apartments_with_debts = 0
        apartments_with_credits = 0
        
        for apt in apartments:
            current_balance = apt.current_balance or Decimal('0.00')
            total_balance += current_balance
            
            if current_balance < 0:
                apartments_with_debts += 1
                print(f"📉 {apt.number}: {apt.owner_name} - Οφειλή: {abs(current_balance):,.2f}€")
            elif current_balance > 0:
                apartments_with_credits += 1
                print(f"📈 {apt.number}: {apt.owner_name} - Πιστωτικό: {current_balance:,.2f}€")
            else:
                print(f"⚖️ {apt.number}: {apt.owner_name} - Μηδενικό: {current_balance:,.2f}€")
        
        print()
        print("📈 ΣΤΑΤΙΣΤΙΚΑ ΣΥΝΟΛΟΥ:")
        print(f"💰 Συνολικό Υπόλοιπο: {total_balance:,.2f}€")
        print(f"📉 Διαμερίσματα με Οφειλές: {apartments_with_debts}")
        print(f"📈 Διαμερίσματα με Πιστωτικό: {apartments_with_credits}")
        print(f"⚖️ Διαμερίσματα Μηδενικό: {apartments.count() - apartments_with_debts - apartments_with_credits}")
        print()
        
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ ΔΟΚΙΜΑΣΤΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
        print("🔄 Τώρα μπορείτε να εκτελέσετε ξανά το analyze_common_expenses_sheet.py")

if __name__ == "__main__":
    create_test_expenses_and_debts()
