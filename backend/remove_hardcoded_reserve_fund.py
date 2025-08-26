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

def remove_hardcoded_reserve_fund():
    """Remove all hardcoded 5€ reserve fund contributions and set them to 0€"""
    
    with schema_context('demo'):
        print("🔧 ΑΠΑΛΛΑΓΗ HARCODED 5€ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        
        # Get all buildings
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"\n🏢 Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            
            # Check current reserve fund settings
            current_reserve_contribution = building.reserve_contribution_per_apartment or 0
            current_reserve_goal = building.reserve_fund_goal or 0
            current_duration = building.reserve_fund_duration_months or 0
            
            print(f"📊 ΤΡΕΧΟΥΣΕΣ ΡΥΘΜΙΣΕΙΣ:")
            print(f"   • Εισφορά ανά διαμέρισμα: {current_reserve_contribution}€")
            print(f"   • Στόχος αποθεματικού: {current_reserve_goal}€")
            print(f"   • Διάρκεια σε μήνες: {current_duration}μήνες")
            
            # Check if it's hardcoded 5€
            if current_reserve_contribution == 5.0 or current_reserve_contribution == Decimal('5.00'):
                print(f"   ⚠️  ΒΡΕΘΗΚΕ HARCODED 5€ - ΘΑ ΔΙΟΡΘΩΘΕΙ")
                
                # Calculate correct amount based on goal and duration
                if current_reserve_goal > 0 and current_duration > 0:
                    apartments_count = building.apartments.count()
                    if apartments_count > 0:
                        correct_contribution = current_reserve_goal / current_duration / apartments_count
                        print(f"   💡 ΣΩΣΤΗ ΕΙΣΦΟΡΑ: {correct_contribution:.2f}€ ανά διαμέρισμα")
                        
                        # Update the building
                        building.reserve_contribution_per_apartment = correct_contribution
                        building.save()
                        
                        print(f"   ✅ ΕΝΗΜΕΡΩΘΗΚΕ: {correct_contribution:.2f}€")
                    else:
                        print(f"   ❌ Δεν υπάρχουν διαμερίσματα - δεν μπορεί να υπολογιστεί")
                        building.reserve_contribution_per_apartment = 0
                        building.save()
                        print(f"   ✅ ΕΝΗΜΕΡΩΘΗΚΕ: 0€")
                else:
                    print(f"   ❌ Δεν υπάρχει στόχος ή διάρκεια - θα μηδενιστεί")
                    building.reserve_contribution_per_apartment = 0
                    building.save()
                    print(f"   ✅ ΕΝΗΜΕΡΩΘΗΚΕ: 0€")
            else:
                print(f"   ✅ ΔΕΝ ΕΙΝΑΙ HARCODED 5€ - ΔΕΝ ΑΛΛΑΖΕΙ")
        
        print(f"\n" + "=" * 60)
        print("✅ ΟΛΟΚΛΗΡΩΣΗ ΑΠΑΛΛΑΓΗΣ HARCODED 5€")
        print("=" * 60)
        
        # Show final results
        print(f"\n📊 ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        for building in buildings:
            print(f"🏢 {building.name}: {building.reserve_contribution_per_apartment:.2f}€ ανά διαμέρισμα")

if __name__ == "__main__":
    remove_hardcoded_reserve_fund()
