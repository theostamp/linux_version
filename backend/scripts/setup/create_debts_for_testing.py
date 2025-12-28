#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Δημιουργία οφειλών για δοκιμή της πλήρους λειτουργικότητας του φύλλου κοινοχρήστων
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction
from apartments.models import Apartment
from buildings.models import Building

def create_debts_for_testing():
    """Δημιουργία οφειλών για δοκιμή"""
    
    with schema_context('demo'):
        print("💰 ΔΗΜΙΟΥΡΓΙΑ ΟΦΕΙΛΩΝ ΓΙΑ ΔΟΚΙΜΗ")
        print("=" * 50)
        
        # Βρες το κτίριο Αλκμάνος 22
        building = Building.objects.get(name__icontains="Αλκμάνος")
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Δημιουργία οφειλών για κάποια διαμερίσματα
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        # Δημιουργία οφειλών για τα διαμερίσματα 1, 3, 5, 7, 9
        debts_data = [
            {'apartment_number': '1', 'debt_amount': Decimal('150.00')},
            {'apartment_number': '3', 'debt_amount': Decimal('85.50')},
            {'apartment_number': '5', 'debt_amount': Decimal('220.75')},
            {'apartment_number': '7', 'debt_amount': Decimal('95.20')},
            {'apartment_number': '9', 'debt_amount': Decimal('180.30')}
        ]
        
        print("📉 ΔΗΜΙΟΥΡΓΙΑ ΟΦΕΙΛΩΝ")
        print("-" * 30)
        
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
        
        print("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΗΜΙΟΥΡΓΙΑ ΟΦΕΙΛΩΝ")
        print("🔄 Τώρα μπορείτε να εκτελέσετε ξανά το analyze_common_expenses_sheet.py")

if __name__ == "__main__":
    create_debts_for_testing()
