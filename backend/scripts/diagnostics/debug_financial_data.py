import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Apartment, Expense, Payment
from buildings.models import Building
from financial.services import FinancialDashboardService
from decimal import Decimal
from django.db.models import Sum

def debug_financial_data():
    """Debug financial data for both buildings"""
    
    with schema_context('demo'):
        # Check both buildings
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n📊 ANALYZING BUILDING: {building.name} (ID: {building.id})")
            print("=" * 60)
            
            apartments = Apartment.objects.filter(building_id=building.id)
            
            # 1. Check apartment balances
            print("\n1. ΑΠΑΡΤΜΕΝΤ BALANCES:")
            total_apartment_debts = Decimal('0.00')
            for apt in apartments:
                balance = apt.current_balance or Decimal('0.00')
                if balance < 0:
                    total_apartment_debts += abs(balance)
                print(f"   Apartment {apt.number}: {balance:,.2f}€")
            
            print(f"   Total apartment debts: {total_apartment_debts:,.2f}€")
            
            # 2. Check total expenses
            total_expenses = Expense.objects.filter(building_id=building.id).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            print(f"\n2. TOTAL EXPENSES: {total_expenses:,.2f}€")
            
            # 3. Check total payments
            total_payments = Payment.objects.filter(
                apartment__building_id=building.id
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            print(f"\n3. TOTAL PAYMENTS: {total_payments:,.2f}€")
            
            # 4. Check management fees
            management_fee_per_apartment = building.management_fee_per_apartment or Decimal('0.00')
            apartments_count = apartments.count()
            total_management_cost = management_fee_per_apartment * apartments_count
            print("\n4. MANAGEMENT FEES:")
            print(f"   Per apartment: {management_fee_per_apartment:,.2f}€")
            print(f"   Total: {total_management_cost:,.2f}€")
            
            # 5. Calculate current reserve
            current_reserve = total_payments - total_expenses - total_management_cost
            print(f"\n5. CURRENT RESERVE: {current_reserve:,.2f}€")
            
            # 6. Calculate total obligations
            total_obligations = total_apartment_debts + total_management_cost
            print(f"\n6. TOTAL OBLIGATIONS: {total_obligations:,.2f}€")
            
            # 7. Check the API response
            print("\n7. API RESPONSE:")
            try:
                service = FinancialDashboardService(building.id)
                api_response = service.get_summary()
                print(f"   API previous_obligations: {api_response.get('previous_obligations', 'NOT FOUND'):,.2f}€")
                print(f"   API total_balance: {api_response.get('total_balance', 'NOT FOUND'):,.2f}€")
                print(f"   API current_obligations: {api_response.get('current_obligations', 'NOT FOUND'):,.2f}€")
                print(f"   API current_reserve: {api_response.get('current_reserve', 'NOT FOUND'):,.2f}€")
                
                # Check if the API values match our calculations
                api_previous = api_response.get('previous_obligations', 0)
                if abs(api_previous - float(total_apartment_debts)) < 0.01:
                    print("   ✅ API previous_obligations matches our calculation!")
                else:
                    print(f"   ❌ API previous_obligations ({api_previous:,.2f}€) doesn't match our calculation ({total_apartment_debts:,.2f}€)")
                    
            except Exception as e:
                print(f"   ❌ Error getting API response: {e}")
            
            print("\n" + "=" * 60)

if __name__ == "__main__":
    debug_financial_data()
