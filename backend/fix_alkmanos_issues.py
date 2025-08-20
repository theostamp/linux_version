#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Διόρθωση προβλημάτων για την πολυκατοικία Αλκμάνος 22
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
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense

def fix_alkmanos_issues():
    """Διόρθωση προβλημάτων πολυκατοικίας Αλκμάνος 22"""
    print("🔧 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΩΝ ΑΛΚΜΑΝΟΣ 22")
    print("=" * 50)
    
    building_id = 4
    
    with schema_context('demo'):
        try:
            building = Building.objects.get(id=building_id)
            apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
            
            print(f"🏢 Κτίριο: {building.name}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            
            # 1. Διόρθωση παραμέτρων αποθεματικού ταμείου
            print(f"\n🏦 1. ΔΙΟΡΘΩΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ")
            print("-" * 40)
            
            print(f"Τρέχουσες παράμετροι:")
            print(f"  Στόχος: {building.reserve_fund_goal}€")
            print(f"  Διάρκεια: {building.reserve_fund_duration_months} μήνες")
            print(f"  Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
            
            # Υπολογισμός λογικού στόχου βάσει των παραμέτρων
            monthly_per_apartment = building.reserve_contribution_per_apartment
            duration_months = building.reserve_fund_duration_months or 12  # Default 1 χρόνος
            apartments_count = apartments.count()
            
            # Νέος στόχος: εισφορά_ανά_διαμέρισμα × διαμερίσματα × μήνες
            new_goal = monthly_per_apartment * apartments_count * duration_months
            
            print(f"\n🎯 Προτεινόμενες διορθώσεις:")
            print(f"  Νέος στόχος: {new_goal}€")
            print(f"  Διάρκεια: {duration_months} μήνες")
            print(f"  Συνολική μηνιαία εισφορά: {monthly_per_apartment * apartments_count}€")
            
            # Ενημέρωση παραμέτρων
            building.reserve_fund_goal = new_goal
            building.reserve_fund_duration_months = duration_months
            
            if not building.reserve_fund_start_date:
                from datetime import date
                building.reserve_fund_start_date = date.today()
                print(f"  Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
            
            building.save()
            print(f"✅ Ενημερώθηκαν οι παράμετροι αποθεματικού ταμείου")
            
            # 2. Διόρθωση χιλιοστών θέρμανσης
            print(f"\n🔥 2. ΔΙΟΡΘΩΣΗ ΧΙΛΙΟΣΤΩΝ ΘΕΡΜΑΝΣΗΣ")
            print("-" * 40)
            
            current_heating_mills = sum(apt.heating_mills or 0 for apt in apartments)
            print(f"Τρέχοντα χιλιοστά θέρμανσης: {current_heating_mills}")
            
            if current_heating_mills != 1000:
                print(f"⚠️ Απαιτείται διόρθωση σε 1000")
                
                # Αναλογική διόρθωση
                correction_factor = Decimal('1000') / Decimal(str(current_heating_mills))
                print(f"Συντελεστής διόρθωσης: {correction_factor}")
                
                total_corrected = 0
                for apt in apartments:
                    old_mills = apt.heating_mills or 0
                    new_mills = int(old_mills * correction_factor)
                    
                    print(f"  Διαμέρισμα {apt.number}: {old_mills} → {new_mills}")
                    apt.heating_mills = new_mills
                    total_corrected += new_mills
                
                # Διόρθωση υπολοίπου (αν χρειάζεται) στο τελευταίο διαμέρισμα
                remainder = 1000 - total_corrected
                if remainder != 0:
                    last_apt = apartments.last()
                    last_apt.heating_mills += remainder
                    print(f"  Διόρθωση υπολοίπου στο διαμέρισμα {last_apt.number}: +{remainder}")
                
                # Αποθήκευση αλλαγών
                for apt in apartments:
                    apt.save()
                
                # Επαλήθευση
                new_total = sum(apt.heating_mills or 0 for apt in apartments)
                print(f"✅ Νέο σύνολο χιλιοστών θέρμανσης: {new_total}")
            else:
                print(f"✅ Τα χιλιοστά θέρμανσης είναι σωστά")
            
            # 3. Προσθήκη δείγματος δαπανών για δοκιμή
            print(f"\n💰 3. ΠΡΟΣΘΗΚΗ ΔΕΙΓΜΑΤΟΣ ΔΑΠΑΝΩΝ")
            print("-" * 40)
            
            # Έλεγχος αν υπάρχουν ήδη δαπάνες
            existing_expenses = Expense.objects.filter(building_id=building_id)
            print(f"Υπάρχουσες δαπάνες: {existing_expenses.count()}")
            
            if existing_expenses.count() == 0:
                print("🔧 Προσθήκη δείγματος δαπανών για δοκιμή...")
                
                from datetime import date
                
                sample_expenses = [
                    {
                        'title': 'ΔΕΗ Κοινοχρήστων - Νοέμβριος 2024',
                        'amount': Decimal('85.50'),
                        'category': 'electricity_common',
                        'distribution_type': 'by_participation_mills'
                    },
                    {
                        'title': 'Καθαρισμός Κοινοχρήστων Χώρων',
                        'amount': Decimal('120.00'),
                        'category': 'cleaning',
                        'distribution_type': 'equal_share'
                    },
                    {
                        'title': 'Συντήρηση Ανελκυστήρα',
                        'amount': Decimal('180.00'),
                        'category': 'elevator_maintenance',
                        'distribution_type': 'by_participation_mills'
                    },
                    {
                        'title': 'Νερό Κοινοχρήστων',
                        'amount': Decimal('45.30'),
                        'category': 'water_common',
                        'distribution_type': 'by_participation_mills'
                    }
                ]
                
                created_expenses = []
                for expense_data in sample_expenses:
                    expense = Expense.objects.create(
                        building_id=building_id,
                        title=expense_data['title'],
                        amount=expense_data['amount'],
                        category=expense_data['category'],
                        distribution_type=expense_data['distribution_type'],
                        date=date.today(),
                        is_issued=False
                    )
                    created_expenses.append(expense)
                    print(f"  ✅ {expense.title}: {expense.amount}€ ({expense.get_distribution_type_display()})")
                
                total_sample_expenses = sum(exp.amount for exp in created_expenses)
                print(f"💰 Συνολικές δαπάνες δείγματος: {total_sample_expenses}€")
            else:
                print("ℹ️ Υπάρχουν ήδη δαπάνες - δεν προστίθενται νέες")
            
            # 4. Επαλήθευση διορθώσεων
            print(f"\n✅ 4. ΕΠΑΛΗΘΕΥΣΗ ΔΙΟΡΘΩΣΕΩΝ")
            print("-" * 40)
            
            # Ανανέωση αντικειμένων από τη βάση
            building.refresh_from_db()
            
            print(f"🏦 Αποθεματικό ταμείο:")
            print(f"  Στόχος: {building.reserve_fund_goal}€")
            print(f"  Διάρκεια: {building.reserve_fund_duration_months} μήνες")
            print(f"  Μηνιαία εισφορά συνολικά: {building.reserve_contribution_per_apartment * apartments.count()}€")
            
            # Ανακαταμέτρηση χιλιοστών
            total_participation = sum(apt.participation_mills or 0 for apt in apartments)
            total_heating = sum(apt.heating_mills or 0 for apt in apartments)
            total_elevator = sum(apt.elevator_mills or 0 for apt in apartments)
            
            print(f"🏠 Χιλιοστά:")
            print(f"  Συμμετοχής: {total_participation} {'✅' if total_participation == 1000 else '❌'}")
            print(f"  Θέρμανσης: {total_heating} {'✅' if total_heating == 1000 else '❌'}")
            print(f"  Ανελκυστήρα: {total_elevator} {'✅' if total_elevator == 1000 else '❌'}")
            
            # Δαπάνες
            current_expenses = Expense.objects.filter(building_id=building_id, is_issued=False)
            total_expenses_amount = sum(exp.amount for exp in current_expenses)
            print(f"💰 Εκκρεμείς δαπάνες: {current_expenses.count()} δαπάνες, {total_expenses_amount}€")
            
            print(f"\n🎉 ΔΙΟΡΘΩΣΕΙΣ ΟΛΟΚΛΗΡΩΘΗΚΑΝ ΕΠΙΤΥΧΩΣ!")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη διόρθωση: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_alkmanos_issues()
