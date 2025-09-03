#!/usr/bin/env python3
"""
Script για διόρθωση του αποθεματικού της πολυκατοικίας Αλκμάνος 22
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from financial.models import Payment, Expense
from django.db.models import Sum
from decimal import Decimal

def fix_alkmanos_reserve():
    """Διόρθωση αποθεματικού πολυκατοικίας Αλκμάνος 22"""
    
    try:
        # Εύρεση του demo tenant
        tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {tenant.name}")
        
        # Εύρεση κτιρίου στο tenant context
        with tenant_context(tenant):
            try:
                building = Building.objects.get(name="Πολυκατοικία Αλκμάνος 22")
                print(f"✅ Βρέθηκε κτίριο: {building.name} (ID: {building.id})")
                print(f"💰 Τρέχον αποθεματικό στη βάση: {building.current_reserve}€")
                
                # Υπολογισμός πραγματικού αποθεματικού
                total_payments = Payment.objects.filter(
                    apartment__building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                total_expenses = Expense.objects.filter(
                    building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                actual_reserve = total_payments - total_expenses
                
                print(f"💳 Συνολικές εισπράξεις: {total_payments}€")
                print(f"💸 Συνολικές δαπάνες: {total_expenses}€")
                print(f"💰 Πραγματικό αποθεματικό: {actual_reserve}€")
                
                # Έλεγχος αν χρειάζεται διόρθωση
                if building.current_reserve != actual_reserve:
                    print("⚠️ ΧΡΕΙΑΖΕΤΑΙ ΔΙΟΡΘΩΣΗ!")
                    print(f"   Τρέχον: {building.current_reserve}€")
                    print(f"   Σωστό: {actual_reserve}€")
                    
                    # Διόρθωση
                    building.current_reserve = actual_reserve
                    building.save()
                    print(f"✅ ΔΙΟΡΘΩΘΗΚΕ σε {actual_reserve}€")
                else:
                    print("✅ Το αποθεματικό είναι σωστό!")
                
                # Έλεγχος ρυθμίσεων αποθεματικού
                print("\n📊 Ρυθμίσεις αποθεματικού:")
                print(f"   Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
                print(f"   Αμοιβή διαχείρισης ανά διαμέρισμα: {building.management_fee_per_apartment or 0}€")
                
                # Έλεγχος αν χρειάζεται μηδενισμός εισφοράς αποθεματικού
                if building.reserve_contribution_per_apartment and building.reserve_contribution_per_apartment > 0:
                    print(f"✅ Η εισφορά αποθεματικού είναι {building.reserve_contribution_per_apartment}€ ανά διαμέρισμα")
                else:
                    print("✅ Η εισφορά αποθεματικού είναι μηδενική (νέο κτίριο)")
                
            except Building.DoesNotExist:
                print("❌ Δεν βρέθηκε κτίριο 'Πολυκατοικία Αλκμάνος 22'")
                
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_alkmanos_reserve()
