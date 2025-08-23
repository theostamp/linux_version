#!/usr/bin/env python3
"""
Test το enhanced breakdown με ημερομηνίες και εκτιμήσεις
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_enhanced_breakdown():
    """Test την enhanced breakdown λογική"""
    
    with schema_context('demo'):
        print("=" * 70)
        print(" 🧪 TESTING ENHANCED BREAKDOWN ΜΕ ΗΜΕΡΟΜΗΝΙΕΣ ")
        print("=" * 70)
        
        try:
            # Import the breakdown logic directly
            from financial.obligations_breakdown_view import analyze_debt_creation, get_greek_month_year
            from apartments.models import Apartment
            from financial.models import Transaction
            from decimal import Decimal
            from datetime import datetime
            
            building_id = 3  # Αραχώβης 12
            
            # Get apartments with debts
            apartments_with_debts = Apartment.objects.filter(
                building_id=building_id,
                current_balance__lt=0
            ).order_by('number')
            
            print(f"🏠 Apartments with debts: {apartments_with_debts.count()}")
            
            enhanced_debts = []
            
            for apt in apartments_with_debts:
                debt_amount = abs(apt.current_balance or Decimal('0.00'))
                transactions = Transaction.objects.filter(apartment=apt).order_by('date')
                
                print(f"\n🔍 Analyzing {apt.number}: {apt.owner_name}")
                print(f"   Debt Amount: {debt_amount}€")
                print(f"   Transactions: {transactions.count()}")
                
                # Analyze debt creation
                debt_info = analyze_debt_creation(apt, transactions, debt_amount)
                
                print(f"   📅 Result:")
                print(f"      Start Date: {debt_info['debt_start_date']}")
                print(f"      Start Month: {debt_info['debt_start_month']}")
                print(f"      Creation Type: {debt_info['creation_type']}")
                print(f"      Days in Debt: {debt_info['days_in_debt']}")
                print(f"      Urgency: {debt_info['urgency_color']} {debt_info['urgency_level']}")
                print(f"      Message: '{debt_info['debt_message']}'")
                
                enhanced_debt = {
                    'apartment_number': apt.number,
                    'owner_name': apt.owner_name or '',
                    'debt_amount': float(debt_amount),
                    'balance': float(apt.current_balance or Decimal('0.00')),
                    **debt_info
                }
                enhanced_debts.append(enhanced_debt)
            
            # Summary
            print(f"\n" + "=" * 70)
            print(" 📋 ENHANCED BREAKDOWN SUMMARY ")
            print("=" * 70)
            
            estimated_count = len([d for d in enhanced_debts if d['creation_type'] == 'estimated'])
            actual_count = len([d for d in enhanced_debts if d['creation_type'] == 'actual'])
            
            print(f"📊 Total debts: {len(enhanced_debts)}")
            print(f"🎯 Actual dates: {actual_count}")
            print(f"📅 Estimated dates: {estimated_count}")
            
            print(f"\n📱 PREVIEW OF UI MESSAGES:")
            for debt in enhanced_debts:
                urgency_indicator = debt['urgency_color']
                creation_indicator = " (εκτίμηση)" if debt['creation_type'] == 'estimated' else ""
                print(f"   {urgency_indicator} Διαμ. {debt['apartment_number']}: {debt['debt_message']}{creation_indicator}")
            
            # Generate JSON structure
            enhanced_breakdown = {
                'building_name': 'Αραχώβης 12',
                'apartment_debts': enhanced_debts,
                'total_apartment_debts': sum(d['debt_amount'] for d in enhanced_debts),
                'apartments_with_debt': len(enhanced_debts),
                'debt_summary': {
                    'recent_debts': len([d for d in enhanced_debts if d['days_in_debt'] <= 30]),
                    'moderate_debts': len([d for d in enhanced_debts if 30 < d['days_in_debt'] <= 60]),
                    'serious_debts': len([d for d in enhanced_debts if 60 < d['days_in_debt'] <= 90]),
                    'critical_debts': len([d for d in enhanced_debts if d['days_in_debt'] > 90]),
                    'has_transaction_history': actual_count > 0,
                    'estimated_debts': estimated_count,
                    'average_debt_duration_days': sum(d['days_in_debt'] for d in enhanced_debts) / len(enhanced_debts) if enhanced_debts else 0
                }
            }
            
            print(f"\n💡 UI MESSAGE PREVIEW:")
            if enhanced_breakdown['debt_summary']['estimated_debts'] > 0:
                print(f"🟠 Σημείωση: {enhanced_breakdown['debt_summary']['estimated_debts']} από τις {enhanced_breakdown['apartments_with_debt']} οφειλές δείχνουν εκτιμώμενες ημερομηνίες")
            
            if enhanced_breakdown['debt_summary']['has_transaction_history']:
                print(f"✅ Ενημερωμένο κτίριο: Διαθέσιμο ιστορικό συναλλαγών")
            else:
                print(f"📝 Κτίριο χωρίς ιστορικό: Χρήση εκτιμήσεων βάσει μεγέθους οφειλής")
            
            print(f"\n🎉 SUCCESS! Enhanced breakdown with dates is working!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_enhanced_breakdown()

