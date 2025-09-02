#!/usr/bin/env python3
"""
Script to check all existing common expense periods
Ελέγχει όλες τις υπάρχουσες περιόδους κοινοχρήστων
"""

import os
import sys
import django
from datetime import datetime
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import CommonExpensePeriod, ApartmentShare
from django.db.models import Sum, Q, Count

def check_all_periods():
    """Check all existing common expense periods"""
    
    print("🔍 Έλεγχος όλων των περιόδων κοινοχρήστων...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Get all periods
        all_periods = CommonExpensePeriod.objects.all().order_by('-start_date')
        
        print(f"📊 Συνολικές περιόδοι κοινοχρήστων: {all_periods.count()}")
        
        if all_periods.exists():
            print("\n📋 Λεπτομέρειες όλων των περιόδων:")
            for period in all_periods:
                # Count shares for this period
                shares_count = ApartmentShare.objects.filter(period=period).count()
                
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print(f"    Ενεργή: {period.is_active}")
                print(f"    Μερίδια διαμερισμάτων: {shares_count}")
                print(f"    Δημιουργήθηκε: {period.created_at}")
                print()
        else:
            print("❌ Δεν βρέθηκαν καθόλου περιόδοι κοινοχρήστων")
        
        # Check for any periods with 2025 in their name or dates
        periods_2025 = CommonExpensePeriod.objects.filter(
            Q(start_date__year=2025) |
            Q(end_date__year=2025) |
            Q(period_name__icontains='2025')
        ).order_by('start_date')
        
        print(f"\n🔍 Περίοδοι που σχετίζονται με το 2025: {periods_2025.count()}")
        
        if periods_2025.exists():
            print("\n📋 Περίοδοι 2025:")
            for period in periods_2025:
                shares_count = ApartmentShare.objects.filter(period=period).count()
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print(f"    Μερίδια διαμερισμάτων: {shares_count}")
                print()
        
        # Check for any periods with August in their name
        august_periods = CommonExpensePeriod.objects.filter(
            Q(period_name__icontains='Αύγουστο') |
            Q(period_name__icontains='Αυγούστου') |
            Q(period_name__icontains='August')
        ).order_by('start_date')
        
        print(f"\n🔍 Περίοδοι με όνομα που περιέχει 'Αύγουστο': {august_periods.count()}")
        
        if august_periods.exists():
            print("\n📋 Περίοδοι Αυγούστου:")
            for period in august_periods:
                shares_count = ApartmentShare.objects.filter(period=period).count()
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print(f"    Μερίδια διαμερισμάτων: {shares_count}")
                print()
        
        # Check for any shares with previous_balance > 0
        shares_with_previous_balance = ApartmentShare.objects.filter(
            previous_balance__gt=0
        ).order_by('-previous_balance')
        
        print(f"\n💰 Μερίδια με παλιές οφειλές > 0: {shares_with_previous_balance.count()}")
        
        if shares_with_previous_balance.exists():
            print("\n📋 Μερίδια με παλιές οφειλές:")
            total_previous_balance = 0
            for share in shares_with_previous_balance[:10]:  # Show first 10
                apartment_number = share.apartment.number
                previous_balance = share.previous_balance or 0
                period_name = share.period.period_name
                
                total_previous_balance += previous_balance
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Περίοδος: {period_name}")
                print(f"    Παλιές οφειλές: {previous_balance}€")
                print()
            
            print(f"📊 Συνολικές παλιές οφειλές: {total_previous_balance}€")
        
        # Check for any shares with previous_balance < 0 (credits)
        shares_with_credit = ApartmentShare.objects.filter(
            previous_balance__lt=0
        ).order_by('previous_balance')
        
        print(f"\n💰 Μερίδια με πιστωτικό υπόλοιπο (previous_balance < 0): {shares_with_credit.count()}")
        
        if shares_with_credit.exists():
            print("\n📋 Μερίδια με πιστωτικό υπόλοιπο:")
            total_credit = 0
            for share in shares_with_credit[:5]:  # Show first 5
                apartment_number = share.apartment.number
                previous_balance = share.previous_balance or 0
                period_name = share.period.period_name
                
                total_credit += abs(previous_balance)
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Περίοδος: {period_name}")
                print(f"    Πιστωτικό υπόλοιπο: {previous_balance}€")
                print()
            
            print(f"📊 Συνολικό πιστωτικό υπόλοιπο: {total_credit}€")

if __name__ == '__main__':
    try:
        check_all_periods()
        print("\n✅ Έλεγχος ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
        import traceback
        traceback.print_exc()
