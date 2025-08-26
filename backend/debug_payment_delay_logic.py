import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date, timedelta

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from financial.models import Expense, Payment
from buildings.models import Building

def debug_payment_delay_logic():
    """Debug payment delay logic and implement time-based status"""
    
    with schema_context('demo'):
        # Get building (Αραχώβης 12)
        building = Building.objects.get(id=1)
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Current month (August 2025)
        current_month = "2025-08"
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        current_date = date.today()
        
        print(f"📅 ΜΗΝΑΣ: {current_month}")
        print(f"📅 Τρέχουσα ημερομηνία: {current_date}")
        print(f"📅 Αρχή μήνα: {month_start}")
        print()
        
        # Get apartments
        apartments = Apartment.objects.filter(building=building)
        
        print(f"🏠 ΑΝΑΛΥΣΗ ΚΑΘΥΣΤΕΡΗΣΗΣ ΠΛΗΡΩΜΩΝ:")
        print("-" * 80)
        
        for apartment in apartments:
            # Get payments for this apartment in current month
            payments = Payment.objects.filter(
                apartment=apartment,
                date__gte=month_start
            )
            
            # Calculate current month obligations
            management_fee = float(building.management_fee_per_apartment or 0)
            
            # Reserve fund contribution based on mills
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            reserve_contribution = 0.0
            if building.reserve_fund_goal and building.reserve_fund_duration_months and total_mills > 0:
                monthly_reserve_total = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                reserve_contribution = (monthly_reserve_total / total_mills) * (apartment.participation_mills or 0)
            
            total_obligations = management_fee + reserve_contribution
            total_payments = sum(float(p.amount) for p in payments)
            net_obligation = total_obligations - total_payments
            
            # Calculate delay in days
            if net_obligation > 0:
                # If there's an obligation, calculate days since month start
                days_delay = (current_date - month_start).days
            else:
                # If no obligation or overpaid, no delay
                days_delay = 0
            
            # Determine status based on delay
            if net_obligation <= 0:
                status = "Ενεργό"
                status_reason = "Δεν υπάρχει οφειλή"
            elif days_delay <= 15:
                status = "Ενεργό"
                status_reason = f"Καθυστέρηση {days_delay} ημερών (≤15)"
            elif days_delay <= 40:
                status = "Καθυστέρηση"
                status_reason = f"Καθυστέρηση {days_delay} ημερών (16-40)"
            else:
                status = "Κρίσιμο"
                status_reason = f"Καθυστέρηση {days_delay} ημερών (>40)"
            
            print(f"🏠 Διαμέρισμα {apartment.number} ({apartment.owner_name}):")
            print(f"   • Χιλιοστά: {apartment.participation_mills}")
            print(f"   • Διαχειριστικά τέλη: {management_fee:.2f}€")
            print(f"   • Εισφορά αποθεματικού: {reserve_contribution:.2f}€")
            print(f"   • Συνολικές υποχρεώσεις: {total_obligations:.2f}€")
            print(f"   • Πληρωμές τρέχοντος μήνα: {total_payments:.2f}€")
            print(f"   • Καθαρή οφειλή: {net_obligation:.2f}€")
            print(f"   • Ημέρες καθυστέρησης: {days_delay}")
            print(f"   • Κατάσταση: {status}")
            print(f"   • Λόγος: {status_reason}")
            print()
        
        print(f"📊 ΝΕΑ ΚΡΙΤΗΡΙΑ ΚΑΤΑΣΤΑΣΗΣ:")
        print(f"   • Ενεργό: Δεν υπάρχει οφειλή ή καθυστέρηση ≤15 ημερών")
        print(f"   • Καθυστέρηση: Καθυστέρηση 16-40 ημερών")
        print(f"   • Κρίσιμο: Καθυστέρηση >40 ημερών")

if __name__ == "__main__":
    debug_payment_delay_logic()
