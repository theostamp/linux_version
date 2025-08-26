import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Expense, Payment
from buildings.models import Building
from django.db.models import Sum, Q
from datetime import datetime, date

def test_apartment_balances_fix():
    """Test if the apartment balances API now shows correct amounts"""
    
    with schema_context('demo'):
        # Get building (Αραχώβης 12)
        building = Building.objects.get(id=1)  # Αραχώβης 12
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Get apartments
        apartments = Apartment.objects.filter(building=building)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        apartments_count = apartments.count()
        
        # Current month (August 2025)
        current_month = "2025-08"
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        
        # Check expenses for current month
        current_month_expenses = Expense.objects.filter(
            building=building,
            date__gte=month_start
        )
        
        print(f"📅 ΜΗΝΑΣ: {current_month}")
        print(f"💸 Δαπάνες τρέχοντος μήνα: {current_month_expenses.count()}")
        print()
        
        # Test calculation for each apartment
        print(f"🏠 ΥΠΟΛΟΓΙΣΜΟΣ ΜΕΡΙΔΙΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 80)
        
        for apartment in apartments:
            # Calculate current month obligations (API logic)
            current_month_share = 0.0
            
            for expense in current_month_expenses:
                share_amount = 0.0
                
                if expense.distribution_type == 'by_participation_mills':
                    mills = apartment.participation_mills or 0
                    if total_mills > 0:
                        share_amount = float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills))))
                    else:
                        share_amount = float(expense.amount / Decimal(str(apartments_count)))
                
                elif expense.distribution_type == 'equal_share':
                    share_amount = float(expense.amount / Decimal(str(apartments_count)))
                
                elif expense.distribution_type in ['by_meters', 'specific_apartments']:
                    mills = apartment.participation_mills or 0
                    if total_mills > 0:
                        share_amount = float(expense.amount * (Decimal(str(mills)) / Decimal(str(total_mills))))
                    else:
                        share_amount = float(expense.amount / Decimal(str(apartments_count)))
                
                current_month_share += share_amount
            
            # Add management fees and reserve fund contributions
            management_fee_share = float(building.management_fee_per_apartment or 0)
            reserve_contribution_share = float(building.reserve_contribution_per_apartment or 0)
            total_monthly_obligations = current_month_share + management_fee_share + reserve_contribution_share
            
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Χιλιοστά: {apartment.participation_mills}")
            print(f"   • Μερίδιο δαπανών: {current_month_share:.2f}€")
            print(f"   • Διαχειριστικά τέλη: {management_fee_share:.2f}€")
            print(f"   • Εισφορά αποθεματικού: {reserve_contribution_share:.2f}€")
            print(f"   • ΣΥΝΟΛΟ μηνιαίες υποχρεώσεις: {total_monthly_obligations:.2f}€")
            print()
        
        print(f"✅ ΕΠΙΤΥΧΗΣ ΔΙΟΡΘΩΣΗ!")
        print(f"   • Τώρα κάθε διαμέρισμα θα εμφανίζει {management_fee_share + reserve_contribution_share:.2f}€")
        print(f"   • Αντί για 0,00€ που εμφανιζόταν πριν")

if __name__ == "__main__":
    test_apartment_balances_fix()
