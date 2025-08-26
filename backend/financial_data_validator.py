#!/usr/bin/env python3
"""
Script για σύστημα αυτόματης επιβεβαίωσης ποσών
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
from django.db import models
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Payment
from financial.services import FinancialDashboardService

def validate_financial_data():
    """
    Συστηματικός έλεγχος αξιοπιστίας ποσών
    """
    print("🔍 Ξεκινάει ο συστηματικός έλεγχος αξιοπιστίας...")
    
    with schema_context('demo'):
        # Εύρεση όλων των κτιρίων
        buildings = Building.objects.all()
        print(f"🏢 Συνολικά κτίρια: {buildings.count()}")
        
        total_issues = 0
        total_buildings_checked = 0
        
        for building in buildings:
            print(f"\n" + "="*60)
            print(f"🔍 ΕΛΕΓΧΟΣ ΚΤΙΡΙΟΥ: {building.name}")
            print("="*60)
            
            total_buildings_checked += 1
            building_issues = 0
            
            # 1. Έλεγχος βασικών ρυθμίσεων
            print(f"\n📊 1. ΕΛΕΓΧΟΣ ΡΥΘΜΙΣΕΩΝ:")
            
            if not building.reserve_contribution_per_apartment:
                print(f"   ⚠️  Δεν έχει οριστεί εισφορά αποθεματικού ανά διαμέρισμα")
                building_issues += 1
            
            if not building.management_fee_per_apartment:
                print(f"   ⚠️  Δεν έχει οριστεί διαχειριστικά τέλη ανά διαμέρισμα")
                building_issues += 1
            
            # 2. Έλεγχος διαμερισμάτων
            apartments = Apartment.objects.filter(building=building)
            print(f"\n📊 2. ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΩΝ:")
            print(f"   📊 Συνολικά διαμερίσματα: {apartments.count()}")
            
            if apartments.count() == 0:
                print(f"   ❌ Δεν υπάρχουν διαμερίσματα")
                building_issues += 1
            
            # Έλεγχος participation mills
            total_mills = sum(apt.participation_mills or 0 for apt in apartments)
            if total_mills != 1000:
                print(f"   ⚠️  Συνολικά mills: {total_mills} (πρέπει να είναι 1000)")
                building_issues += 1
            
            # 3. Έλεγχος τρέχοντος μήνα
            current_month = datetime.now().strftime('%Y-%m')
            print(f"\n📊 3. ΕΛΕΓΧΟΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ ({current_month}):")
            
            # Έλεγχος δαπανών
            current_expenses = Expense.objects.filter(
                building=building,
                date__year=datetime.now().year,
                date__month=datetime.now().month
            )
            total_expenses = current_expenses.aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00')
            
            print(f"   💸 Δαπάνες τρέχοντος μήνα: {total_expenses}€")
            
            # Έλεγχος πληρωμών
            current_payments = Payment.objects.filter(
                apartment__building=building,
                date__year=datetime.now().year,
                date__month=datetime.now().month
            )
            total_payments = current_payments.aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00')
            
            print(f"   💰 Πληρωμές τρέχοντος μήνα: {total_payments}€")
            
            # 4. Έλεγχος αποθεματικού
            print(f"\n📊 4. ΕΛΕΓΧΟΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
            print(f"   💰 Τρέχον αποθεματικό: {building.current_reserve or 0}€")
            print(f"   🎯 Στόχος αποθεματικού: {building.reserve_fund_goal or 0}€")
            
            if building.current_reserve and building.current_reserve < 0:
                print(f"   ⚠️  Το αποθεματικό είναι αρνητικό")
                building_issues += 1
            
            # 5. Έλεγχος FinancialDashboardService
            print(f"\n📊 5. ΕΛΕΓΧΟΣ DASHBOARD SERVICE:")
            
            try:
                dashboard_service = FinancialDashboardService(building.id)
                summary = dashboard_service.get_summary()
                
                print(f"   💰 Reserve fund contribution: {summary.get('reserve_fund_contribution', 0)}€")
                print(f"   📊 Total balance: {summary.get('total_balance', 0)}€")
                print(f"   📈 Current obligations: {summary.get('current_obligations', 0)}€")
                
                # Έλεγχος για ασυνεπή δεδομένα
                if summary.get('reserve_fund_contribution', 0) < 0:
                    print(f"   ❌ Αρνητική εισφορά αποθεματικού")
                    building_issues += 1
                
            except Exception as e:
                print(f"   ❌ Σφάλμα στο Dashboard Service: {e}")
                building_issues += 1
            
            # 6. Έλεγχος για εκκρεμείς πληρωμές
            print(f"\n📊 6. ΕΛΕΓΧΟΣ ΕΚΚΡΕΜΩΝ ΠΛΗΡΩΜΩΝ:")
            
            apartments_with_negative_balance = apartments.filter(current_balance__lt=0)
            print(f"   📊 Διαμερίσματα με αρνητικό υπόλοιπο: {apartments_with_negative_balance.count()}")
            
            if apartments_with_negative_balance.exists():
                print(f"   ⚠️  Λίστα διαμερισμάτων με αρνητικό υπόλοιπο:")
                for apt in apartments_with_negative_balance[:5]:  # Πρώτα 5
                    print(f"      • Διαμέρισμα {apt.number}: {apt.current_balance}€")
            
            # 7. Συμπέρασμα για το κτίριο
            print(f"\n📊 7. ΣΥΜΠΕΡΑΣΜΑ ΓΙΑ ΤΟ ΚΤΙΡΙΟ:")
            
            if building_issues == 0:
                print(f"   ✅ Το κτίριο είναι σε καλή κατάσταση")
            else:
                print(f"   ⚠️  Βρέθηκαν {building_issues} προβλήματα")
                total_issues += building_issues
        
        # 8. Συνολικό συμπέρασμα
        print(f"\n" + "="*60)
        print(f"📊 ΣΥΝΟΛΙΚΟ ΣΥΜΠΕΡΑΣΜΑ")
        print("="*60)
        
        print(f"\n📊 ΣΤΑΤΙΣΤΙΚΑ:")
        print(f"   🏢 Κτίρια που ελέγχθηκαν: {total_buildings_checked}")
        print(f"   ⚠️  Συνολικά προβλήματα: {total_issues}")
        
        if total_issues == 0:
            print(f"\n✅ Όλα τα κτίρια είναι σε καλή κατάσταση!")
        else:
            print(f"\n⚠️  Χρειάζεται προσοχή σε {total_issues} προβλήματα")
        
        # 9. Προτάσεις βελτίωσης
        print(f"\n💡 ΠΡΟΤΑΣΕΙΣ ΒΕΛΤΙΩΣΗΣ:")
        
        if total_issues > 0:
            print(f"   1. 🔧 Διόρθωση ρυθμίσεων αποθεματικού")
            print(f"   2. 🔧 Διόρθωση participation mills")
            print(f"   3. 🔧 Εξόφληση εκκρεμών πληρωμών")
            print(f"   4. 🔧 Έλεγχος αρνητικών αποθεματικών")
        else:
            print(f"   1. ✅ Το σύστημα λειτουργεί σωστά")
            print(f"   2. ✅ Όλα τα δεδομένα είναι αξιόπιστα")
            print(f"   3. ✅ Δεν χρειάζονται διορθώσεις")

def validate_specific_building(building_id: int):
    """
    Έλεγχος συγκεκριμένου κτιρίου
    """
    print(f"🔍 Έλεγχος κτιρίου ID: {building_id}")
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=building_id)
            print(f"🏢 Κτίριο: {building.name}")
            
            # Εκτέλεση ελέγχου μόνο για αυτό το κτίριο
            buildings = Building.objects.filter(id=building_id)
            
            # Επαναχρησιμοποίηση της λογικής από το validate_financial_data
            # (απλοποιημένη έκδοση)
            
            apartments = Apartment.objects.filter(building=building)
            print(f"📊 Διαμερίσματα: {apartments.count()}")
            
            current_expenses = Expense.objects.filter(
                building=building,
                date__year=datetime.now().year,
                date__month=datetime.now().month
            )
            total_expenses = current_expenses.aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00')
            
            print(f"💸 Δαπάνες τρέχοντος μήνα: {total_expenses}€")
            
            dashboard_service = FinancialDashboardService(building.id)
            summary = dashboard_service.get_summary()
            
            print(f"💰 Reserve fund contribution: {summary.get('reserve_fund_contribution', 0)}€")
            print(f"📊 Total balance: {summary.get('total_balance', 0)}€")
            
        except Building.DoesNotExist:
            print(f"❌ Το κτίριο με ID {building_id} δεν βρέθηκε")
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")

if __name__ == "__main__":
    try:
        # Έλεγχος όλων των κτιρίων
        validate_financial_data()
        
        # Έλεγχος συγκεκριμένου κτιρίου (Αραχώβης 12)
        print(f"\n" + "="*60)
        print(f"🔍 ΕΛΕΓΧΟΣ ΑΡΑΧΩΒΗΣ 12")
        print("="*60)
        validate_specific_building(1)
        
        print("\n🎉 Ο έλεγχος ολοκληρώθηκε επιτυχώς!")
    except Exception as e:
        print(f"\n❌ Σφάλμα κατά τον έλεγχο: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
