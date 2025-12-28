#!/usr/bin/env python3
"""
Script για διορθώση του προβλήματος με το αποθεματικό
Διορθώνει όλα τα κτίρια που έχουν αποθεματικό χωρίς να υπάρχουν πραγματικές συναλλαγές
"""

import os
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

def fix_reserve_fund_issue():
    """Διορθώνει το πρόβλημα με το αποθεματικό"""
    
    print("🔧 Διορθώση προβλήματος αποθεματικού...")
    
    # Εύρεση του demo tenant
    try:
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρήση tenant: {tenant.name}")
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant 'demo'")
        return
    
    # Διόρθωση στο tenant context
    with tenant_context(tenant):
        buildings = Building.objects.all()
        print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
        
        for building in buildings:
            print(f"\n🏢 Ελέγχος κτιρίου: {building.name}")
            print(f"   Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
            
            # Έλεγχος αν υπάρχουν πραγματικές συναλλαγές
            total_payments = Payment.objects.filter(
                apartment__building_id=building.id
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            total_expenses = Expense.objects.filter(
                building_id=building.id
            ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"   Σύνολο πληρωμών: {total_payments}€")
            print(f"   Σύνολο δαπανών: {total_expenses}€")
            
            # Υπολογισμός σωστού αποθεματικού
            correct_reserve = total_payments - total_expenses
            print(f"   Σωστό αποθεματικό: {correct_reserve}€")
            
            # Έλεγχος αν χρειάζεται διόρθωση
            if building.current_reserve != correct_reserve:
                print("   ⚠️  ΧΡΕΙΑΖΕΤΑΙ ΔΙΟΡΘΩΣΗ!")
                print(f"      Τρέχον: {building.current_reserve}€")
                print(f"      Σωστό: {correct_reserve}€")
                
                # Διόρθωση
                building.current_reserve = correct_reserve
                building.save()
                print(f"   ✅ ΔΙΟΡΘΩΘΗΚΕ σε {correct_reserve}€")
            else:
                print("   ✅ Το αποθεματικό είναι σωστό!")
    
    print("\n🎉 Η διόρθωση ολοκληρώθηκε!")

if __name__ == "__main__":
    fix_reserve_fund_issue()
