#!/usr/bin/env python3
"""
Check payments in demo tenant
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append('/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment
from apartments.models import Apartment
from datetime import datetime

def check_payments():
    """Check payments in demo tenant"""
    
    with schema_context('demo'):
        print("🔍 Checking payments in demo tenant...")
        
        # Check apartments
        apartments = Apartment.objects.filter(building_id=3)
        print(f"✅ Found {apartments.count()} apartments in building 3")
        
        for apt in apartments[:3]:
            print(f"   - Apartment {apt.id}: {apt.number}")
        
        # Check payments
        payments = Payment.objects.filter(apartment__building_id=3).order_by('-created_at')
        print(f"✅ Found {payments.count()} payments in building 3")
        
        for payment in payments[:5]:
            print(f"   - Payment {payment.id}: {payment.amount}€ on {payment.date} (created: {payment.created_at})")
        
        # Check current month
        current_month = datetime.now().replace(day=1)
        current_month_payments = Payment.objects.filter(
            apartment__building_id=3,
            date__gte=current_month
        )
        print(f"✅ Found {current_month_payments.count()} payments in current month ({current_month.strftime('%Y-%m')})")
        
        for payment in current_month_payments:
            print(f"   - Payment {payment.id}: {payment.amount}€ on {payment.date}")

if __name__ == "__main__":
    check_payments() 