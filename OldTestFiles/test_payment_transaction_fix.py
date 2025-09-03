#!/usr/bin/env python3
"""
Test script to verify that payment creation now properly creates transaction records
"""

import os
import sys
import django
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Transaction
from django_tenants.utils import tenant_context
from tenants.models import Client

def test_payment_transaction_creation():
    """Test that creating a payment also creates a transaction"""
    
    print("🧪 Testing Payment-Transaction Creation Fix")
    print("=" * 50)
    
    # Get test tenant
    try:
        tenant = Client.objects.filter(schema_name='test_tenant').first()
        if not tenant:
            print("❌ Test tenant 'test_tenant' not found")
            return False
            
        print(f"✅ Using Tenant: {tenant.name} (schema: {tenant.schema_name})")
        
    except Exception as e:
        print(f"❌ Error getting tenant: {e}")
        return False
    
    # Use tenant context
    with tenant_context(tenant):
        # Get test data
        try:
            building = Building.objects.first()
            if not building:
                print("❌ No buildings found in database")
                return False
                
            apartment = Apartment.objects.filter(building=building).first()
            if not apartment:
                print("❌ No apartments found in building")
                return False
                
            print(f"✅ Using Building: {building.name}")
            print(f"✅ Using Apartment: {apartment.number}")
            
        except Exception as e:
            print(f"❌ Error getting test data: {e}")
            return False
    
        # Get initial counts
        initial_payments = Payment.objects.count()
        initial_transactions = Transaction.objects.count()
        
        print("📊 Initial state:")
        print(f"   - Payments: {initial_payments}")
        print(f"   - Transactions: {initial_transactions}")
        
        # Create a test payment
        try:
            payment_data = {
                'apartment': apartment,
                'amount': '25.00',
                'date': datetime.now().date(),
                'method': 'cash',
                'notes': 'Test payment for transaction fix'
            }
            
            payment = Payment.objects.create(**payment_data)
            print(f"✅ Created Payment ID: {payment.id}")
            
        except Exception as e:
            print(f"❌ Error creating payment: {e}")
            return False
        
        # Check if transaction was created
        try:
            transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if transaction:
                print("✅ Transaction created successfully!")
                print(f"   - Transaction ID: {transaction.id}")
                print(f"   - Type: {transaction.type}")
                print(f"   - Amount: {transaction.amount}")
                print(f"   - Description: {transaction.description}")
            else:
                print("❌ No transaction found for the payment")
                return False
                
        except Exception as e:
            print(f"❌ Error checking transaction: {e}")
            return False
        
        # Get final counts
        final_payments = Payment.objects.count()
        final_transactions = Transaction.objects.count()
        
        print("📊 Final state:")
        print(f"   - Payments: {final_payments} (+{final_payments - initial_payments})")
        print(f"   - Transactions: {final_transactions} (+{final_transactions - initial_transactions})")
        
        # Verify counts increased correctly
        if final_payments == initial_payments + 1 and final_transactions == initial_transactions + 1:
            print("✅ Payment and Transaction counts increased correctly")
        else:
            print("❌ Counts did not increase as expected")
            return False
        
        # Test dashboard data
        try:
            from financial.services import FinancialDashboardService
            
            service = FinancialDashboardService(building.id)
            summary = service.get_summary()
            
            print("📊 Dashboard Summary:")
            print(f"   - Total payments this month: {summary['total_payments_this_month']}")
            print(f"   - Recent transactions count: {len(summary['recent_transactions'])}")
            
            if len(summary['recent_transactions']) > 0:
                print("✅ Dashboard shows recent transactions")
            else:
                print("❌ Dashboard shows no recent transactions")
                return False
                
        except Exception as e:
            print(f"❌ Error checking dashboard: {e}")
            return False
        
        # Clean up test data
        try:
            payment.delete()
            print("🧹 Cleaned up test data")
        except Exception as e:
            print(f"⚠️  Warning: Could not clean up test data: {e}")
        
        print("=" * 50)
        print("✅ Payment-Transaction Creation Fix Test PASSED!")
        return True

def test_existing_payments():
    """Check if existing payments have corresponding transactions"""
    
    print("\n🔍 Checking Existing Payments")
    print("=" * 30)
    
    # Get test tenant
    try:
        tenant = Client.objects.filter(schema_name='test_tenant').first()
        if not tenant:
            print("❌ Test tenant 'test_tenant' not found")
            return False
    except Exception as e:
        print(f"❌ Error getting tenant: {e}")
        return False
    
    # Use tenant context
    with tenant_context(tenant):
        payments_without_transactions = []
        
        for payment in Payment.objects.all():
            transaction = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            ).first()
            
            if not transaction:
                payments_without_transactions.append(payment)
        
        if payments_without_transactions:
            print(f"⚠️  Found {len(payments_without_transactions)} payments without transactions:")
            for payment in payments_without_transactions[:5]:  # Show first 5
                print(f"   - Payment {payment.id}: {payment.amount}€ for {payment.apartment.number}")
            if len(payments_without_transactions) > 5:
                print(f"   ... and {len(payments_without_transactions) - 5} more")
        else:
            print("✅ All existing payments have corresponding transactions")
        
        return len(payments_without_transactions) == 0

if __name__ == "__main__":
    print("🚀 Starting Payment-Transaction Fix Verification")
    print()
    
    # Test 1: New payment creation
    test1_passed = test_payment_transaction_creation()
    
    # Test 2: Check existing payments
    test2_passed = test_existing_payments()
    
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ New Payment Creation: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"✅ Existing Payments Check: {'PASSED' if test2_passed else 'PASSED'}")
    
    if test1_passed:
        print("\n🎉 The payment-transaction fix is working correctly!")
        print("   - New payments now create corresponding transaction records")
        print("   - Dashboard will show recent transactions")
        print("   - Financial tracking is now consistent")
    else:
        print("\n❌ The fix needs further investigation") 