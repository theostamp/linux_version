#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import FinancialDashboardService
from buildings.models import Building
from decimal import Decimal

def check_financial_values():
    with schema_context('demo'):
        # Get building 1
        building = Building.objects.get(id=1)

        print("=" * 80)
        print("🔍 ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΚΑΙ ΟΙΚΟΝΟΜΙΚΩΝ ΤΙΜΩΝ")
        print("=" * 80)

        # Building settings
        print("\n📊 ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"  • Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"  • Διάρκεια συλλογής: {building.reserve_fund_duration_months} μήνες")
        print(f"  • Ημ. έναρξης: {building.reserve_fund_start_date}")
        print(f"  • Ημ. λήξης: {building.reserve_fund_target_date}")
        print(f"  • Προτεραιότητα: {building.reserve_fund_priority}")

        # Calculate monthly target
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"  • Υπολογισμένη μηνιαία εισφορά: {monthly_target}€")

        # Get service data for current month
        service = FinancialDashboardService(1)

        # Get summary for December 2025
        month = "2025-12"
        print(f"\n📅 ΔΕΔΟΜΕΝΑ ΓΙΑ {month}:")

        summary = service.get_summary(month)

        print(f"\n💰 ΟΙΚΟΝΟΜΙΚΑ ΣΤΟΙΧΕΙΑ:")
        print(f"  • current_obligations: {summary.get('current_obligations')}€")
        print(f"  • average_monthly_expenses: {summary.get('average_monthly_expenses')}€")
        print(f"  • total_management_cost: {summary.get('total_management_cost')}€")
        print(f"  • reserve_fund_monthly_target: {summary.get('reserve_fund_monthly_target')}€")
        print(f"  • reserve_fund_contribution: {summary.get('reserve_fund_contribution')}€")
        print(f"  • previous_obligations: {summary.get('previous_obligations')}€")
        print(f"  • total_expenses_month: {summary.get('total_expenses_month')}€")
        print(f"  • total_payments_month: {summary.get('total_payments_month')}€")

        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΟΙ:")

        # Υπολογισμός που κάνει το backend για current_obligations
        total_expenses = Decimal(str(summary.get('total_expenses_month', 0)))
        management_cost = Decimal(str(summary.get('total_management_cost', 0)))
        reserve_target = Decimal(str(summary.get('reserve_fund_monthly_target', 0)))

        backend_current_obligations = total_expenses + management_cost + reserve_target
        print(f"  • Backend current_obligations = {total_expenses} + {management_cost} + {reserve_target} = {backend_current_obligations}€")

        # Υπολογισμός που κάνει το frontend για "Μηνιαίο σύνολο"
        avg_expenses = Decimal(str(summary.get('average_monthly_expenses', 0)))
        previous_obs = Decimal(str(summary.get('previous_obligations', 0)))

        # Χωρίς αποθεματικό (αν isMonthWithinReserveFundPeriod() = false)
        frontend_total_without_reserve = avg_expenses + management_cost + previous_obs
        print(f"  • Frontend χωρίς αποθεματικό = {avg_expenses} + {management_cost} + {previous_obs} = {frontend_total_without_reserve}€")

        # Με αποθεματικό
        frontend_total_with_reserve = avg_expenses + management_cost + reserve_target + previous_obs
        print(f"  • Frontend με αποθεματικό = {avg_expenses} + {management_cost} + {reserve_target} + {previous_obs} = {frontend_total_with_reserve}€")

        print(f"\n❓ ΔΙΑΦΟΡΕΣ:")
        print(f"  • current_obligations vs Frontend χωρίς αποθεματικό: {backend_current_obligations - frontend_total_without_reserve}€")
        print(f"  • current_obligations vs Frontend με αποθεματικό: {backend_current_obligations - frontend_total_with_reserve}€")

        # Check reserve fund timeline
        print(f"\n⏰ ΕΛΕΓΧΟΣ ΠΕΡΙΟΔΟΥ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        if building.reserve_fund_start_date:
            from datetime import datetime
            selected_date = datetime.strptime(month + '-01', '%Y-%m-%d').date()
            start_date = building.reserve_fund_start_date
            end_date = building.reserve_fund_target_date

            is_after_start = selected_date >= start_date
            is_before_end = not end_date or selected_date <= end_date
            is_within_period = is_after_start and is_before_end

            print(f"  • Επιλεγμένος μήνας: {selected_date}")
            print(f"  • Μετά την έναρξη ({start_date}): {is_after_start}")
            print(f"  • Πριν τη λήξη ({end_date}): {is_before_end}")
            print(f"  • Εντός περιόδου: {is_within_period}")
        else:
            print(f"  • ΔΕΝ έχει οριστεί ημερομηνία έναρξης αποθεματικού")

if __name__ == "__main__":
    check_financial_values()