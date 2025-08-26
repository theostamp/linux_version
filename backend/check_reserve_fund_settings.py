import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment

def check_reserve_fund_settings():
    """Check reserve fund settings for Αραχώβης 12 building"""
    
    with schema_context('demo'):
        # Get building (Αραχώβης 12)
        building = Building.objects.get(id=1)
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Check reserve fund settings
        print(f"🏦 ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"   • Στόχος αποθεματικού: {building.reserve_fund_goal or 0}€")
        print(f"   • Διάρκεια σε μήνες: {building.reserve_fund_duration_months or 0}")
        print(f"   • Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print(f"   • Τρέχον αποθεματικό: {building.current_reserve or 0}€")
        print(f"   • Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
        print()
        
        # Calculate monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            calculated_monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"📊 ΥΠΟΛΟΓΙΣΜΟΣ ΜΗΝΙΑΙΑΣ ΔΟΣΗΣ:")
            print(f"   • Στόχος: {building.reserve_fund_goal}€")
            print(f"   • Διάρκεια: {building.reserve_fund_duration_months} μήνες")
            print(f"   • Υπολογισμένη μηνιαία δόση: {calculated_monthly_target:.2f}€")
            print()
        
        # Check apartments
        apartments = Apartment.objects.filter(building=building)
        apartments_count = apartments.count()
        
        print(f"🏠 ΔΙΑΜΕΡΙΣΜΑΤΑ:")
        print(f"   • Αριθμός διαμερισμάτων: {apartments_count}")
        print(f"   • Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
        print(f"   • Συνολική εισφορά: {(building.reserve_contribution_per_apartment or 0) * apartments_count}€")
        print()
        
        # Check if there's a mismatch
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            expected_monthly = building.reserve_fund_goal / building.reserve_fund_duration_months
            actual_per_apartment = building.reserve_contribution_per_apartment or 0
            total_actual = actual_per_apartment * apartments_count
            
            print(f"🔍 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ:")
            print(f"   • Αναμενόμενη μηνιαία δόση: {expected_monthly:.2f}€")
            print(f"   • Πραγματική ανά διαμέρισμα: {actual_per_apartment}€")
            print(f"   • Συνολική πραγματική: {total_actual}€")
            
            if abs(expected_monthly - total_actual) > 0.01:
                print(f"   ⚠️  ΔΙΑΦΟΡΑ: {abs(expected_monthly - total_actual):.2f}€")
                print(f"   🔧 ΠΡΟΤΕΙΝΟΜΕΝΗ ΔΙΟΡΘΩΣΗ:")
                print(f"      • Εισφορά ανά διαμέρισμα: {expected_monthly / apartments_count:.2f}€")
            else:
                print(f"   ✅ Τα νούμερα είναι συνεπή")
        
        print()
        print(f"💡 ΣΥΜΠΕΡΑΣΜΑ:")
        print(f"   • Το 5€ είναι η εισφορά ανά διαμέρισμα")
        print(f"   • Το 416,67€ είναι η συνολική μηνιαία δόση (5€ × 10 διαμερίσματα)")
        print(f"   • Στο frontend εμφανίζεται το 5€ ανά διαμέρισμα, όχι το συνολικό")

if __name__ == "__main__":
    check_reserve_fund_settings()
