#!/usr/bin/env python3
"""
Script to check if there are any previous obligations recorded for August 2025
Ελέγχει αν υπάρχουν καταχωρημένες παλιές οφειλές για τον Αύγουστο 2025
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import CommonExpensePeriod, ApartmentShare
from django.db.models import Q

def check_august_2025_obligations():
    """Check for any previous obligations recorded for August 2025"""
    
    print("🔍 Ελέγχος για παλιές οφειλές τον Αύγουστο 2025...")
    print("=" * 60)
    
    with schema_context('demo'):
        # Check CommonExpensePeriod for August 2025
        august_2025_periods = CommonExpensePeriod.objects.filter(
            Q(start_date__year=2025, start_date__month=8) |
            Q(end_date__year=2025, end_date__month=8) |
            Q(period_name__icontains='2025-08') |
            Q(period_name__icontains='Αύγουστο 2025') |
            Q(period_name__icontains='Αυγούστου 2025')
        ).order_by('start_date')
        
        print(f"📊 Περίοδοι κοινοχρήστων για Αύγουστο 2025: {august_2025_periods.count()}")
        
        if august_2025_periods.exists():
            print("\n📋 Λεπτομέρειες περιόδων κοινοχρήστων:")
            for period in august_2025_periods:
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print(f"    Ενεργή: {period.is_active}")
                print(f"    Δημιουργήθηκε: {period.created_at}")
                print()
        else:
            print("❌ Δεν βρέθηκαν περίοδοι κοινοχρήστων για Αύγουστο 2025")
        
        # Check ApartmentShare for August 2025 periods
        august_2025_shares = ApartmentShare.objects.filter(
            period__in=august_2025_periods
        ).order_by('apartment__number')
        
        print(f"🏠 Μερίδια διαμερισμάτων για Αύγουστο 2025: {august_2025_shares.count()}")
        
        if august_2025_shares.exists():
            print("\n💰 Λεπτομέρειες μεριδίων διαμερισμάτων:")
            
            total_previous_balance = 0
            total_amount = 0
            total_due = 0
            
            for share in august_2025_shares:
                apartment_number = share.apartment.number
                previous_balance = share.previous_balance or 0
                amount = share.total_amount or 0
                due = share.total_due or 0
                
                total_previous_balance += abs(previous_balance)
                total_amount += amount
                total_due += due
                
                print(f"  • Διαμέρισμα {apartment_number}:")
                print(f"    Παλιές οφειλές: {previous_balance}€")
                print(f"    Συνολικό ποσό: {amount}€")
                print(f"    Συνολική οφειλή: {due}€")
                print(f"    Ανάλυση: {share.breakdown}")
                print()
            
            print("📊 ΣΥΝΟΛΑ:")
            print(f"  • Συνολικές παλιές οφειλές: {total_previous_balance}€")
            print(f"  • Συνολικό ποσό: {total_amount}€")
            print(f"  • Συνολική οφειλή: {total_due}€")
            
        else:
            print("❌ Δεν βρέθηκαν μερίδια διαμερισμάτων για Αύγουστο 2025")
        
        # Check for any periods created in August 2025
        august_2025_created_periods = CommonExpensePeriod.objects.filter(
            created_at__year=2025,
            created_at__month=8
        ).order_by('created_at')
        
        print(f"\n📝 Περίοδοι που δημιουργήθηκαν τον Αύγουστο 2025: {august_2025_created_periods.count()}")
        
        if august_2025_created_periods.exists():
            print("\n📋 Περίοδοι που δημιουργήθηκαν τον Αύγουστο:")
            for period in august_2025_created_periods:
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print(f"    Δημιουργήθηκε: {period.created_at}")
                print()
        
        # Check for any shares created in August 2025
        august_2025_created_shares = ApartmentShare.objects.filter(
            created_at__year=2025,
            created_at__month=8
        ).order_by('created_at')
        
        print(f"📝 Μερίδια που δημιουργήθηκαν τον Αύγουστο 2025: {august_2025_created_shares.count()}")
        
        if august_2025_created_shares.exists():
            print("\n📋 Μερίδια που δημιουργήθηκαν τον Αύγουστο:")
            for share in august_2025_created_shares[:5]:  # Show first 5
                print(f"  • ID: {share.id}")
                print(f"    Διαμέρισμα: {share.apartment.number}")
                print(f"    Περίοδος: {share.period.period_name}")
                print(f"    Παλιές οφειλές: {share.previous_balance}€")
                print(f"    Δημιουργήθηκε: {share.created_at}")
                print()
        
        # Check for any periods with August 2025 in their name
        august_2025_named_periods = CommonExpensePeriod.objects.filter(
            period_name__icontains='2025-08'
        ).order_by('start_date')
        
        print(f"\n🔍 Περίοδοι με όνομα που περιέχει '2025-08': {august_2025_named_periods.count()}")
        
        if august_2025_named_periods.exists():
            print("\n📋 Περίοδοι με όνομα '2025-08':")
            for period in august_2025_named_periods:
                print(f"  • ID: {period.id}")
                print(f"    Όνομα περιόδου: {period.period_name}")
                print(f"    Ημ/νία έναρξης: {period.start_date}")
                print(f"    Ημ/νία λήξης: {period.end_date}")
                print()

if __name__ == '__main__':
    try:
        check_august_2025_obligations()
        print("\n✅ Έλεγχος ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
        import traceback
        traceback.print_exc()
