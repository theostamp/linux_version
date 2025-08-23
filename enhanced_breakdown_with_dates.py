#!/usr/bin/env python3
"""
Enhanced breakdown με ημερομηνίες δημιουργίας οφειλών
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum, Q

def analyze_debt_creation_dates():
    """Αναλύει πότε δημιουργήθηκαν οι οφειλές"""
    
    with schema_context('demo'):
        print("=" * 70)
        print(" 🔍 ENHANCED BREAKDOWN ΜΕ ΗΜΕΡΟΜΗΝΙΕΣ ΟΦΕΙΛΩΝ ")
        print("=" * 70)
        
        try:
            from apartments.models import Apartment
            from financial.models import Expense, Transaction
            from buildings.models import Building
            
            building_id = 3  # Αραχώβης 12
            building = Building.objects.get(id=building_id)
            
            print(f"🏢 Building: {building.name}")
            
            # Get apartments with debts
            apartments_with_debts = Apartment.objects.filter(
                building_id=building_id,
                current_balance__lt=0
            ).order_by('number')
            
            print(f"\n📊 DETAILED DEBT ANALYSIS:")
            print("-" * 70)
            
            apartment_debts_enhanced = []
            total_apartment_debts = Decimal('0.00')
            
            for apt in apartments_with_debts:
                debt_amount = abs(apt.current_balance or Decimal('0.00'))
                total_apartment_debts += debt_amount
                
                print(f"\n🏠 Διαμ. {apt.number}: {apt.owner_name} - Οφειλή: {debt_amount}€")
                print(f"   Current Balance: {apt.current_balance}€")
                
                # Βρες τα transactions που οδήγησαν στην οφειλή
                transactions = Transaction.objects.filter(
                    apartment=apt
                ).order_by('date')
                
                if transactions.exists():
                    print(f"   📅 TRANSACTION HISTORY:")
                    running_balance = Decimal('0.00')
                    debt_start_date = None
                    debt_start_month = None
                    last_negative_transaction = None
                    
                    for trans in transactions:
                        running_balance += trans.amount
                        print(f"      {trans.date}: {trans.amount:+.2f}€ -> Balance: {running_balance:.2f}€ | {trans.description}")
                        
                        # Βρες πότε έγινε αρνητικό το υπόλοιπο
                        if running_balance < 0 and debt_start_date is None:
                            debt_start_date = trans.date
                            debt_start_month = trans.date.strftime('%B %Y')  # π.χ. "Ιανουάριος 2025"
                            last_negative_transaction = trans
                        
                        # Update την τελευταία αρνητική συναλλαγή
                        if running_balance < 0:
                            last_negative_transaction = trans
                    
                    # Αν δεν βρέθηκε transaction που οδήγησε σε οφειλή, χρησιμοποίησε την τελευταία
                    if debt_start_date is None and transactions.exists():
                        last_trans = transactions.last()
                        debt_start_date = last_trans.date
                        debt_start_month = last_trans.date.strftime('%B %Y')
                        
                    print(f"   🎯 Οφειλή από: {debt_start_date} ({debt_start_month})")
                    
                    # Υπολογισμός διάρκειας οφειλής
                    if debt_start_date:
                        days_in_debt = (datetime.now().date() - debt_start_date).days
                        months_in_debt = round(days_in_debt / 30.44, 1)  # Μέσος όρος ημερών ανά μήνα
                        print(f"   ⏰ Διάρκεια οφειλής: {days_in_debt} ημέρες (~{months_in_debt} μήνες)")
                        
                        # Κατηγοριοποίηση οφειλής
                        if days_in_debt <= 30:
                            urgency = "🟢 Πρόσφατη"
                        elif days_in_debt <= 60:
                            urgency = "🟡 Μέτρια"
                        elif days_in_debt <= 90:
                            urgency = "🟠 Σοβαρή"
                        else:
                            urgency = "🔴 Κρίσιμη"
                        print(f"   📊 Κατηγορία: {urgency}")
                else:
                    print(f"   ⚠️ Δεν βρέθηκαν transactions")
                    debt_start_date = None
                    debt_start_month = "Άγνωστος"
                    days_in_debt = 0
                    months_in_debt = 0
                    urgency = "❓ Άγνωστη"
                
                # Enhanced debt object
                apartment_debt_enhanced = {
                    'apartment_number': apt.number,
                    'owner_name': apt.owner_name or '',
                    'debt_amount': float(debt_amount),
                    'balance': float(apt.current_balance or Decimal('0.00')),
                    'debt_start_date': debt_start_date.isoformat() if debt_start_date else None,
                    'debt_start_month': debt_start_month,
                    'days_in_debt': days_in_debt,
                    'months_in_debt': months_in_debt,
                    'urgency_level': urgency,
                    'urgency_color': urgency.split()[0] if urgency else "⚪"
                }
                apartment_debts_enhanced.append(apartment_debt_enhanced)
            
            # Enhanced breakdown data
            enhanced_breakdown = {
                'building_name': building.name,
                'apartment_debts': apartment_debts_enhanced,
                'total_apartment_debts': float(total_apartment_debts),
                'total_expenses': 0.0,  # We know this is 0 for this building
                'total_management_fees': 0.0,  # We know this is 0 for this building
                'total_obligations': float(total_apartment_debts),
                'apartments_with_debt': len(apartment_debts_enhanced),
                'apartments_count': 10,
                'analysis_date': datetime.now().isoformat(),
                'debt_summary': {
                    'recent_debts': len([d for d in apartment_debts_enhanced if d['days_in_debt'] <= 30]),
                    'moderate_debts': len([d for d in apartment_debts_enhanced if 30 < d['days_in_debt'] <= 60]),
                    'serious_debts': len([d for d in apartment_debts_enhanced if 60 < d['days_in_debt'] <= 90]),
                    'critical_debts': len([d for d in apartment_debts_enhanced if d['days_in_debt'] > 90]),
                    'average_debt_duration_days': sum(d['days_in_debt'] for d in apartment_debts_enhanced) / len(apartment_debts_enhanced) if apartment_debts_enhanced else 0
                }
            }
            
            print(f"\n" + "=" * 70)
            print(" 📋 ENHANCED BREAKDOWN SUMMARY ")
            print("=" * 70)
            
            print(f"🏢 Building: {enhanced_breakdown['building_name']}")
            print(f"💰 Total Obligations: {enhanced_breakdown['total_obligations']:.2f}€")
            print(f"🏠 Apartments with debt: {enhanced_breakdown['apartments_with_debt']}")
            
            summary = enhanced_breakdown['debt_summary']
            print(f"\n📊 DEBT URGENCY BREAKDOWN:")
            print(f"   🟢 Πρόσφατες (≤30 ημέρες): {summary['recent_debts']}")
            print(f"   🟡 Μέτριες (31-60 ημέρες): {summary['moderate_debts']}")
            print(f"   🟠 Σοβαρές (61-90 ημέρες): {summary['serious_debts']}")
            print(f"   🔴 Κρίσιμες (>90 ημέρες): {summary['critical_debts']}")
            print(f"   📈 Μέσος όρος διάρκειας: {summary['average_debt_duration_days']:.1f} ημέρες")
            
            # JSON για frontend
            import json
            print(f"\n📄 ENHANCED JSON FOR FRONTEND:")
            print(json.dumps(enhanced_breakdown, indent=2, ensure_ascii=False, default=str))
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    analyze_debt_creation_dates()

