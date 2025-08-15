#!/usr/bin/env python3
"""
Script επαλήθευσης ότι η διόρθωση του αποθεματικού λειτούργησε σωστά
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
from buildings.models import Building
from financial.models import Payment, Expense

def verify_reserve_fix():
    """Επαληθεύει ότι η διόρθωση του αποθεματικού λειτούργησε"""
    
    print("🔍 Επαλήθευση διόρθωσης αποθεματικού...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant 'demo'")
        return
    
    # Έλεγχος στο tenant context
    with tenant_context(tenant):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        all_correct = True
        
        for building in buildings:
            print(f"\n🏢 Ελέγχος κτιρίου: {building.name}")
            
            # Έλεγχος αν υπάρχουν πραγματικές συναλλαγές
            total_payments = Payment.objects.filter(
                apartment__building_id=building.id
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            total_expenses = Expense.objects.filter(
                building_id=building.id
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογισμός σωστού αποθεματικού
            correct_reserve = total_payments - total_expenses
            
            print(f"   Σύνολο πληρωμών: {total_payments}€")
            print(f"   Σύνολο δαπανών: {total_expenses}€")
            print(f"   Σωστό αποθεματικό: {correct_reserve}€")
            print(f"   Τρέχον αποθεματικό: {building.current_reserve}€")
            
            # Έλεγχος αν είναι σωστό
            if abs(building.current_reserve - correct_reserve) < Decimal('0.01'):
                print(f"   ✅ ΣΩΣΤΟ!")
            else:
                print(f"   ❌ ΛΑΘΟΣ! Διαφορά: {abs(building.current_reserve - correct_reserve)}€")
                all_correct = False
        
        print(f"\n📊 ΣΥΝΟΛΙΚΟ ΑΠΟΤΕΛΕΣΜΑ:")
        if all_correct:
            print(f"   🎉 ΟΛΑ ΣΩΣΤΑ! Το αποθεματικό υπολογίζεται σωστά από τις συναλλαγές.")
        else:
            print(f"   ⚠️  ΥΠΑΡΧΟΥΝ ΑΚΟΜΑ ΠΡΟΒΛΗΜΑΤΑ!")
        
        # Ειδικός έλεγχος για Αλκμάνος 22
        alkmanos = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if alkmanos:
            print(f"\n🎯 ΕΙΔΙΚΟΣ ΕΛΕΓΧΟΣ ΑΛΚΜΑΝΟΣ 22:")
            print(f"   Τρέχον αποθεματικό: {alkmanos.current_reserve}€")
            if alkmanos.current_reserve == Decimal('0.00'):
                print(f"   ✅ ΣΩΣΤΟ! Το αποθεματικό είναι 0€ όπως πρέπει για νέο κτίριο χωρίς συναλλαγές.")
            else:
                print(f"   ❌ ΛΑΘΟΣ! Το αποθεματικό θα έπρεπε να είναι 0€.")

if __name__ == "__main__":
    verify_reserve_fix()
