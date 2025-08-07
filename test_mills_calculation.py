#!/usr/bin/env python3
"""
Script για έλεγχο υπολογισμών με βάση τα χιλιοστά
"""

import os
import sys
import django
import requests
from decimal import Decimal

# Προσθήκη του backend directory στο path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from apartments.models import Apartment
from buildings.models import Building
from tenants.models import Client

def test_mills_calculation():
    """Έλεγχος υπολογισμών με βάση τα χιλιοστά"""
    
    print("🧮 Έλεγχος Υπολογισμών Χιλιοστών")
    print("=" * 50)
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε demo tenant")
        return
    
    # Χρήση tenant context
    with tenant_context(tenant):
        # Εύρεση του κτιρίου 3
        try:
            building = Building.objects.get(id=3)
            print(f"🏢 Κτίριο: {building.name}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 3")
            return
        
        # Εύρεση όλων των διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        if not apartments.exists():
            print("❌ Δεν βρέθηκαν διαμερίσματα")
            return
        
        print(f"📋 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # Έλεγχος συνολικών χιλιοστών
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        print(f"💰 Συνολικά χιλιοστά: {total_mills}")
        
        if total_mills != 1000:
            print(f"⚠️ Προσοχή: Τα χιλιοστά δεν αθροίζονται σε 1000 (είναι {total_mills})")
            return
        else:
            print("✅ Τα χιλιοστά αθροίζονται σωστά σε 1000")
        
        # Έλεγχος κατανομής
        print("\n📊 Κατανομή Χιλιοστών:")
        print("-" * 50)
        print(f"{'Διαμέρισμα':<12} {'Χιλιοστά':<10} {'Ποσοστό':<10} {'Κατάσταση':<15}")
        print("-" * 50)
        
        for apartment in apartments:
            mills = apartment.participation_mills or 0
            percentage = (mills / 1000) * 100
            status = "Ενοικιασμένο" if apartment.is_rented else "Ιδιοκατοίκηση" if apartment.owner_name else "Κενό"
            print(f"{apartment.number:<12} {mills:<10} {percentage:<10.1f}% {status:<15}")
        
        print("-" * 50)
        print(f"{'ΣΥΝΟΛΟ':<12} {total_mills:<10} {'100.0':<10}%")
        
        # Δοκιμή υπολογισμού δαπάνης
        print("\n🧮 Δοκιμή Υπολογισμού Δαπάνης:")
        print("-" * 50)
        
        # Παράδειγμα δαπάνης 1000€
        expense_amount = 1000
        print(f"💰 Ποσό δαπάνης: {expense_amount}€")
        
        print(f"{'Διαμέρισμα':<12} {'Χιλιοστά':<10} {'Μερίδιο':<12} {'Ποσό':<10}")
        print("-" * 50)
        
        total_share = 0
        for apartment in apartments:
            mills = apartment.participation_mills or 0
            share_percentage = mills / 1000
            share_amount = expense_amount * share_percentage
            total_share += share_amount
            
            print(f"{apartment.number:<12} {mills:<10} {share_percentage:<12.3f} {share_amount:<10.2f}€")
        
        print("-" * 50)
        print(f"{'ΣΥΝΟΛΟ':<12} {total_mills:<10} {'1.000':<12} {total_share:<10.2f}€")
        
        if abs(total_share - expense_amount) < 0.01:
            print("✅ Οι υπολογισμοί είναι σωστοί!")
        else:
            print(f"⚠️ Προσοχή: Διαφορά {abs(total_share - expense_amount):.2f}€")

def test_api_endpoints():
    """Έλεγχος API endpoints"""
    
    print("\n🌐 Έλεγχος API Endpoints:")
    print("-" * 50)
    
    base_url = "http://localhost:8000"
    
    # Έλεγχος διαμερισμάτων
    try:
        response = requests.get(f"{base_url}/api/apartments/by-building/3/")
        if response.status_code == 200:
            apartments_data = response.json()
            print(f"✅ API διαμερισμάτων: {len(apartments_data)} διαμερίσματα")
            
            # Έλεγχος χιλιοστών στο API
            total_mills_api = sum(apt.get('participation_mills', 0) for apt in apartments_data)
            print(f"💰 Χιλιοστά από API: {total_mills_api}")
            
            if total_mills_api == 1000:
                print("✅ Τα χιλιοστά στο API είναι σωστά")
            else:
                print(f"⚠️ Προσοχή: Τα χιλιοστά στο API είναι {total_mills_api}")
        else:
            print(f"❌ API διαμερισμάτων: {response.status_code}")
    except Exception as e:
        print(f"❌ Σφάλμα API διαμερισμάτων: {e}")
    
    # Έλεγχος κάτοικων
    try:
        response = requests.get(f"{base_url}/api/apartments/residents/3/")
        if response.status_code == 200:
            residents_data = response.json()
            print(f"✅ API κάτοικων: {len(residents_data)} κάτοικοι")
        else:
            print(f"❌ API κάτοικων: {response.status_code}")
    except Exception as e:
        print(f"❌ Σφάλμα API κάτοικων: {e}")

if __name__ == "__main__":
    print("🔧 Ξεκινάει έλεγχος χιλιοστών...")
    test_mills_calculation()
    test_api_endpoints()
    print("\n✅ Ολοκληρώθηκε ο έλεγχος!")
