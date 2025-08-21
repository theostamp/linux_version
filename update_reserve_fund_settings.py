#!/usr/bin/env python3
"""
Script to update reserve fund settings for Αλκμάνος 22 building
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def update_reserve_fund_settings():
    """Update reserve fund settings for Αλκμάνος 22 building"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔧 ΕΝΗΜΕΡΩΣΗ ΡΥΘΜΙΣΕΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print()
        
        # 1. Αρχική κατάσταση
        building = Building.objects.get(id=building_id)
        
        print("📊 1. ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal or 0:,.2f}€")
        print(f"⏱️ Διάρκεια σε μήνες: {building.reserve_fund_duration_months or 0}")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
        print(f"📅 Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date or 'Δεν έχει οριστεί'}")
        print(f"💰 Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0:,.2f}€")
        print()
        
        # 2. Ενημέρωση με νέες τιμές
        print("📊 2. ΕΝΗΜΕΡΩΣΗ ΜΕ ΝΕΕΣ ΤΙΜΕΣ")
        print("-" * 50)
        
        # Νέες τιμές που θέλετε να ορίσετε
        new_goal = Decimal('5000.00')  # 5.000€ αντί για 10.000€
        new_duration = 12  # 12 μήνες αντί για 24
        new_start_date = date(2025, 8, 1)  # Αύγουστος 2025
        new_target_date = date(2026, 7, 31)  # Ιούλιος 2026
        
        print(f"🎯 Νέος στόχος: {new_goal:,.2f}€")
        print(f"⏱️ Νέα διάρκεια: {new_duration} μήνες")
        print(f"📅 Νέα ημερομηνία έναρξης: {new_start_date}")
        print(f"📅 Νέα ημερομηνία ολοκλήρωσης: {new_target_date}")
        
        # Υπολογισμός νέας μηνιαίας δόσης
        new_monthly_target = float(new_goal) / float(new_duration)
        print(f"💰 Νέα μηνιαία δόση: {new_monthly_target:,.2f}€")
        print()
        
        # 3. Εφαρμογή αλλαγών
        print("📊 3. ΕΦΑΡΜΟΓΗ ΑΛΛΑΓΩΝ")
        print("-" * 50)
        
        building.reserve_fund_goal = new_goal
        building.reserve_fund_duration_months = new_duration
        building.reserve_fund_start_date = new_start_date
        building.reserve_fund_target_date = new_target_date
        building.save()
        
        print("✅ Ενημερώθηκαν οι ρυθμίσεις αποθεματικού")
        print()
        
        # 4. Τελική κατάσταση
        print("📊 4. ΤΕΛΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        # Επαναφόρτωση από τη βάση
        building.refresh_from_db()
        
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"⏱️ Διάρκεια σε μήνες: {building.reserve_fund_duration_months}")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print(f"📅 Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date}")
        print(f"💰 Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment:,.2f}€")
        
        # Υπολογισμός μηνιαίας δόσης
        calculated_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
        print(f"💰 Υπολογισμένη μηνιαία δόση: {calculated_monthly:,.2f}€")
        print()
        
        # 5. Συγκριση με dashboard
        print("📊 5. ΣΥΓΚΡΙΣΗ ΜΕ DASHBOARD")
        print("-" * 50)
        
        dashboard_goal = 10000.00  # Τι βλέπεις στο dashboard
        dashboard_duration = 24    # Τι βλέπεις στο dashboard
        dashboard_monthly = 416.67 # Τι βλέπεις στο dashboard
        
        print(f"🎯 Στόχος στο dashboard: {dashboard_goal:,.2f}€")
        print(f"🎯 Στόχος στη βάση: {building.reserve_fund_goal:,.2f}€")
        
        if building.reserve_fund_goal == dashboard_goal:
            print("✅ Στόχος ταιριάζει")
        else:
            print("❌ Στόχος ΔΕΝ ταιριάζει - πιθανό hardcoded στο frontend")
        
        print(f"⏱️ Διάρκεια στο dashboard: {dashboard_duration} μήνες")
        print(f"⏱️ Διάρκεια στη βάση: {building.reserve_fund_duration_months} μήνες")
        
        if building.reserve_fund_duration_months == dashboard_duration:
            print("✅ Διάρκεια ταιριάζει")
        else:
            print("❌ Διάρκεια ΔΕΝ ταιριάζει - πιθανό hardcoded στο frontend")
        
        print(f"💰 Μηνιαία δόση στο dashboard: {dashboard_monthly:,.2f}€")
        print(f"💰 Μηνιαία δόση στη βάση: {calculated_monthly:,.2f}€")
        
        if abs(calculated_monthly - dashboard_monthly) < 0.01:
            print("✅ Μηνιαία δόση ταιριάζει")
        else:
            print("❌ Μηνιαία δόση ΔΕΝ ταιριάζει - πιθανό hardcoded στο frontend")
        
        print()
        
        # 6. Προτάσεις επιλύσεως
        print("📊 6. ΠΡΟΤΑΣΕΙΣ ΕΠΙΛΥΣΕΩΣ")
        print("-" * 50)
        
        if (building.reserve_fund_goal != dashboard_goal or 
            building.reserve_fund_duration_months != dashboard_duration or
            abs(calculated_monthly - dashboard_monthly) > 0.01):
            
            print("🔧 Το πρόβλημα είναι στο frontend:")
            print("   1. Χρησιμοποιήστε το clear_reserve_fund_cache.html")
            print("   2. Καθαρίστε το localStorage")
            print("   3. Ανανεώστε τη σελίδα")
            print("   4. Ελέγξτε αν υπάρχουν άλλα hardcoded τιμές")
        else:
            print("✅ Όλες οι τιμές ταιριάζουν - το πρόβλημα επιλύθηκε!")
        
        print()
        print("=" * 60)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΕΝΗΜΕΡΩΣΗ")

if __name__ == "__main__":
    update_reserve_fund_settings()


