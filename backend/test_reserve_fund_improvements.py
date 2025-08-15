#!/usr/bin/env python3
"""
Script για έλεγχο των βελτιώσεων στο reserve fund
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from django.db import models
from tenants.models import Client
from financial.services import FinancialDashboardService

def test_reserve_fund_improvements():
    """Έλεγχος των βελτιώσεων στο reserve fund"""
    
    print("🔍 Έλεγχος βελτιώσεων reserve fund...")
    
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
        
        # Έλεγχος για διαφορετικούς μήνες
        test_months = ['2025-08', '2025-05', '2026-02']
        
        for month in test_months:
            print(f"\n📊 Έλεγχος για μήνα: {month}")
            
            try:
                summary = service.get_summary(month)
                
                print(f"   💰 Τρέχον Αποθεματικό: {summary.get('current_reserve', 'N/A')}€")
                print(f"   🎯 Στόχος Αποθεματικού: {summary.get('reserve_fund_goal', 'N/A')}€")
                print(f"   📅 Εισφορά Αποθεματικού: {summary.get('reserve_fund_contribution', 'N/A')}€")
                
                # Έλεγχος αν το αποθεματικό είναι σωστό
                current_reserve = summary.get('current_reserve', 0)
                reserve_goal = summary.get('reserve_fund_goal', 0)
                
                if current_reserve == 0 and reserve_goal == 0:
                    print(f"   ✅ ΣΩΣΤΟ! Το αποθεματικό είναι 0€ και δεν έχει οριστεί στόχος.")
                elif current_reserve == 0 and reserve_goal > 0:
                    print(f"   ✅ ΣΩΣΤΟ! Το αποθεματικό είναι 0€ αλλά έχει οριστεί στόχος {reserve_goal}€.")
                else:
                    print(f"   ⚠️  ΕΛΕΓΧΟΣ: Αποθεματικό {current_reserve}€, Στόχος {reserve_goal}€")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα κατά τον υπολογισμό: {e}")
        
        # Έλεγχος και άλλων κτιρίων
        print(f"\n🏢 Έλεγχος άλλων κτιρίων:")
        buildings = Building.objects.all()
        
        for building in buildings:
            if building.name != alkmanos.name:
                print(f"\n   🏢 Κτίριο: {building.name}")
                
                # Έλεγχος αποθεματικού στη βάση
                print(f"      Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
                
                # Έλεγχος πραγματικών συναλλαγών
                from financial.models import Payment, Expense
                total_payments = Payment.objects.filter(
                    apartment__building_id=building.id
                ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
                
                total_expenses = Expense.objects.filter(
                    building_id=building.id
                ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
                
                correct_reserve = total_payments - total_expenses
                print(f"      Σωστό αποθεματικό: {correct_reserve}€")
                
                if building.current_reserve == correct_reserve:
                    print(f"      ✅ ΣΩΣΤΟ!")
                else:
                    print(f"      ❌ ΛΑΘΟΣ! Διαφορά: {abs(building.current_reserve - correct_reserve)}€")
    
    print(f"\n🎉 Ο έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    test_reserve_fund_improvements()
