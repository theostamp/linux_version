#!/usr/bin/env python3
"""
Τελική επιβεβαίωση για το Αραχώβης 12
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from financial.services import FinancialDashboardService
from django.db import models

def final_verification_arachovis():
    """
    Τελική επιβεβαίωση για το Αραχώβης 12
    """
    print("🎯 Ξεκινάει η τελική επιβεβαίωση για το Αραχώβης 12...")
    
    with schema_context('demo'):
        # Εύρεση του κτιρίου Αραχώβης 12
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        
        print("\n" + "="*60)
        print("📊 ΤΕΛΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ - ΑΡΑΧΩΒΗΣ 12")
        print("="*60)
        
        # 1. Έλεγχος κρίσιμων προβλημάτων
        print(f"\n🔍 1. ΕΛΕΓΧΟΣ ΚΡΙΣΙΜΩΝ ΠΡΟΒΛΗΜΑΤΩΝ:")
        
        critical_issues = 0
        
        # Έλεγχος αποθεματικού στη βάση
        if building.current_reserve == Decimal('-100.00'):
            print(f"   ✅ Αποθεματικό στη βάση: {building.current_reserve}€ (σωστό)")
        else:
            print(f"   ❌ Αποθεματικό στη βάση: {building.current_reserve}€ (λάθος)")
            critical_issues += 1
        
        # Έλεγχος δαπανών Αυγούστου 2025
        august_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        )
        total_august_expenses = august_expenses.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        if total_august_expenses == Decimal('300.00'):
            print(f"   ✅ Δαπάνες Αυγούστου 2025: {total_august_expenses}€ (σωστό)")
        else:
            print(f"   ❌ Δαπάνες Αυγούστου 2025: {total_august_expenses}€ (λάθος)")
            critical_issues += 1
        
        # Έλεγχος πληρωμών Αυγούστου 2025
        august_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=8
        )
        total_august_payments = august_payments.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        if total_august_payments == Decimal('300.00'):
            print(f"   ✅ Πληρωμές Αυγούστου 2025: {total_august_payments}€ (σωστό)")
        else:
            print(f"   ❌ Πληρωμές Αυγούστου 2025: {total_august_payments}€ (λάθος)")
            critical_issues += 1
        
        # 2. Έλεγχος ανακρίβειες
        print(f"\n🔍 2. ΕΛΕΓΧΟΣ ΑΝΑΚΡΙΒΕΙΩΝ:")
        
        accuracy_issues = 0
        
        # Έλεγχος εισφοράς αποθεματικού
        apartments = Apartment.objects.filter(building=building)
        reserve_contribution_per_apartment = building.reserve_contribution_per_apartment or Decimal('0.00')
        total_reserve_contribution = reserve_contribution_per_apartment * apartments.count()
        
        if total_reserve_contribution == Decimal('50.00'):
            print(f"   ✅ Εισφορά αποθεματικού: {total_reserve_contribution}€ (σωστό)")
        else:
            print(f"   ❌ Εισφορά αποθεματικού: {total_reserve_contribution}€ (λάθος)")
            accuracy_issues += 1
        
        # Έλεγχος participation mills
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        if total_mills == 1000:
            print(f"   ✅ Συνολικά mills: {total_mills} (σωστό)")
        else:
            print(f"   ⚠️  Συνολικά mills: {total_mills} (πρέπει να είναι 1000)")
            accuracy_issues += 1
        
        # 3. Έλεγχος FinancialDashboardService
        print(f"\n🔍 3. ΕΛΕΓΧΟΣ DASHBOARD SERVICE:")
        
        dashboard_service = FinancialDashboardService(building.id)
        summary = dashboard_service.get_summary()
        
        print(f"   💰 Reserve fund contribution: {summary.get('reserve_fund_contribution', 0)}€")
        print(f"   📊 Total balance: {summary.get('total_balance', 0)}€")
        print(f"   📈 Current obligations: {summary.get('current_obligations', 0)}€")
        
        # 4. Έλεγχος συνολικής κατάστασης
        print(f"\n🔍 4. ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΗΣ ΚΑΤΑΣΤΑΣΗΣ:")
        
        # Έλεγχος αν υπάρχουν εκκρεμείς πληρωμές
        apartments_with_negative_balance = apartments.filter(current_balance__lt=0)
        if apartments_with_negative_balance.count() == 0:
            print(f"   ✅ Δεν υπάρχουν εκκρεμείς πληρωμές")
        else:
            print(f"   ⚠️  Υπάρχουν {apartments_with_negative_balance.count()} διαμερίσματα με αρνητικό υπόλοιπο")
            accuracy_issues += 1
        
        # Έλεγχος αν υπάρχουν δεδομένα για τον Αύγουστο 2025
        if august_expenses.count() > 0 and august_payments.count() > 0:
            print(f"   ✅ Υπάρχουν πλήρη δεδομένα για τον Αύγουστο 2025")
        else:
            print(f"   ❌ Λείπουν δεδομένα για τον Αύγουστο 2025")
            critical_issues += 1
        
        # 5. Τελικό συμπέρασμα
        print(f"\n" + "="*60)
        print("📊 ΤΕΛΙΚΟ ΣΥΜΠΕΡΑΣΜΑ")
        print("="*60)
        
        print(f"\n📊 ΣΤΑΤΙΣΤΙΚΑ:")
        print(f"   🔴 Κρίσιμα προβλήματα: {critical_issues}")
        print(f"   🟡 Προβλήματα ακρίβειας: {accuracy_issues}")
        print(f"   📊 Συνολικά προβλήματα: {critical_issues + accuracy_issues}")
        
        if critical_issues == 0:
            print(f"\n✅ ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ:")
            print(f"   ✅ Όλα τα κρίσιμα προβλήματα έχουν διορθωθεί!")
        else:
            print(f"\n❌ ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ:")
            print(f"   ❌ Υπάρχουν ακόμα {critical_issues} κρίσιμα προβλήματα")
        
        if accuracy_issues == 0:
            print(f"\n✅ ΠΡΟΒΛΗΜΑΤΑ ΑΚΡΙΒΕΙΑΣ:")
            print(f"   ✅ Όλα τα δεδομένα είναι ακριβή!")
        else:
            print(f"\n⚠️  ΠΡΟΒΛΗΜΑΤΑ ΑΚΡΙΒΕΙΑΣ:")
            print(f"   ⚠️  Υπάρχουν ακόμα {accuracy_issues} προβλήματα ακρίβειας")
        
        # 6. Προτάσεις για επόμενα βήματα
        print(f"\n💡 ΠΡΟΤΑΣΕΙΣ ΓΙΑ ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        
        if critical_issues == 0 and accuracy_issues == 0:
            print(f"   1. ✅ Το σύστημα είναι έτοιμο για παραγωγή")
            print(f"   2. ✅ Όλα τα δεδομένα είναι αξιόπιστα")
            print(f"   3. ✅ Δεν χρειάζονται επιπλέον διορθώσεις")
        elif critical_issues == 0:
            print(f"   1. ✅ Τα κρίσιμα προβλήματα έχουν διορθωθεί")
            print(f"   2. 🔧 Χρειάζεται διόρθωση των προβλημάτων ακρίβειας")
            print(f"   3. 🔧 Έλεγχος participation mills")
        else:
            print(f"   1. 🔴 Χρειάζεται διόρθωση των κρίσιμων προβλημάτων")
            print(f"   2. 🔧 Χρειάζεται διόρθωση των προβλημάτων ακρίβειας")
            print(f"   3. 🔧 Επαναληπτικός έλεγχος μετά τις διορθώσεις")
        
        # 7. Αξιοπιστία συστήματος
        print(f"\n📊 ΑΞΙΟΠΙΣΤΙΑ ΣΥΣΤΗΜΑΤΟΣ:")
        
        if critical_issues == 0:
            reliability = 100
        elif critical_issues <= 2:
            reliability = 75
        elif critical_issues <= 5:
            reliability = 50
        else:
            reliability = 25
        
        print(f"   📈 Αξιοπιστία: {reliability}%")
        
        if reliability >= 90:
            print(f"   ✅ Το σύστημα είναι πολύ αξιόπιστο")
        elif reliability >= 75:
            print(f"   ✅ Το σύστημα είναι αξιόπιστο")
        elif reliability >= 50:
            print(f"   ⚠️  Το σύστημα χρειάζεται βελτίωση")
        else:
            print(f"   ❌ Το σύστημα χρειάζεται σημαντική βελτίωση")

if __name__ == "__main__":
    try:
        final_verification_arachovis()
        print("\n🎉 Η τελική επιβεβαίωση ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά την επιβεβαίωση: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
