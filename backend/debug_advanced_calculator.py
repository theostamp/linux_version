import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.services import AdvancedCommonExpenseCalculator

def debug_calculator(building_id: int, year: int, month: int):
    print(f"--- Running AdvancedCommonExpenseCalculator for Building ID: {building_id}, Period: {year}-{month} ---")
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=building_id)
            period_start_date = date(year, month, 1)
            
            # Instantiate the calculator
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building.id,
                period_start_date=period_start_date
            )
            
            # Run the calculation
            shares_data = calculator.calculate_shares()
            
            print(f"\n--- Calculation Results for {building.name} ---")
            print(f"Period: {shares_data['period_start_date']} to {shares_data['period_end_date']}")
            print(f"Total Expenses for Period: {shares_data['total_expenses_period']:.2f} €")
            print(f"Reserve Fund Monthly Total: {shares_data['reserve_fund_monthly_total']:.2f} €")
            
            print("\n--- Apartment Breakdown ---")
            for apartment_id, data in shares_data['shares'].items():
                print(f"\nApartment: {data['apartment_number']} (ID: {apartment_id})")
                print(f"  Previous Balance: {data['previous_balance']:.2f} €")
                print(f"  Total Share for this period: {data['total_amount']:.2f} €")
                print(f"  New Total Due: {data['total_due']:.2f} €")
                print("  Breakdown:")
                for key, value in data['breakdown'].items():
                    if isinstance(value, Decimal) and value > 0:
                        print(f"    - {key}: {value:.2f} €")
                
                if data['heating_breakdown']['fixed_cost'] > 0 or data['heating_breakdown']['variable_cost'] > 0:
                    print("  Heating Breakdown:")
                    print(f"    - Fixed: {data['heating_breakdown']['fixed_cost']:.2f} €")
                    print(f"    - Variable: {data['heating_breakdown']['variable_cost']:.2f} €")
                    print(f"    - Consumption: {data['heating_breakdown']['consumption_hours']} hours")

        except Building.DoesNotExist:
            print(f"Error: Building with ID {building_id} not found.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    # --- Configuration ---
    # Set the Building ID and the period you want to investigate
    # Building ID 1: Αραχώβης 12, Αθήνα 106 80
    # Building ID 2: Αλκμάνος 22, Αθήνα 115 28
    TARGET_BUILDING_ID = 1
    TARGET_YEAR = 2024
    TARGET_MONTH = 7  # July
    
    debug_calculator(TARGET_BUILDING_ID, TARGET_YEAR, TARGET_MONTH)
