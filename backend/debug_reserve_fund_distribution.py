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

def debug_reserve_fund_distribution():
    """Debug how reserve fund is distributed and fix the distribution logic"""
    
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
        reserve_contribution_per_apartment = float(building.reserve_contribution_per_apartment or 0)
        reserve_fund_goal = float(building.reserve_fund_goal or 0)
        reserve_fund_duration = int(building.reserve_fund_duration_months or 0)
        
        print("📊 ΤΡΕΧΟΥΣΕΣ ΡΥΘΜΙΣΕΙΣ:")
        print(f"   • Διαχειριστικά ανά διαμέρισμα: {management_fee_per_apartment}€")
        print(f"   • Εισφορά αποθεματικού ανά διαμέρισμα: {reserve_contribution_per_apartment}€")
        print(f"   • Στόχος αποθεματικού: {reserve_fund_goal}€")
        print(f"   • Διάρκεια σε μήνες: {reserve_fund_duration}")
        print(f"   • Συνολικά χιλιοστά: {total_mills}")
        print(f"   • Αριθμός διαμερισμάτων: {apartments_count}")
        print()
        
        # Calculate correct distribution
        if reserve_fund_goal > 0 and reserve_fund_duration > 0 and total_mills > 0:
            monthly_reserve_total = reserve_fund_goal / reserve_fund_duration
            print("📊 ΣΩΣΤΟΣ ΥΠΟΛΟΓΙΣΜΟΣ:")
            print(f"   • Μηνιαία συνολική εισφορά: {monthly_reserve_total:.2f}€")
            print(f"   • Εισφορά ανά χιλιοστό: {monthly_reserve_total / total_mills:.4f}€")
            print()
        
        print("🏠 ΤΡΕΧΟΥΣΗ vs ΣΩΣΤΗ ΚΑΤΑΝΟΜΗ:")
        print("-" * 80)
        
        for apartment in apartments:
            mills = apartment.participation_mills or 0
            
            # Current (wrong) calculation
            current_reserve_contribution = reserve_contribution_per_apartment
            
            # Correct calculation
            if reserve_fund_goal > 0 and reserve_fund_duration > 0 and total_mills > 0:
                monthly_reserve_total = reserve_fund_goal / reserve_fund_duration
                correct_reserve_contribution = (monthly_reserve_total / total_mills) * mills
            else:
                correct_reserve_contribution = 0
            
            # Management fee (same for all)
            management_fee = management_fee_per_apartment
            
            # Total obligations
            current_total = management_fee + current_reserve_contribution
            correct_total = management_fee + correct_reserve_contribution
            
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Χιλιοστά: {mills}")
            print(f"   • Διαχειριστικά τέλη: {management_fee:.2f}€")
            print(f"   • Εισφορά αποθεματικού (τρέχουσα): {current_reserve_contribution:.2f}€")
            print(f"   • Εισφορά αποθεματικού (σωστή): {correct_reserve_contribution:.2f}€")
            print(f"   • Σύνολο (τρέχουσα): {current_total:.2f}€")
            print(f"   • Σύνολο (σωστή): {correct_total:.2f}€")
            if abs(current_reserve_contribution - correct_reserve_contribution) > 0.01:
                print(f"   ⚠️  ΔΙΑΦΟΡΑ: {abs(current_reserve_contribution - correct_reserve_contribution):.2f}€")
            print()
        
        print("🔍 ΠΡΟΒΛΗΜΑ:")
        print("   • Η εισφορά αποθεματικού είναι ίδια για όλα τα διαμερίσματα")
        print("   • Θα πρέπει να είναι ανάλογη με τα χιλιοστά συμμετοχής")
        print()
        
        print("💡 ΛΥΣΗ:")
        print("   • Πρέπει να αλλάξουμε τη λογική στο API endpoint")
        print("   • Η εισφορά αποθεματικού θα υπολογίζεται: (συνολική μηνιαία / συνολικά χιλιοστά) × χιλιοστά διαμερίσματος")

if __name__ == "__main__":
    debug_reserve_fund_distribution()
