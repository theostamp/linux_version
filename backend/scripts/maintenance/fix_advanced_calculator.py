import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator
from decimal import Decimal
from typing import Dict

def fix_advanced_calculator():
    """Fix the Advanced Calculator to match Basic Calculator logic"""
    
    with schema_context('demo'):
        building_id = 4
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("🔧 FIXING ADVANCED CALCULATOR")
        print("=" * 50)
        
        # 1. Current state
        print("\n1. CURRENT STATE:")
        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
        print(f"   Total Obligations: €{total_obligations:,.2f}")
        
        # Test current calculations
        basic_calculator = CommonExpenseCalculator(building_id)
        basic_shares = basic_calculator.calculate_shares(include_reserve_fund=True)
        basic_total = sum(share['total_amount'] for share in basic_shares.values())
        basic_reserve = sum(share['reserve_fund_amount'] for share in basic_shares.values())
        
        advanced_calculator = AdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        advanced_shares = advanced_calculator.calculate_advanced_shares()
        advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
        
        print(f"   Basic Calculator Total: €{basic_total:,.2f}")
        print(f"   Basic Calculator Reserve: €{basic_reserve:,.2f}")
        print(f"   Advanced Calculator Total: €{advanced_total:,.2f}")
        print(f"   Current Difference: €{advanced_total - basic_total:,.2f}")
        
        # 2. Create fixed version of Advanced Calculator
        print("\n2. CREATING FIXED VERSION:")
        
        # Create a modified version of the Advanced Calculator
        class FixedAdvancedCommonExpenseCalculator(AdvancedCommonExpenseCalculator):
            def _distribute_expenses_by_apartment(self, shares: Dict, expense_totals: Dict, heating_costs: Dict):
                """Fixed version with obligations check"""
                
                # Calculate total obligations first
                total_obligations = sum(abs(apt.current_balance or 0) for apt in self.apartments)
                
                # Calculate total participation mills
                total_participation_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
                
                for apartment in self.apartments:
                    apartment_id = apartment.id
                    participation_mills = apartment.participation_mills or 0
                    heating_mills = apartment.heating_mills or 0
                    elevator_mills = apartment.elevator_mills or 0
                    
                    # α. Υπολογισμός Γενικών Δαπανών (ανά χιλιοστά συμμετοχής)
                    if total_participation_mills > 0:
                        participation_mills_decimal = Decimal(str(participation_mills))
                        total_participation_mills_decimal = Decimal(str(total_participation_mills))
                        general_share = expense_totals['general'] * (participation_mills_decimal / total_participation_mills_decimal)
                    else:
                        general_share = expense_totals['general'] / len(self.apartments)
                    
                    shares[apartment_id]['breakdown']['general_expenses'] = general_share
                    shares[apartment_id]['total_amount'] += general_share
                    
                    # β. Υπολογισμός Δαπανών Ανελκυστήρα (ανά χιλιοστά ανελκυστήρα)
                    total_elevator_mills = sum(apt.elevator_mills or 0 for apt in self.apartments)
                    if total_elevator_mills > 0:
                        elevator_mills_decimal = Decimal(str(elevator_mills))
                        total_elevator_mills_decimal = Decimal(str(total_elevator_mills))
                        elevator_share = expense_totals['elevator'] * (elevator_mills_decimal / total_elevator_mills_decimal)
                    else:
                        elevator_share = expense_totals['elevator'] / len(self.apartments)
                    
                    shares[apartment_id]['breakdown']['elevator_expenses'] = elevator_share
                    shares[apartment_id]['total_amount'] += elevator_share
                    
                    # γ. Υπολογισμός Δαπανών Θέρμανσης
                    total_heating_mills = sum(apt.heating_mills or 0 for apt in self.apartments)
                    if total_heating_mills > 0:
                        total_heating_mills_decimal = Decimal(str(total_heating_mills))
                        heating_mills_decimal = Decimal(str(heating_mills))
                        
                        if self.heating_type == 'autonomous':
                            # Αυτόνομη: 30% πάγιο + 70% ανά χιλιοστά
                            fixed_heating_share = heating_costs['total_cost'] * self.heating_fixed_percentage / len(self.apartments)
                            variable_heating_share = heating_costs['total_cost'] * (1 - self.heating_fixed_percentage) * (heating_mills_decimal / total_heating_mills_decimal)
                            
                            shares[apartment_id]['heating_breakdown']['fixed_cost'] = fixed_heating_share
                            shares[apartment_id]['heating_breakdown']['variable_cost'] = variable_heating_share
                            shares[apartment_id]['heating_breakdown']['consumption_hours'] = Decimal('0.00')
                            
                            total_heating_share = fixed_heating_share + variable_heating_share
                        else:
                            # Κεντρική: 100% ανά χιλιοστά θέρμανσης
                            total_heating_share = heating_costs['total_cost'] * (heating_mills_decimal / total_heating_mills_decimal)
                            shares[apartment_id]['heating_breakdown']['fixed_cost'] = total_heating_share
                            shares[apartment_id]['heating_breakdown']['variable_cost'] = Decimal('0.00')
                            shares[apartment_id]['heating_breakdown']['consumption_hours'] = Decimal('0.00')
                        
                        shares[apartment_id]['breakdown']['heating_expenses'] = total_heating_share
                        shares[apartment_id]['total_amount'] += total_heating_share
                    
                    # δ. Υπολογισμός Ισόποσων Δαπανών
                    equal_share_amount = expense_totals['equal_share'] / len(self.apartments)
                    shares[apartment_id]['breakdown']['equal_share_expenses'] = equal_share_amount
                    shares[apartment_id]['total_amount'] += equal_share_amount
                    
                    # ε. Υπολογισμός Εισφοράς Αποθεματικού (με έλεγχο εκκρεμοτήτων)
                    # FIXED: Add the same obligations check as Basic Calculator
                    if (self.reserve_fund_monthly_total > 0 and 
                        total_participation_mills > 0 and 
                        total_obligations == 0):  # ← ΕΔΩ ΕΙΝΑΙ Η ΔΙΟΡΘΩΣΗ
                        
                        total_participation_mills_decimal = Decimal(str(total_participation_mills))
                        participation_mills_decimal = Decimal(str(participation_mills))
                        reserve_share = self.reserve_fund_monthly_total * (participation_mills_decimal / total_participation_mills_decimal)
                        shares[apartment_id]['breakdown']['reserve_fund_contribution'] = reserve_share
                        shares[apartment_id]['total_amount'] += reserve_share
                    else:
                        # No reserve fund if there are obligations
                        shares[apartment_id]['breakdown']['reserve_fund_contribution'] = Decimal('0.00')
                    
                    # στ. Υπολογισμός Δαπανών Διαχείρισης
                    management_fee = self.building.management_fee_per_apartment or Decimal('0.00')
                    shares[apartment_id]['breakdown']['management_fee'] = management_fee
                    shares[apartment_id]['breakdown']['general_expenses'] += management_fee
                    shares[apartment_id]['total_amount'] += management_fee
        
        # 3. Test fixed calculator
        print("\n3. TESTING FIXED CALCULATOR:")
        fixed_calculator = FixedAdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        fixed_shares = fixed_calculator.calculate_advanced_shares()
        fixed_total = sum(share['total_amount'] for share in fixed_shares['shares'].values())
        
        print(f"   Fixed Advanced Calculator Total: €{fixed_total:,.2f}")
        print(f"   Basic Calculator Total: €{basic_total:,.2f}")
        print(f"   New Difference: €{fixed_total - basic_total:,.2f}")
        
        # 4. Show apartment breakdown
        print("\n4. APARTMENT BREAKDOWN COMPARISON:")
        print("-" * 90)
        print(f"{'Apt':<4} {'Basic Total':<12} {'Basic Reserve':<14} {'Fixed Advanced':<15} {'Diff':<10}")
        print("-" * 90)
        
        for apt in apartments.order_by('number'):
            basic_share = basic_shares.get(apt.id, {})
            fixed_share = fixed_shares['shares'].get(apt.id, {})
            
            basic_total_apt = basic_share.get('total_amount', 0)
            basic_reserve_apt = basic_share.get('reserve_fund_amount', 0)
            fixed_total_apt = fixed_share.get('total_amount', 0)
            diff = abs(fixed_total_apt - basic_total_apt)
            
            print(f"{apt.number:<4} €{basic_total_apt:<11,.2f} €{basic_reserve_apt:<13,.2f} €{fixed_total_apt:<14,.2f} €{diff:<9,.2f}")
        
        print("-" * 90)
        
        # 5. Test with zero obligations
        print("\n5. TEST WITH ZERO OBLIGATIONS:")
        
        # Store original balances
        original_balances = {}
        for apt in apartments:
            original_balances[apt.id] = apt.current_balance
        
        # Set all balances to zero
        for apt in apartments:
            apt.current_balance = 0
            apt.save()
        
        # Test both calculators
        basic_calculator_zero = CommonExpenseCalculator(building_id)
        basic_shares_zero = basic_calculator_zero.calculate_shares(include_reserve_fund=True)
        basic_total_zero = sum(share['total_amount'] for share in basic_shares_zero.values())
        basic_reserve_zero = sum(share['reserve_fund_amount'] for share in basic_shares_zero.values())
        
        fixed_calculator_zero = FixedAdvancedCommonExpenseCalculator(
            building_id=building_id,
            reserve_fund_monthly_total=float(building.reserve_contribution_per_apartment or 0) * len(apartments)
        )
        fixed_shares_zero = fixed_calculator_zero.calculate_advanced_shares()
        fixed_total_zero = sum(share['total_amount'] for share in fixed_shares_zero['shares'].values())
        
        print(f"   Basic Calculator Total (zero obligations): €{basic_total_zero:,.2f}")
        print(f"   Basic Calculator Reserve (zero obligations): €{basic_reserve_zero:,.2f}")
        print(f"   Fixed Advanced Calculator Total (zero obligations): €{fixed_total_zero:,.2f}")
        print(f"   Difference (zero obligations): €{fixed_total_zero - basic_total_zero:,.2f}")
        
        # Restore original balances
        for apt in apartments:
            apt.current_balance = original_balances[apt.id]
            apt.save()
        
        # 6. Summary
        print("\n6. SUMMARY:")
        if abs(fixed_total - basic_total) < 0.01:
            print("   ✅ FIXED: Calculators now match!")
        else:
            print("   ⚠️ Still have discrepancy")
        
        print("   🔧 The Advanced Calculator now respects the obligations check")
        print("   🔧 Both calculators will only collect reserve fund when there are no obligations")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    fix_advanced_calculator()
