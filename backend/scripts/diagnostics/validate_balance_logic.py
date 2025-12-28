import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Transaction, Payment
from financial.services import FinancialDashboardService
from apartments.models import Apartment

# All database operations within tenant context
with schema_context('demo'):
    print("=== Validating Balance Transfer Logic ===")
    
    service = FinancialDashboardService(building_id=1)  # Demo building
    
    print("\n1. Testing Method 1: Apartment.previous_balance field")
    apartments = Apartment.objects.all()[:3]  # Test first 3 apartments
    
    for apartment in apartments:
        print(f"\n  🏠 Apartment {apartment.number}:")
        print(f"    stored previous_balance: €{apartment.previous_balance}")
        print(f"    stored current_balance: €{apartment.current_balance}")
    
    print("\n2. Testing Method 2: Historical calculation via FinancialDataService")
    
    test_months = ['2025-08', '2025-09']
    
    for month in test_months:
        print(f"\n  📅 Month: {month}")
        
        # Get apartment balances using service
        balances = service.get_apartment_balances(month)
        
        for balance_data in balances[:3]:  # First 3 apartments
            apartment_id = balance_data['id']
            apartment = Apartment.objects.get(id=apartment_id)
            
            print(f"    🏠 Apartment {apartment.number}:")
            print(f"      Service current_balance: €{balance_data.get('current_balance', 0)}")
            print(f"      Database current_balance: €{apartment.current_balance}")
            
            # Calculate difference
            service_balance = Decimal(str(balance_data.get('current_balance', 0)))
            db_balance = apartment.current_balance or Decimal('0.00')
            difference = abs(service_balance - db_balance)
            
            if difference > Decimal('0.01'):  # Allow for small rounding differences
                print(f"      ⚠️  MISMATCH: Difference of €{difference}")
            else:
                print(f"      ✅ MATCH: Balances align")
    
    print("\n3. Testing Previous Balance Calculation Logic")
    
    # Test the specific logic from apartments-with-financial-data endpoint
    test_month = '2025-09'
    print(f"\n  Testing previous balance for {test_month}")
    
    # Extract year and month
    year, mon = map(int, test_month.split('-'))
    if mon == 1:
        prev_month = f"{year-1}-12"
    else:
        prev_month = f"{year}-{mon-1:02d}"
    
    print(f"  Previous month calculated: {prev_month}")
    
    # Get balances for previous month
    prev_balances = service.get_apartment_balances(prev_month)
    prev_balance_dict = {b['id']: b['current_balance'] for b in prev_balances}
    
    print(f"  Found {len(prev_balance_dict)} apartment balances for {prev_month}")
    
    for apartment in apartments:
        calculated_prev_balance = Decimal(str(prev_balance_dict.get(apartment.id, 0)))
        stored_prev_balance = apartment.previous_balance or Decimal('0.00')
        
        print(f"    🏠 Apartment {apartment.number}:")
        print(f"      Calculated previous balance: €{calculated_prev_balance}")
        print(f"      Stored previous balance: €{stored_prev_balance}")
        
        if abs(calculated_prev_balance - stored_prev_balance) > Decimal('0.01'):
            print(f"      ⚠️  MISMATCH: Need to sync previous_balance field")
        else:
            print(f"      ✅ MATCH: Previous balances align")
    
    print("\n4. Testing Transaction-Based Balance Verification")
    
    for apartment in apartments:
        print(f"\n  🏠 Apartment {apartment.number}:")
        
        # Get all transactions for this apartment
        all_transactions = Transaction.objects.filter(apartment=apartment).order_by('date')
        
        # Calculate balance from transactions
        calculated_balance = Decimal('0.00')
        for tx in all_transactions:
            if tx.type in ['payment_received']:
                calculated_balance += tx.amount  # Credit
            elif tx.type in ['common_expense_charge', 'expense_created', 'expense_issued']:
                calculated_balance -= tx.amount  # Debit
        
        stored_balance = apartment.current_balance or Decimal('0.00')
        
        print(f"    Transaction count: {all_transactions.count()}")
        print(f"    Calculated from transactions: €{calculated_balance}")
        print(f"    Stored current_balance: €{stored_balance}")
        
        difference = abs(calculated_balance - stored_balance)
        if difference > Decimal('0.01'):
            print(f"    ⚠️  MISMATCH: Difference of €{difference}")
            print(f"    Last few transactions:")
            for tx in all_transactions.order_by('-date')[:3]:
                print(f"      - {tx.date}: {tx.type} €{tx.amount} | {tx.description[:50]}")
        else:
            print(f"    ✅ MATCH: Transaction history aligns with stored balance")
    
    print("\n5. Testing Payment Applications to Previous Obligations")
    
    payments_with_previous = Payment.objects.filter(
        previous_obligations_amount__gt=0
    ).order_by('-date')[:5]
    
    print(f"\n  Found {payments_with_previous.count()} payments with previous obligations amount")
    
    for payment in payments_with_previous:
        print(f"    💰 Payment ID {payment.id} - Apartment {payment.apartment.number}")
        print(f"      Total amount: €{payment.amount}")
        print(f"      Previous obligations: €{payment.previous_obligations_amount}")
        print(f"      Date: {payment.date}")
        
        # Check if there's a corresponding transaction
        payment_tx = Transaction.objects.filter(
            reference_id=str(payment.id),
            reference_type='payment'
        ).first()
        
        if payment_tx:
            print(f"      ✅ Found corresponding transaction: €{payment_tx.amount}")
        else:
            print(f"      ❌ Missing transaction record")
    
    print("\n=== Validation Complete ===")
    print("\n🔍 Key Findings:")
    print("  - Method 1: Uses stored Apartment.previous_balance field")
    print("  - Method 2: Calculates dynamically via FinancialDataService")
    print("  - Both methods should be cross-validated for consistency")
    print("  - Transaction history provides audit trail for balance verification")
    print("  - Payment.previous_obligations_amount tracks specific previous debt payments")