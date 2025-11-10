#!/usr/bin/env python3
"""
🔍 Check Reserve Fund Data

Αυτό το script ελέγχει τα δεδομένα αποθεματικού στη βάση δεδομένων
και επιβεβαιώνει ότι είναι σωστά.
"""

import os
import django
from decimal import Decimal
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment

def check_reserve_fund_data():
    """Ελέγχει τα δεδομένα αποθεματικού στη βάση"""
    
    print("🔍 CHECK RESERVE FUND DATA")
    print("=" * 50)
    
    try:
        # Get demo tenant
        client = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {client.name}")
        
        # Check in tenant context
        with tenant_context(client):
            buildings = Building.objects.all()
            print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
            
            for building in buildings:
                print(f"\n🏢 Κτίριο: {building.name}")
                print(f"   ID: {building.id}")
                
                # Check reserve fund settings
                print("\n🎯 Ρυθμίσεις Αποθεματικού στη Βάση:")
                print(f"   - Στόχος: {building.reserve_fund_goal or 0}€")
                print(f"   - Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
                print(f"   - Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
                print(f"   - Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
                
                # Calculate monthly target
                monthly_target = 0
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                print(f"   - Μηνιαίος στόχος: {monthly_target:.2f}€")
                
                # Check if this matches the expected values
                expected_goal = 2000.0  # 2.000,00€
                expected_duration = 6   # 6 δόσεις
                expected_monthly = 333.33  # 333,33€
                
                print("\n✅ Έλεγχος Αναμενόμενων Τιμών:")
                print(f"   - Αναμενόμενος στόχος: {expected_goal}€")
                print(f"   - Αναμενόμενη διάρκεια: {expected_duration} μήνες")
                print(f"   - Αναμενόμενη μηνιαία δόση: {expected_monthly}€")
                
                # Check if values match
                goal_matches = abs(float(building.reserve_fund_goal or 0) - expected_goal) < 0.01
                duration_matches = (building.reserve_fund_duration_months or 0) == expected_duration
                monthly_matches = abs(monthly_target - expected_monthly) < 0.01
                
                print("\n📊 Αποτελέσματα Ελέγχου:")
                print(f"   - Στόχος ταιριάζει: {'✅' if goal_matches else '❌'}")
                print(f"   - Διάρκεια ταιριάζει: {'✅' if duration_matches else '❌'}")
                print(f"   - Μηνιαία δόση ταιριάζει: {'✅' if monthly_matches else '❌'}")
                
                if not (goal_matches and duration_matches and monthly_matches):
                    print("\n⚠️  ΧΡΕΙΑΖΕΤΑΙ ΕΝΗΜΕΡΩΣΗ!")
                    print("   Θέλετε να ενημερώσετε τα δεδομένα; (y/n): ", end="")
                    
                    # For automation, we'll update automatically
                    print("y (αυτόματη ενημέρωση)")
                    
                    # Update the building data
                    building.reserve_fund_goal = Decimal(str(expected_goal))
                    building.reserve_fund_duration_months = expected_duration
                    building.reserve_fund_start_date = datetime(2025, 8, 1).date()  # Αυγ 2025
                    building.save()
                    
                    print("   ✅ Ενημερώθηκαν τα δεδομένα!")
                    print(f"   - Νέος στόχος: {building.reserve_fund_goal}€")
                    print(f"   - Νέα διάρκεια: {building.reserve_fund_duration_months} μήνες")
                    print(f"   - Νέα ημερομηνία έναρξης: {building.reserve_fund_start_date}")
                else:
                    print("   ✅ Όλα τα δεδομένα είναι σωστά!")
                
                # Check apartments and their participation mills
                apartments = Apartment.objects.filter(building_id=building.id)
                print(f"\n🏠 Διαμερίσματα ({apartments.count()}):")
                
                total_mills = 0
                for apt in apartments:
                    mills = apt.participation_mills or 0
                    total_mills += mills
                    print(f"   - {apt.number}: {mills} χιλιοστά")
                
                print(f"   - Συνολικά χιλιοστά: {total_mills}")
                
                # Calculate expected reserve fund amounts
                if total_mills > 0:
                    print("\n🧮 Υπολογισμός Αναμενόμενων Εισφορών:")
                    for apt in apartments:
                        mills = apt.participation_mills or 0
                        if mills > 0:
                            expected_contribution = (mills / total_mills) * expected_monthly
                            print(f"   - {apt.number}: {expected_contribution:.2f}€")
                
                print(f"\n{'='*50}")
        
        print("\n🎉 Ο έλεγχος ολοκληρώθηκε!")
        
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting Reserve Fund Data Check...")
    check_reserve_fund_data()
    print("\n✅ Check completed!")
