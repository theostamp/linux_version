#!/usr/bin/env python3
"""
Έλεγχος διαμερισμάτων με μηδενικό προηγούμενο υπόλοιπο
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def check_zero_balance_apartments():
    """Έλεγχος διαμερισμάτων με μηδενικό προηγούμενο υπόλοιπο"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from financial.models import Transaction
        from buildings.models import Building
        
        print("🔍 ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ ΜΕ ΜΗΔΕΝΙΚΟ ΥΠΟΛΟΙΠΟ")
        print("=" * 60)
        
        # Τρέχων μήνας (Αύγουστος 2025)
        current_month = "2025-08"
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name} (ID: {building.id})")
            print(f"📍 Διεύθυνση: {building.address}")
            
            apartments = Apartment.objects.filter(building=building)
            
            for apartment in apartments:
                # Υπολογισμός προηγούμενου υπολοίπου
                transactions = Transaction.objects.filter(
                    apartment=apartment,
                    date__lt=month_start
                ).order_by('date', 'id')
                
                running_balance = Decimal("0.00")
                
                for transaction in transactions:
                    if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                        running_balance += transaction.amount
                    elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                            'interest_charge', 'penalty_charge']:
                        running_balance -= transaction.amount
                    elif transaction.type == 'balance_adjustment':
                        if transaction.balance_after is not None:
                            running_balance = transaction.balance_after
                
                previous_balance = running_balance
                
                # Ελέγχος αν το προηγούμενο υπόλοιπο είναι κοντά στο μηδέν
                if abs(previous_balance) < Decimal("0.01"):
                    print(f"   ✅ {apartment.number}: {apartment.owner_name} - Προηγ. υπόλοιπο: {previous_balance:,.2f}€")
                else:
                    print(f"   ❌ {apartment.number}: {apartment.owner_name} - Προηγ. υπόλοιπο: {previous_balance:,.2f}€")

if __name__ == "__main__":
    check_zero_balance_apartments()
