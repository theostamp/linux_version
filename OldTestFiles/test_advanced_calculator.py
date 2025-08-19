#!/usr/bin/env python3
"""
Test script για τον προηγμένο υπολογιστή κοινοχρήστων
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Tenant
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, MeterReading
from financial.services import AdvancedCommonExpenseCalculator
from decimal import Decimal
from datetime import date, timedelta

def test_advanced_calculator():
    """Test του προηγμένο υπολογιστή κοινοχρήστων"""
    
    print("🧪 Test Προηγμένου Υπολογιστή Κοινοχρήστων")
    print("=" * 60)
    
    # Εύρεση του tenant για το κτίριο 3
    try:
        tenant = Tenant.objects.get(schema_name='building_3')
        print(f"🏢 Tenant: {tenant.name}")
    except Tenant.DoesNotExist:
        print("❌ Δεν βρέθηκε tenant για το κτίριο 3")
        return
    
    # Χρήση tenant context
    with tenant_context(tenant):
        # Εύρεση του κτιρίου 3
        try:
            building = Building.objects.get(id=3)
            print(f"🏢 Κτίριο: {building.name}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 3")
            return
        
        # Εύρεση όλων των διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        
        if not apartments.exists():
            print("❌ Δεν βρέθηκαν διαμερίσματα")
            return
        
        print(f"📋 Βρέθηκαν {apartments.count()} διαμερίσματα")
        
        # Έλεγχος χιλιοστών
        print("\n📊 Έλεγχος Χιλιοστών:")
        print("-" * 50)
        print(f"{'Διαμέρισμα':<12} {'Συμμετοχής':<12} {'Θέρμανσης':<12} {'Ανελκυστήρα':<12}")
        print("-" * 50)
        
        total_participation = 0
        total_heating = 0
        total_elevator = 0
        
        for apartment in apartments:
            participation = apartment.participation_mills or 0
            heating = apartment.heating_mills or 0
            elevator = apartment.elevator_mills or 0
            
            total_participation += participation
            total_heating += heating
            total_elevator += elevator
            
            print(f"{apartment.number:<12} {participation:<12} {heating:<12} {elevator:<12}")
        
        print("-" * 50)
        print(f"{'ΣΥΝΟΛΟ':<12} {total_participation:<12} {total_heating:<12} {total_elevator:<12}")
        
        # Έλεγχος ανέκδοτων δαπανών
        pending_expenses = Expense.objects.filter(
            building=building,
            is_issued=False
        )
        
        print(f"\n💰 Ανέκδοτες Δαπάνες: {pending_expenses.count()}")
        
        if pending_expenses.exists():
            print("\n📋 Λίστα Ανέκδοτων Δαπανών:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<12} {'Κατηγορία':<25} {'Ποσό':<10} {'Κατανομή':<15}")
            print("-" * 80)
            
            for expense in pending_expenses:
                print(f"{expense.date.strftime('%d/%m/%Y'):<12} "
                      f"{expense.get_category_display()[:24]:<25} "
                      f"{expense.amount:<10.2f} "
                      f"{expense.get_distribution_type_display()[:14]:<15}")
        
        # Έλεγχος μετρήσεων θέρμανσης
        heating_readings = MeterReading.objects.filter(
            apartment__building=building,
            meter_type='heating'
        )
        
        print(f"\n🌡️ Μετρήσεις Θέρμανσης: {heating_readings.count()}")
        
        if heating_readings.exists():
            print("\n📊 Μετρήσεις Θέρμανσης:")
            print("-" * 60)
            print(f"{'Διαμέρισμα':<12} {'Ημερομηνία':<12} {'Τιμή':<10} {'Καταναλωση':<15}")
            print("-" * 60)
            
            for reading in heating_readings.order_by('apartment', 'reading_date')[:20]:  # Πρώτες 20
                print(f"{reading.apartment.number:<12} "
                      f"{reading.reading_date.strftime('%d/%m/%Y'):<12} "
                      f"{reading.value:<10.2f} "
                      f"{'N/A':<15}")
        
        # Test του προηγμένου υπολογιστή
        print(f"\n🧮 Test Προηγμένου Υπολογιστή:")
        print("-" * 60)
        
        try:
            # Δημιουργία ημερομηνιών για τον τρέχοντα μήνα
            today = date.today()
            start_date = today.replace(day=1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            calculator = AdvancedCommonExpenseCalculator(
                building_id=building.id,
                period_start_date=start_date.strftime('%Y-%m-%d'),
                period_end_date=end_date.strftime('%Y-%m-%d')
            )
            
            result = calculator.calculate_advanced_shares()
            
            print("✅ Υπολογισμός ολοκληρώθηκε επιτυχώς!")
            print(f"📊 Αποτελέσματα:")
            print(f"   - Συνολικά διαμερίσματα: {result['total_apartments']}")
            print(f"   - Ημερομηνία υπολογισμού: {result['calculation_date']}")
            
            # Εμφάνιση συνολικών δαπανών ανά κατηγορία
            expense_totals = result['expense_totals']
            print(f"\n💰 Συνολικά Ποσά ανά Κατηγορία:")
            print("-" * 40)
            print(f"Γενικές Δαπάνες: {expense_totals['general']:.2f}€")
            print(f"Δαπάνες Ανελκυστήρα: {expense_totals['elevator']:.2f}€")
            print(f"Δαπάνες Θέρμανσης: {expense_totals['heating']:.2f}€")
            print(f"Ισόποσες Δαπάνες: {expense_totals['equal_share']:.2f}€")
            print(f"Ατομικές Δαπάνες: {expense_totals['individual']:.2f}€")
            
            # Εμφάνιση μεριδίων για τα πρώτα 5 διαμερίσματα
            shares = result['shares']
            print(f"\n🏠 Μερίδια Διαμερισμάτων (πρώτα 5):")
            print("-" * 100)
            print(f"{'Διαμέρισμα':<12} {'Ιδιοκτήτης':<20} {'Συνολικό':<10} {'Γενικές':<10} {'Ανελκυστήρα':<12} {'Θέρμανσης':<12} {'Ισόποσες':<12}")
            print("-" * 100)
            
            count = 0
            for apartment_id, share_data in shares.items():
                if count >= 5:
                    break
                
                breakdown = share_data['breakdown']
                print(f"{share_data['apartment_number']:<12} "
                      f"{share_data['owner_name'][:19]:<20} "
                      f"{share_data['total_amount']:<10.2f} "
                      f"{breakdown['general_expenses']:<10.2f} "
                      f"{breakdown['elevator_expenses']:<12.2f} "
                      f"{breakdown['heating_expenses']:<12.2f} "
                      f"{breakdown['equal_share_expenses']:<12.2f}")
                count += 1
            
            # Εμφάνιση λεπτομερειών θέρμανσης
            heating_costs = result['heating_costs']
            print(f"\n🌡️ Λεπτομέρειες Θέρμανσης:")
            print("-" * 50)
            print(f"Συνολικό κόστος: {heating_costs['total_cost']:.2f}€")
            print(f"Πάγιο κόστος (30%): {heating_costs['fixed_cost']:.2f}€")
            print(f"Μεταβλητό κόστος (70%): {heating_costs['variable_cost']:.2f}€")
            print(f"Συνολική κατανάλωση: {heating_costs['total_consumption_hours']:.2f} ώρες")
            print(f"Κόστος ανά ώρα: {heating_costs['cost_per_hour']:.4f}€")
            
        except Exception as e:
            print(f"❌ Σφάλμα κατά τον υπολογισμό: {str(e)}")
            import traceback
            traceback.print_exc()
        
        print(f"\n🎉 Ολοκληρώθηκε το test του προηγμένου υπολογιστή!")

if __name__ == "__main__":
    test_advanced_calculator()
