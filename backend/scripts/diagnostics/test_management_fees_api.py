#!/usr/bin/env python3
"""
Script για έλεγχο των εξόδων διαχείρισης μέσω API
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.services import FinancialDashboardService

def test_management_fees_api():
    """Έλεγχος των εξόδων διαχείρισης μέσω API"""
    
    print("🔍 Έλεγχος εξόδων διαχείρισης μέσω API...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant 'demo'")
        return
    
    # Έλεγχος στο tenant context
    with tenant_context(tenant):
        from buildings.models import Building
        
        # Ελέγχω το κτίριο Αλκμάνος 22
        alkmanos = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not alkmanos:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος 22")
            return
        
        print(f"\n🏢 Βρέθηκε κτίριο: {alkmanos.name} (ID: {alkmanos.id})")
        print(f"   Αριθμός διαμερισμάτων: {alkmanos.apartments_count}")
        print(f"   Αμοιβή διαχείρισης: {alkmanos.management_fee_per_apartment}€/διαμέρισμα/μήνα")
        
        # Έλεγχος μέσω FinancialDashboardService
        service = FinancialDashboardService(alkmanos.id)
        
        try:
            summary = service.get_summary('2025-08')
            
            print("\n💰 Δεδομένα από API:")
            print(f"   Management Fee per Apartment: {summary.get('management_fee_per_apartment', 'N/A')}€")
            print(f"   Total Management Cost: {summary.get('total_management_cost', 'N/A')}€")
            print(f"   Apartments Count: {summary.get('apartments_count', 'N/A')}")
            
            # Έλεγχος ορθότητας υπολογισμών
            expected_total = alkmanos.management_fee_per_apartment * alkmanos.apartments_count
            actual_total = summary.get('total_management_cost', 0)
            
            print("\n🔍 Έλεγχος Υπολογισμών:")
            print(f"   Αναμενόμενο συνολικό κόστος: {expected_total}€")
            print(f"   Πραγματικό συνολικό κόστος: {actual_total}€")
            
            if abs(expected_total - actual_total) < 0.01:
                print("   ✅ Οι υπολογισμοί είναι σωστοί!")
            else:
                print(f"   ❌ Διαφορά: {abs(expected_total - actual_total)}€")
                
            # Πρόσθετα στοιχεία
            print("\n📊 Επιπλέον Οικονομικά Δεδομένα:")
            print(f"   Τρέχον Αποθεματικό: {summary.get('current_reserve', 'N/A')}€")
            print(f"   Στόχος Αποθεματικού: {summary.get('reserve_fund_goal', 'N/A')}€")
            print(f"   Συνολικό Υπόλοιπο: {summary.get('total_balance', 'N/A')}€")
                
        except Exception as e:
            print(f"❌ Σφάλμα κατά τον έλεγχο API: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n🎉 Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    test_management_fees_api()
