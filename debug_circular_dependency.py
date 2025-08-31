#!/usr/bin/env python3
"""
Debug Circular Dependency in Reserve Fund Logic
Investigate if Reserve Fund charges are included in pending obligations calculation.
"""

import os
import sys
import django
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction
from financial.services import CommonExpenseCalculator
from django.db import models

def debug_circular_dependency():
    """Debug if Reserve Fund creates circular dependency in pending obligations"""
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=1)
            month = '2025-08'  # Within collection period
            
            print(f"🏢 Building: {building.name}")
            print(f"🗓️  Testing month: {month}")
            print()
            
            # Get apartments
            apartments = Apartment.objects.filter(building=building)
            
            # Create calculator
            calculator = CommonExpenseCalculator(building.id, month=month)
            
            print("🔍 Analyzing transaction types that contribute to pending obligations:")
            print()
            
            # Check what types of transactions exist
            transaction_types = Transaction.objects.filter(
                apartment__building=building
            ).values_list('type', flat=True).distinct()
            
            print(f"📊 Transaction types in system: {list(transaction_types)}")
            print()
            
            # For each apartment, analyze what contributes to historical balance
            for apartment in apartments[:3]:  # Check first 3 apartments
                print(f"🏠 Apartment {apartment.number}:")
                
                # Get historical balance
                historical_balance = calculator._get_historical_balance(apartment, calculator.period_end_date)
                print(f"   Historical balance: €{historical_balance}")
                
                # Break down by transaction type
                end_datetime = calculator.period_end_date
                if end_datetime:
                    from django.utils import timezone
                    from datetime import datetime
                    end_datetime = timezone.make_aware(datetime.combine(end_datetime, datetime.max.time()))
                
                # Charges (positive amounts that increase debt)
                charges = Transaction.objects.filter(
                    apartment=apartment,
                    date__lt=end_datetime,
                    type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                             'interest_charge', 'penalty_charge']
                )
                
                print(f"   📈 Charges:")
                for charge in charges:
                    print(f"      {charge.type}: €{charge.amount} ({charge.date})")
                    if 'reserve' in charge.description.lower():
                        print(f"         ⚠️  RESERVE FUND CHARGE DETECTED!")
                
                # Payments (negative amounts that reduce debt)
                payments = Transaction.objects.filter(
                    apartment=apartment,
                    date__lt=end_datetime,
                    type__in=['common_expense_payment', 'payment_received', 'refund']
                )
                
                print(f"   📉 Payments:")
                for payment in payments:
                    print(f"      {payment.type}: €{payment.amount} ({payment.date})")
                
                print()
            
            print("🎯 Key Question: Do the charges include Reserve Fund amounts?")
            print("   If yes, then we have a circular dependency:")
            print("   1. Reserve Fund is included in charges")
            print("   2. Charges create pending obligations") 
            print("   3. Pending obligations prevent Reserve Fund collection")
            print("   4. But Reserve Fund is already in the charges!")
            print()
            
            # Test the fix: what if we exclude reserve fund from obligations check?
            print("🔧 Testing potential fix: Exclude Reserve Fund from obligations check")
            
            # Calculate obligations excluding reserve fund transactions
            total_obligations_excluding_reserve = 0
            for apt in apartments:
                historical_balance = calculator._get_historical_balance(apt, calculator.period_end_date)
                
                # Get reserve fund charges for this apartment
                reserve_charges = Transaction.objects.filter(
                    apartment=apt,
                    date__lt=end_datetime,
                    description__icontains='αποθεματικ'
                ).aggregate(total=models.Sum('amount'))['total'] or 0
                
                # Adjust balance by removing reserve fund charges
                adjusted_balance = historical_balance + reserve_charges
                
                if adjusted_balance < 0:
                    total_obligations_excluding_reserve += abs(adjusted_balance)
            
            print(f"   Total obligations (including reserve): €{sum(abs(calculator._get_historical_balance(apt, calculator.period_end_date)) for apt in apartments if calculator._get_historical_balance(apt, calculator.period_end_date) < 0)}")
            print(f"   Total obligations (excluding reserve): €{total_obligations_excluding_reserve}")
            
            if total_obligations_excluding_reserve == 0:
                print("   ✅ Fix would work! Reserve Fund could be collected.")
            else:
                print("   ❌ Fix wouldn't help - there are other pending obligations.")
                
        except Exception as e:
            print(f"❌ Error during debug: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    debug_circular_dependency()
