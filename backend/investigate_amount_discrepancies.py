#!/usr/bin/env python3
"""
Script για την έρευνα των διαφορών στα ποσά του Αραχώβης 12
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
from django.db import models
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment

def investigate_amount_discrepancies():
    """
    Έρευνα των διαφορών στα ποσά
    """
    print("🔍 Ξεκινάει η έρευνα των διαφορών στα ποσά...")
    
    with schema_context('demo'):
        # Εύρεση του κτιρίου Αραχώβης 12
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        print("\n" + "="*60)
        print("📊 ΠΡΑΓΜΑΤΙΚΑ ΔΕΔΟΜΕΝΑ ΑΠΟ ΤΗ ΒΑΣΗ")
        print("="*60)
        
        # 1. Πραγματικά έξοδα Αυγούστου 2025
        august_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        ).order_by('date')
        
        total_august_expenses = august_expenses.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        print("\n💸 ΠΡΑΓΜΑΤΙΚΑ ΕΞΟΔΑ ΑΥΓΟΥΣΤΟΥ 2025:")
        print(f"📊 Συνολικά έξοδα: {total_august_expenses}€")
        print(f"📝 Αριθμός δαπανών: {august_expenses.count()}")
        
        for expense in august_expenses:
            print(f"   • {expense.title}: {expense.amount}€ ({expense.date})")
        
        # 2. Πραγματικές πληρωμές Αυγούστου 2025
        august_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=8
        ).order_by('apartment__number')
        
        total_august_payments = august_payments.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        print("\n💰 ΠΡΑΓΜΑΤΙΚΕΣ ΠΛΗΡΩΜΕΣ ΑΥΓΟΥΣΤΟΥ 2025:")
        print(f"📊 Συνολικές πληρωμές: {total_august_payments}€")
        print(f"📝 Αριθμός πληρωμών: {august_payments.count()}")
        
        for payment in august_payments:
            print(f"   • Διαμέρισμα {payment.apartment.number}: {payment.amount}€ ({payment.date})")
        
        # 3. Εισφορά αποθεματικού ανά διαμέρισμα
        apartments = Apartment.objects.filter(building=building).order_by('number')
        reserve_contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
        total_reserve_contribution = reserve_contribution_per_apartment * apartments.count()
        
        print("\n🏦 ΕΙΣΦΟΡΑ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"💰 Εισφορά ανά διαμέρισμα: {reserve_contribution_per_apartment}€")
        print(f"🏠 Συνολικά διαμερίσματα: {apartments.count()}")
        print(f"📊 Συνολική εισφορά: {total_reserve_contribution}€")
        
        # 4. Τρέχον αποθεματικό
        current_reserve = building.current_reserve or Decimal('0.00')
        print("\n🏦 ΤΡΕΧΟΝ ΑΠΟΘΕΜΑΤΙΚΟ:")
        print(f"💰 Τρέχον αποθεματικό: {current_reserve}€")
        
        print("\n" + "="*60)
        print("🔍 ΑΝΑΦΕΡΟΜΕΝΑ ΠΟΣΑ (ΛΑΘΟΣ)")
        print("="*60)
        
        print("\n❌ ΑΝΑΦΕΡΟΜΕΝΑ ΠΟΣΑ:")
        print("   • Λειτουργικές Δαπάνες 120,00€ (ΛΑΘΟΣ)")
        print("   • Εισφορά αποθεματικού: 66,67€ (ΛΑΘΟΣ)")
        print("   • Συνολικές υποχρεώσεις: 186,67€ (ΛΑΘΟΣ)")
        
        print("\n✅ ΠΡΑΓΜΑΤΙΚΑ ΠΟΣΑ:")
        print(f"   • Λειτουργικές Δαπάνες {total_august_expenses}€")
        print(f"   • Εισφορά αποθεματικού: {total_reserve_contribution}€")
        print(f"   • Συνολικές υποχρεώσεις: {total_august_expenses + total_reserve_contribution}€")
        
        print("\n📊 ΔΙΑΦΟΡΕΣ:")
        print(f"   • Διαφορά εξόδων: {total_august_expenses - Decimal('120.00')}€")
        print(f"   • Διαφορά αποθεματικού: {total_reserve_contribution - Decimal('66.67')}€")
        print(f"   • Διαφορά συνολικού: {(total_august_expenses + total_reserve_contribution) - Decimal('186.67')}€")
        
        print("\n" + "="*60)
        print("🔍 ΕΡΕΥΝΑ ΠΗΓΗΣ ΤΩΝ ΛΑΘΟΣ ΠΟΣΩΝ")
        print("="*60)
        
        # Έλεγχος αν υπάρχουν hardcoded ποσά στον κώδικα
        print("\n🔍 ΕΡΕΥΝΑ ΚΩΔΙΚΑ:")
        print("   • Πιθανή πηγή: Frontend components")
        print("   • Πιθανή πηγή: Backend calculations")
        print("   • Πιθανή πηγή: Database views ή stored procedures")
        
        # Έλεγχος αν υπάρχουν παλαιότερα δεδομένα
        print("\n🔍 ΕΡΕΥΝΑ ΙΣΤΟΡΙΚΩΝ ΔΕΔΟΜΕΝΩΝ:")
        
        # Έλεγχος δαπανών προηγούμενων μηνών
        previous_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month__lt=8
        ).order_by('-date')
        
        if previous_expenses.exists():
            print(f"   • Υπάρχουν δαπάνες προηγούμενων μηνών: {previous_expenses.count()}")
            for expense in previous_expenses[:5]:  # Πρώτες 5
                print(f"     - {expense.title}: {expense.amount}€ ({expense.date})")
        else:
            print("   • Δεν υπάρχουν δαπάνες προηγούμενων μηνών")
        
        # Έλεγχος πληρωμών προηγούμενων μηνών
        previous_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month__lt=8
        ).order_by('-date')
        
        if previous_payments.exists():
            print(f"   • Υπάρχουν πληρωμές προηγούμενων μηνών: {previous_payments.count()}")
            for payment in previous_payments[:5]:  # Πρώτες 5
                print(f"     - Διαμέρισμα {payment.apartment.number}: {payment.amount}€ ({payment.date})")
        else:
            print("   • Δεν υπάρχουν πληρωμές προηγούμενων μηνών")
        
        print("\n" + "="*60)
        print("💡 ΠΡΟΤΑΣΕΙΣ ΔΙΟΡΘΩΣΗΣ")
        print("="*60)
        
        print("\n🎯 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΕΝΕΡΓΕΙΕΣ:")
        print("   1. 🔍 Εύρεση και διόρθωση hardcoded ποσών στο frontend")
        print("   2. 🔍 Έλεγχος backend calculations")
        print("   3. 🔍 Έλεγχος database views")
        print("   4. 🔍 Έλεγχος API endpoints")
        print("   5. 🔍 Έλεγχος financial calculators")

if __name__ == "__main__":
    try:
        investigate_amount_discrepancies()
        print("\n🎉 Η έρευνα ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά την έρευνα: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
