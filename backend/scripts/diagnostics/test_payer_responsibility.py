#!/usr/bin/env python
"""
Test script to verify payer_responsibility is correctly included in expense_breakdown
Run with: python manage.py shell < test_payer_responsibility.py
Or: python manage.py shell
>>> exec(open('test_payer_responsibility.py').read())
"""

from financial.models import Expense
from financial.views import apartment_balances
from buildings.models import Building, Apartment
from decimal import Decimal
from datetime import date

# Get a building and apartment for testing
try:
    building = Building.objects.first()
    if not building:
        print("❌ No buildings found. Please create a building first.")
        exit(1)
    
    apartment = Apartment.objects.filter(building=building).first()
    if not apartment:
        print(f"❌ No apartments found for building {building.name}. Please create an apartment first.")
        exit(1)
    
    print(f"✅ Using building: {building.name} (ID: {building.id})")
    print(f"✅ Using apartment: {apartment.number} (ID: {apartment.id})")
    
    # Create a test expense with payer_responsibility='owner' (e.g., project expense)
    test_expense = Expense.objects.create(
        building=building,
        title="Test Project Expense - Owner Responsibility",
        category='projects',
        amount=Decimal('500.00'),
        date=date.today(),
        payer_responsibility='owner',
        distribution_type='mills',
        approved=True
    )
    print(f"\n✅ Created test expense: {test_expense.title} (ID: {test_expense.id})")
    print(f"   Amount: €{test_expense.amount}")
    print(f"   Category: {test_expense.category}")
    print(f"   Payer Responsibility: {test_expense.payer_responsibility}")
    
    # Get apartment balances for current month
    from django.http import HttpRequest
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    user = User.objects.first()
    
    if not user:
        print("\n❌ No users found. Please create a user first.")
        exit(1)
    
    # Create a mock request
    request = HttpRequest()
    request.method = 'GET'
    request.user = user
    request.GET = {'building_id': str(building.id), 'apartment_id': str(apartment.id)}
    
    # Call the apartment_balances view
    print("\n📊 Fetching apartment balances...")
    response = apartment_balances(request)
    
    if response.status_code == 200:
        import json
        data = json.loads(response.content)
        
        # Find the apartment data
        apartment_data = None
        for apt in data.get('apartments', []):
            if apt['apartment_id'] == apartment.id:
                apartment_data = apt
                break
        
        if apartment_data:
            print(f"\n✅ Found apartment data for apartment {apartment.number}")
            print(f"   Total Obligations: €{apartment_data.get('total_obligations', 0):.2f}")
            
            # Check expense_breakdown
            expense_breakdown = apartment_data.get('expense_breakdown', [])
            print(f"\n📋 Expense Breakdown ({len(expense_breakdown)} items):")
            
            found_test_expense = False
            for expense in expense_breakdown:
                payer = expense.get('payer_responsibility', 'NOT SET')
                title = expense.get('expense_title', 'Unknown')
                amount = expense.get('share_amount', 0)
                
                if expense.get('expense_id') == test_expense.id:
                    found_test_expense = True
                    print(f"   ✅ {title}")
                    print(f"      Amount: €{amount:.2f}")
                    print(f"      Payer Responsibility: {payer}")
                    
                    if payer == 'owner':
                        print(f"      ✅ CORRECT: Expense correctly marked as 'owner'")
                    else:
                        print(f"      ❌ ERROR: Expected 'owner', got '{payer}'")
                else:
                    print(f"   • {title}: €{amount:.2f} (payer: {payer})")
            
            if not found_test_expense:
                print(f"\n⚠️  Test expense not found in breakdown. This might be because:")
                print(f"   - The expense is not in the current month")
                print(f"   - The apartment has no mills assigned")
                print(f"   - The expense is filtered out")
            
            # Summary
            owner_expenses = [e for e in expense_breakdown if e.get('payer_responsibility') == 'owner']
            resident_expenses = [e for e in expense_breakdown if e.get('payer_responsibility') == 'resident']
            
            print(f"\n📊 Summary:")
            print(f"   Owner expenses: {len(owner_expenses)}")
            print(f"   Resident expenses: {len(resident_expenses)}")
            print(f"   Total breakdown items: {len(expense_breakdown)}")
            
        else:
            print(f"\n❌ Apartment {apartment.number} not found in response")
    else:
        print(f"\n❌ API call failed with status {response.status_code}")
        print(f"   Response: {response.content.decode()}")
    
    # Cleanup: Delete test expense
    print(f"\n🧹 Cleaning up test expense...")
    test_expense.delete()
    print(f"✅ Test expense deleted")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()

