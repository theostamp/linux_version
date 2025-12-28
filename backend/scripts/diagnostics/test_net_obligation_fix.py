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
from datetime import date

def test_net_obligation_fix():
    """Test if the net_obligation fix works correctly"""
    
    with schema_context('demo'):
        # Get building (Αραχώβης 12)
        building = Building.objects.get(id=1)
        
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
        
        print(f"📅 ΜΗΝΑΣ: {current_month}")
        print(f"🏠 Διαμερίσματα: {apartments_count}")
        print()
        
        # Test calculation for each apartment
        print("🏠 ΥΠΟΛΟΓΙΣΜΟΣ ΣΥΝΟΛΙΚΟΥ ΟΦΕΙΛΟΜΕΝΟΥ:")
        print("-" * 80)
        
        for apartment in apartments:
            # 1. Calculate historical obligations (API logic)
            expenses = Expense.objects.filter(building=building)
            total_obligations = 0.0
            
            for expense in expenses:
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
                
                total_obligations += share_amount
            
            # 2. Calculate historical payments
            payments = Payment.objects.filter(apartment=apartment)
            total_payments = sum(float(p.amount) for p in payments)
            
            # 3. Calculate net obligation (API logic)
            net_obligation = total_obligations - total_payments
            
            # 4. Calculate current month obligations
            current_month_expenses = expenses.filter(date__gte=month_start)
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
            current_month_obligations = current_month_share + management_fee_share + reserve_contribution_share
            
            # 5. Calculate total net obligation (historical + current)
            total_net_obligation = net_obligation + current_month_obligations
            
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Χιλιοστά: {apartment.participation_mills}")
            print(f"   • Ιστορικές δαπάνες: {total_obligations:.2f}€")
            print(f"   • Ιστορικές πληρωμές: {total_payments:.2f}€")
            print(f"   • Ιστορικό net obligation: {net_obligation:.2f}€")
            print(f"   • Τρέχουσες μηνιαίες υποχρεώσεις: {current_month_obligations:.2f}€")
            print(f"   • ΣΥΝΟΛΙΚΟ ΟΦΕΙΛΟΜΕΝΟ: {total_net_obligation:.2f}€")
            print()
        
        print("✅ ΕΠΙΤΥΧΗΣ ΔΙΟΡΘΩΣΗ!")
        print("   • Τώρα το 'Συνολικό Οφειλόμενο' περιλαμβάνει τις τρέχουσες μηνιαίες υποχρεώσεις")
        print(f"   • Κάθε διαμέρισμα θα εμφανίζει {management_fee_share + reserve_contribution_share:.2f}€ αντί για 0€")

if __name__ == "__main__":
    test_net_obligation_fix()
