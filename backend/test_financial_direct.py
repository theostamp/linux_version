#!/usr/bin/env python3
"""
Script για έλεγχο του financial API απευθείας μέσω Django shell
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.services import FinancialDashboardService

def test_financial_direct():
    """Έλεγχος του financial API απευθείας"""
    
    print("🔍 Έλεγχος Financial API απευθείας...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant 'demo'")
        return
    
    # Έλεγχος στο tenant context
    with tenant_context(tenant):
        # Εύρεση του κτιρίου Αλκμάνος 22
        from buildings.models import Building
        alkmanos = Building.objects.filter(name__icontains='Αλκμάνος').first()
        
        if not alkmanos:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος 22")
            return
        
        print(f"🏢 Βρέθηκε κτίριο: {alkmanos.name} (ID: {alkmanos.id})")
        
        # Δημιουργία του FinancialDashboardService
        service = FinancialDashboardService(alkmanos.id)
        
        # Έλεγχος για Αύγουστο 2025
        month = '2025-08'
        print(f"\n📊 Έλεγχος για μήνα: {month}")
        
        try:
            summary = service.get_summary(month)
            
            print(f"\n💰 Δεδομένα Αποθεματικού:")
            print(f"   Τρέχον Αποθεματικό: {summary.get('current_reserve', 'N/A')}€")
            print(f"   Εισφορά Αποθεματικού: {summary.get('reserve_fund_contribution', 'N/A')}€")
            print(f"   Στόχος Αποθεματικού: {summary.get('reserve_fund_goal', 'N/A')}€")
            
            print(f"\n📈 Γενικά Οικονομικά:")
            print(f"   Συνολικό Υπόλοιπο: {summary.get('total_balance', 'N/A')}€")
            print(f"   Τρέχουσες Υποχρεώσεις: {summary.get('current_obligations', 'N/A')}€")
            print(f"   Δαπάνες Μήνα: {summary.get('total_expenses_month', 'N/A')}€")
            print(f"   Πληρωμές Μήνα: {summary.get('total_payments_month', 'N/A')}€")
            
            # Έλεγχος αν το αποθεματικό είναι σωστό
            current_reserve = summary.get('current_reserve', 0)
            if current_reserve == 0:
                print(f"\n✅ ΣΩΣΤΟ! Το αποθεματικό είναι 0€ όπως πρέπει για νέο κτίριο χωρίς συναλλαγές.")
            else:
                print(f"\n❌ ΛΑΘΟΣ! Το αποθεματικό είναι {current_reserve}€ αντί για 0€.")
            
            # Εμφάνιση πλήρων δεδομένων για debugging
            print(f"\n📋 Πλήρη Απόκριση:")
            for key, value in summary.items():
                print(f"   {key}: {value}")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τον υπολογισμό: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_financial_direct()
