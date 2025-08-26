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

def debug_apartment_balances_api():
    """Debug why apartment balances API shows 0€ for all apartments"""
    
    with schema_context('demo'):
        # Find the correct building for Αραχώβης 12
        buildings = Building.objects.all()
        print(f"🏢 ΔΙΑΘΕΣΙΜΑ ΚΤΙΡΙΑ:")
        for b in buildings:
            print(f"   • ID {b.id}: {b.name} - {b.address}")
        
        # Find Αραχώβης 12
        building = None
        for b in buildings:
            if "Αραχώβης" in b.name or "Αραχώβης" in b.address:
                building = b
                break
        
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αραχώβης 12")
            return
            
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print(f"🏠 Διαμερίσματα: {building.apartments.count()}")
        print()
        
        # Get apartments
        apartments = Apartment.objects.filter(building=building)
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        apartments_count = apartments.count()
        
        print(f"📊 ΣΤΑΤΙΣΤΙΚΑ ΚΤΙΡΙΟΥ:")
        print(f"   • Συνολικά χιλιοστά: {total_mills}")
        print(f"   • Αριθμός διαμερισμάτων: {apartments_count}")
        print(f"   • Διαχειριστικά ανά διαμέρισμα: {building.management_fee_per_apartment or 0}€")
        print(f"   • Εισφορά αποθεματικού ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
        print(f"   • Συνολικά διαχειριστικά: {(building.management_fee_per_apartment or 0) * apartments_count}€")
        print(f"   • Συνολική εισφορά αποθεματικού: {(building.reserve_contribution_per_apartment or 0) * apartments_count}€")
        print()
        
        # Check current month (August 2025)
        current_month = "2025-08"
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        
        print(f"📅 ΕΛΕΓΧΟΣ ΜΗΝΑ: {current_month}")
        print(f"   • Αρχή μήνα: {month_start}")
        print()
        
        # Check expenses for current month
        current_month_expenses = Expense.objects.filter(
            building=building,
            date__gte=month_start
        )
        
        print(f"💸 ΔΑΠΑΝΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        if current_month_expenses.exists():
            for expense in current_month_expenses:
                print(f"   • {expense.title}: {expense.amount}€ ({expense.distribution_type})")
        else:
            print(f"   • Δεν υπάρχουν δαπάνες για τον {current_month}")
        print()
        
        # Simulate the API calculation for one apartment
        apartment = apartments.first()
        print(f"🏠 ΔΕΙΓΜΑ ΥΠΟΛΟΓΙΣΜΟΥ - Διαμέρισμα {apartment.number}:")
        print(f"   • Ιδιοκτήτης: {apartment.owner_name}")
        print(f"   • Χιλιοστά: {apartment.participation_mills}")
        print()
        
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
            print(f"   • Μερίδιο {expense.title}: {share_amount:.2f}€")
        
        print(f"   • ΣΥΝΟΛΟ μερίδιο δαπανών: {current_month_share:.2f}€")
        print()
        
        # Calculate what SHOULD be included
        management_fee_share = float(building.management_fee_per_apartment or 0)
        reserve_contribution_share = float(building.reserve_contribution_per_apartment or 0)
        total_monthly_obligations = current_month_share + management_fee_share + reserve_contribution_share
        
        print(f"💰 ΤΙ ΘΑ ΠΡΕΠΕΙ ΝΑ ΕΜΦΑΝΙΖΕΤΑΙ:")
        print(f"   • Μερίδιο δαπανών: {current_month_share:.2f}€")
        print(f"   • Διαχειριστικά τέλη: {management_fee_share:.2f}€")
        print(f"   • Εισφορά αποθεματικού: {reserve_contribution_share:.2f}€")
        print(f"   • ΣΥΝΟΛΟ μηνιαίες υποχρεώσεις: {total_monthly_obligations:.2f}€")
        print()
        
        print(f"🔍 ΠΡΟΒΛΗΜΑ:")
        print(f"   • Το API υπολογίζει μόνο τις πραγματικές δαπάνες")
        print(f"   • ΔΕΝ περιλαμβάνει τα διαχειριστικά τέλη")
        print(f"   • ΔΕΝ περιλαμβάνει την εισφορά αποθεματικού")
        print(f"   • Αυτό εξηγεί γιατί όλα τα διαμερίσματα δείχνουν 0,00€")
        print()
        
        print(f"💡 ΛΥΣΗ:")
        print(f"   • Πρέπει να προστεθούν τα διαχειριστικά τέλη στο 'expense_share'")
        print(f"   • Πρέπει να προστεθεί η εισφορά αποθεματικού στο 'expense_share'")
        print(f"   • Ή να δημιουργηθεί ξεχωριστό πεδίο για αυτές τις υποχρεώσεις")

if __name__ == "__main__":
    debug_apartment_balances_api()
