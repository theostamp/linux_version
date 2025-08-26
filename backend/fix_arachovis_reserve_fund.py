#!/usr/bin/env python3
"""
Script για τη διόρθωση του αποθεματικού του Αραχώβης 12
"""

import os
import sys
import django
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def fix_arachovis_reserve_fund():
    """Διόρθωση αποθεματικού Αραχώβης 12"""
    
    print("🔧 FIXING ΑΡΑΧΩΒΗΣ 12 RESERVE FUND")
    print("=" * 60)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αραχώβης 12")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        
        # Έλεγχος τρέχουσων ρυθμίσεων
        print(f"\n📋 ΤΡΕΧΟΥΣΕΣ ΡΥΘΜΙΣΕΙΣ:")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        # Διόρθωση ημερομηνίας έναρξης αν είναι None
        if building.reserve_fund_start_date is None:
            # Ορίζουμε την έναρξη στο τρέχον μήνα
            start_date = date(datetime.now().year, datetime.now().month, 1)
            building.reserve_fund_start_date = start_date
            building.save()
            
            print(f"\n✅ ΔΙΟΡΘΩΣΗ ΕΦΑΡΜΟΣΤΗΚΕ:")
            print(f"📅 Νέα ημερομηνία έναρξης: {start_date}")
            
            # Υπολογισμός μηνιαίου στόχου
            if building.reserve_fund_duration_months > 0:
                monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
                print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
                
                # Έλεγχος αν το αποθεματικό θα πρέπει να εμφανίζεται
                months_passed = ((datetime.now().date() - start_date).days) // 30
                print(f"📅 Μήνες που έχουν περάσει: {months_passed}")
                
                if months_passed < building.reserve_fund_duration_months:
                    print("✅ Το αποθεματικό θα πρέπει να εμφανίζεται τώρα!")
                else:
                    print("⚠️ Το αποθεματικό μπορεί να έχει ολοκληρωθεί")
        else:
            print("\nℹ️ Η ημερομηνία έναρξης είναι ήδη ορισμένη")
        
        # Έλεγχος τελικών ρυθμίσεων
        building.refresh_from_db()
        print(f"\n📋 ΤΕΛΙΚΕΣ ΡΥΘΜΙΣΕΙΣ:")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        print("\n" + "=" * 60)
        print("✅ Η διόρθωση ολοκληρώθηκε!")
        print("💡 Ελέγξτε τώρα το 'Οικονομικές Υποχρεώσεις Περιόδου' για το Αραχώβης 12")

if __name__ == "__main__":
    fix_arachovis_reserve_fund()
