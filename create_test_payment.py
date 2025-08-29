#!/usr/bin/env python3
"""
Create a test payment to verify progress bar updates
"""

import os
import sys
import django
from datetime import date
from django.utils import timezone

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal

def create_test_payment():
    """Create a test payment for apartment A1 in building 1"""
    
    with schema_context('demo'):
        print("🔍 Creating test payment...")
        
        # Get building 1
        try:
            building = Building.objects.get(id=1)
            print(f"✅ Building found: {building.name}")
        except Building.DoesNotExist:
            print("❌ Building 1 not found")
            return
        
        # Find apartment A1 or Α1
        apartment = None
        for apt_number in ['A1', 'Α1', '1', 'A-1']:
            try:
                apartment = Apartment.objects.get(
                    building=building, 
                    number=apt_number
                )
                print(f"✅ Found apartment: {apartment.number}")
                break
            except Apartment.DoesNotExist:
                continue
        
        if not apartment:
            # Get first apartment
            apartment = Apartment.objects.filter(building=building).first()
            if apartment:
                print(f"✅ Using first apartment: {apartment.number}")
            else:
                print("❌ No apartments found")
                return
        
        # Check existing payments for this apartment
        existing_payments = Payment.objects.filter(apartment=apartment).count()
        print(f"📊 Existing payments for apartment {apartment.number}: {existing_payments}")
        
        # Create test payment
        test_amount = Decimal('220.00')  # Common expenses amount
        
        payment = Payment.objects.create(
            apartment=apartment,
            amount=test_amount,
            date=timezone.now().date(),
            method='cash',
            payment_type='common_expense',
            payer_type='owner',
            payer_name=apartment.owner_name or 'Test Payer',
            notes='Test payment for progress bar verification'
        )
        
        print(f"✅ Created test payment:")
        print(f"  - ID: {payment.id}")
        print(f"  - Apartment: {payment.apartment.number}")
        print(f"  - Amount: {payment.amount}€")
        print(f"  - Date: {payment.date}")
        print(f"  - Method: {payment.method}")
        print(f"  - Type: {payment.payment_type}")
        
        # Verify payment was created
        total_payments = Payment.objects.filter(apartment__building=building).count()
        total_amount = sum(p.amount for p in Payment.objects.filter(apartment__building=building))
        
        print(f"\n📈 Building totals after payment:")
        print(f"  - Total payments: {total_payments}")
        print(f"  - Total amount: {total_amount}€")
        
        print(f"\n🎯 Now test the frontend:")
        print(f"  1. Open the financial page for building {building.id}")
        print(f"  2. Go to 'Προοδος Εισπράξεων' tab")
        print(f"  3. The progress bar should show {test_amount}€ in payments")
        print(f"  4. Coverage should be > 0%")

if __name__ == "__main__":
    create_test_payment()
