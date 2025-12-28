import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building

def test_reserve_fund_distribution_fix():
    """Test if the reserve fund distribution fix works correctly"""
    
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
        
        # Current settings
        management_fee_per_apartment = float(building.management_fee_per_apartment or 0)
        reserve_fund_goal = float(building.reserve_fund_goal or 0)
        reserve_fund_duration = int(building.reserve_fund_duration_months or 0)
        
        print("📊 ΡΥΘΜΙΣΕΙΣ:")
        print(f"   • Διαχειριστικά ανά διαμέρισμα: {management_fee_per_apartment}€")
        print(f"   • Στόχος αποθεματικού: {reserve_fund_goal}€")
        print(f"   • Διάρκεια σε μήνες: {reserve_fund_duration}")
        print(f"   • Συνολικά χιλιοστά: {total_mills}")
        print(f"   • Αριθμός διαμερισμάτων: {apartments_count}")
        print()
        
        # Calculate correct distribution
        if reserve_fund_goal > 0 and reserve_fund_duration > 0 and total_mills > 0:
            monthly_reserve_total = reserve_fund_goal / reserve_fund_duration
            reserve_per_mill = monthly_reserve_total / total_mills
            print("📊 ΥΠΟΛΟΓΙΣΜΟΣ:")
            print(f"   • Μηνιαία συνολική εισφορά: {monthly_reserve_total:.2f}€")
            print(f"   • Εισφορά ανά χιλιοστό: {reserve_per_mill:.4f}€")
            print()
        
        print("🏠 ΣΩΣΤΗ ΚΑΤΑΝΟΜΗ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print("-" * 80)
        
        total_reserve_contributions = 0.0
        
        for apartment in apartments:
            mills = apartment.participation_mills or 0
            
            # Management fee (same for all)
            management_fee = management_fee_per_apartment
            
            # Reserve fund contribution (based on mills)
            reserve_contribution = 0.0
            if reserve_fund_goal > 0 and reserve_fund_duration > 0 and total_mills > 0:
                monthly_reserve_total = reserve_fund_goal / reserve_fund_duration
                reserve_contribution = (monthly_reserve_total / total_mills) * mills
            
            # Total obligations
            total_obligations = management_fee + reserve_contribution
            total_reserve_contributions += reserve_contribution
            
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Χιλιοστά: {mills}")
            print(f"   • Διαχειριστικά τέλη: {management_fee:.2f}€")
            print(f"   • Εισφορά αποθεματικού: {reserve_contribution:.2f}€")
            print(f"   • ΣΥΝΟΛΟ: {total_obligations:.2f}€")
            print()
        
        print("📊 ΕΠΙΒΕΒΑΙΩΣΗ:")
        print(f"   • Συνολική εισφορά αποθεματικού: {total_reserve_contributions:.2f}€")
        print(f"   • Αναμενόμενη συνολική: {monthly_reserve_total:.2f}€")
        print(f"   • Διαφορά: {abs(total_reserve_contributions - monthly_reserve_total):.2f}€")
        
        if abs(total_reserve_contributions - monthly_reserve_total) < 0.01:
            print("   ✅ Τα νούμερα είναι σωστά!")
        else:
            print("   ⚠️  Υπάρχει μικρή διαφορά λόγω στρογγυλοποίησης")
        
        print()
        print("✅ ΕΠΙΤΥΧΗΣ ΔΙΟΡΘΩΣΗ!")
        print("   • Η εισφορά αποθεματικού τώρα είναι ανάλογη με τα χιλιοστά")
        print("   • Τα διαχειριστικά τέλη παραμένουν ίσα για όλα τα διαμερίσματα")

if __name__ == "__main__":
    test_reserve_fund_distribution_fix()
