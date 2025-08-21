#!/usr/bin/env python3
"""
Script to check current reserve fund settings for Αλκμάνος 22 building
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

def check_current_reserve_settings():
    """Check current reserve fund settings"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🔍 ΕΛΕΓΧΟΣ ΤΡΕΧΟΥΣΩΝ ΡΥΘΜΙΣΕΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22, Αθήνα 115 28 (ID: {building_id})")
        print()
        
        # 1. Βασικές πληροφορίες κτιρίου
        building = Building.objects.get(id=building_id)
        apartments = Apartment.objects.filter(building_id=building_id)
        
        print("📊 1. ΒΑΣΙΚΕΣ ΠΛΗΡΟΦΟΡΙΕΣ")
        print("-" * 50)
        print(f"🏢 Όνομα: {building.name}")
        print(f"🏠 Συνολικά διαμερίσματα: {apartments.count()}")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print()
        
        # 2. Ρυθμίσεις αποθεματικού στη βάση
        print("📊 2. ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΕΜΑΤΙΚΟΥ ΣΤΗ ΒΑΣΗ")
        print("-" * 50)
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal or 0:,.2f}€")
        print(f"⏱️ Διάρκεια σε μήνες: {building.reserve_fund_duration_months or 0}")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
        print(f"📅 Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date or 'Δεν έχει οριστεί'}")
        print(f"💰 Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0:,.2f}€")
        print()
        
        # 3. Υπολογισμοί
        print("📊 3. ΥΠΟΛΟΓΙΣΜΟΙ")
        print("-" * 50)
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            total_apartments = apartments.count()
            total_monthly_contribution = monthly_target * total_apartments
            
            print(f"💰 Μηνιαία δόση ανά διαμέρισμα: {monthly_target:,.2f}€")
            print(f"💰 Συνολική μηνιαία εισφορά: {total_monthly_contribution:,.2f}€")
            print(f"📈 Πρόοδος: {building.current_reserve:,.2f}€ / {building.reserve_fund_goal:,.2f}€")
            
            if building.reserve_fund_goal > 0:
                progress_percentage = (float(building.current_reserve) / float(building.reserve_fund_goal)) * 100
                print(f"📊 Ποσοστό πρόοδου: {progress_percentage:.1f}%")
        else:
            print("⚠️ Δεν έχουν οριστεί στόχος ή διάρκεια αποθεματικού")
        
        print()
        
        # 4. Έλεγχος για hardcoded τιμές
        print("📊 4. ΕΛΕΓΧΟΣ HARDCODED ΤΙΜΩΝ")
        print("-" * 50)
        
        # Έλεγχος αν οι τιμές είναι ίδιες με αυτές που βλέπεις στο dashboard
        dashboard_goal = 10000.00  # Τι βλέπεις στο dashboard
        dashboard_duration = 24    # Τι βλέπεις στο dashboard
        dashboard_monthly = 416.67 # Τι βλέπεις στο dashboard
        
        print(f"🎯 Στόχος στο dashboard: {dashboard_goal:,.2f}€")
        print(f"🎯 Στόχος στη βάση: {building.reserve_fund_goal or 0:,.2f}€")
        
        if building.reserve_fund_goal == dashboard_goal:
            print("✅ Στόχος ταιριάζει")
        else:
            print("❌ Στόχος ΔΕΝ ταιριάζει - πιθανό hardcoded")
        
        print(f"⏱️ Διάρκεια στο dashboard: {dashboard_duration} μήνες")
        print(f"⏱️ Διάρκεια στη βάση: {building.reserve_fund_duration_months or 0} μήνες")
        
        if building.reserve_fund_duration_months == dashboard_duration:
            print("✅ Διάρκεια ταιριάζει")
        else:
            print("❌ Διάρκεια ΔΕΝ ταιριάζει - πιθανό hardcoded")
        
        print(f"💰 Μηνιαία δόση στο dashboard: {dashboard_monthly:,.2f}€")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            calculated_monthly = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            print(f"💰 Μηνιαία δόση στη βάση: {calculated_monthly:,.2f}€")
            
            if abs(calculated_monthly - dashboard_monthly) < 0.01:
                print("✅ Μηνιαία δόση ταιριάζει")
            else:
                print("❌ Μηνιαία δόση ΔΕΝ ταιριάζει - πιθανό hardcoded")
        else:
            print("❌ Δεν μπορεί να υπολογιστεί μηνιαία δόση")
        
        print()
        
        # 5. Προτάσεις επιλύσεως
        print("📊 5. ΠΡΟΤΑΣΕΙΣ ΕΠΙΛΥΣΕΩΣ")
        print("-" * 50)
        
        if building.reserve_fund_goal != dashboard_goal or building.reserve_fund_duration_months != dashboard_duration:
            print("🔧 Επιλογή 1: Ενημέρωση βάσης με τις τιμές του dashboard")
            print("   - Στόχος: 10.000,00€")
            print("   - Διάρκεια: 24 μήνες")
            print("   - Μηνιαία δόση: 416,67€")
            print()
            
            print("🔧 Επιλογή 2: Έλεγχος frontend για hardcoded τιμές")
            print("   - Έλεγχος localStorage")
            print("   - Έλεγχος default values")
            print("   - Έλεγχος API responses")
            print()
            
            print("🔧 Επιλογή 3: Ενημέρωση με νέες τιμές")
            print("   - Εισαγωγή νέων τιμών από χρήστη")
            print("   - Αποθήκευση στη βάση")
            print("   - Ενημέρωση dashboard")
        else:
            print("✅ Όλες οι τιμές ταιριάζουν - δεν υπάρχει πρόβλημα")
        
        print()
        print("=" * 60)
        print("🏁 ΟΛΟΚΛΗΡΩΘΗΚΕ Ο ΕΛΕΓΧΟΣ")

if __name__ == "__main__":
    check_current_reserve_settings()

