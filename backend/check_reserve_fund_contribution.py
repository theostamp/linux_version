#!/usr/bin/env python3
"""
Script για έλεγχο του reserve_fund_contribution
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment

def format_currency(amount):
    """Format currency with Greek locale"""
    return f"{amount:,.2f} €"

def check_reserve_fund_contribution():
    """Ελέγχει το reserve_fund_contribution"""
    print("=" * 80)
    print("🔍 ΕΛΕΓΧΟΣ RESERVE FUND CONTRIBUTION")
    print("=" * 80)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)
        apartments = Apartment.objects.filter(building=building)
        
        print(f"\n🏢 Κτίριο: {building.name}")
        print(f"💰 Reserve fund goal: {format_currency(building.reserve_fund_goal)}")
        print(f"📅 Reserve fund duration: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Reserve fund start date: {building.reserve_fund_start_date}")
        print(f"📅 Reserve fund target date: {building.reserve_fund_target_date}")
        print(f"🎯 Reserve fund priority: {building.reserve_fund_priority}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"💰 Μηνιαίος στόχος: {format_currency(monthly_target)}")
        else:
            monthly_target = Decimal('0.00')
            print(f"💰 Μηνιαίος στόχος: {format_currency(monthly_target)} (δεν έχει οριστεί)")
        
        # Έλεγχος αν ο Οκτώβριος 2025 ανήκει στο reserve fund timeline
        from datetime import date
        october_2025 = date(2025, 10, 1)
        
        if building.reserve_fund_start_date and building.reserve_fund_target_date:
            in_timeline = building.reserve_fund_start_date <= october_2025 <= building.reserve_fund_target_date
            print(f"📅 Οκτώβριος 2025 ανήκει στο timeline: {'Ναι' if in_timeline else 'Όχι'}")
            print(f"   Timeline: {building.reserve_fund_start_date} - {building.reserve_fund_target_date}")
        else:
            in_timeline = False
            print(f"📅 Οκτώβριος 2025 ανήκει στο timeline: Όχι (δεν έχει οριστεί timeline)")
        
        # Υπολογισμός συνολικού reserve fund contribution
        if in_timeline and monthly_target > 0:
            total_reserve_contribution = monthly_target
            print(f"💰 Συνολικό reserve fund contribution: {format_currency(total_reserve_contribution)}")
        else:
            total_reserve_contribution = Decimal('0.00')
            print(f"💰 Συνολικό reserve fund contribution: {format_currency(total_reserve_contribution)} (δεν εφαρμόζεται)")
        
        return {
            'reserve_fund_goal': building.reserve_fund_goal,
            'reserve_fund_duration_months': building.reserve_fund_duration_months,
            'monthly_target': monthly_target,
            'in_timeline': in_timeline,
            'total_reserve_contribution': total_reserve_contribution
        }

def main():
    """Κύρια λειτουργία"""
    print("🚀 ΕΛΕΓΧΟΣ RESERVE FUND CONTRIBUTION")
    print("=" * 80)
    
    try:
        result = check_reserve_fund_contribution()
        
        print(f"\n📊 ΣΥΝΟΠΤΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print(f"   Reserve fund goal: {format_currency(result['reserve_fund_goal'])}")
        print(f"   Duration: {result['reserve_fund_duration_months']} μήνες")
        print(f"   Monthly target: {format_currency(result['monthly_target'])}")
        print(f"   In timeline: {result['in_timeline']}")
        print(f"   Total contribution: {format_currency(result['total_reserve_contribution'])}")
        
        # Ανάλυση για την εύρεση της διαφοράς
        dashboard_total = Decimal('2000.01')
        known_expenses = Decimal('1000.01')  # Μόνο η δαπάνη Οκτωβρίου
        reserve_contribution = result['total_reserve_contribution']
        
        print(f"\n🔍 ΑΝΑΛΥΣΗ ΔΙΑΦΟΡΑΣ:")
        print(f"   Dashboard εμφανίζει: {format_currency(dashboard_total)}")
        print(f"   Δαπάνη Οκτωβρίου: {format_currency(known_expenses)}")
        print(f"   Reserve fund contribution: {format_currency(reserve_contribution)}")
        print(f"   Σύνολο: {format_currency(known_expenses + reserve_contribution)}")
        
        if abs(dashboard_total - (known_expenses + reserve_contribution)) < Decimal('0.01'):
            print(f"   ✅ Η διαφορά εξηγείται από το reserve fund contribution!")
        else:
            print(f"   ⚠️  Η διαφορά ΔΕΝ εξηγείται από το reserve fund contribution")
            print(f"   Διαφορά: {format_currency(dashboard_total - (known_expenses + reserve_contribution))}")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
