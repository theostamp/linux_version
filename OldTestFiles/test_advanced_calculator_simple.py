#!/usr/bin/env python3
"""
Απλό test script για τον προηγμένο υπολογιστή κοινοχρήστων
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from financial.services import AdvancedCommonExpenseCalculator
from datetime import date, timedelta

def test_advanced_calculator_simple():
    """Απλό test του προηγμένου υπολογιστή"""
    
    print("🧪 Απλό Test Προηγμένου Υπολογιστή Κοινοχρήστων")
    print("=" * 60)
    
    try:
        # Δημιουργία ημερομηνιών για τον τρέχοντα μήνα
        today = date.today()
        start_date = today.replace(day=1)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        print(f"📅 Περίοδος: {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}")
        
        # Δημιουργία του υπολογιστή
        calculator = AdvancedCommonExpenseCalculator(
            building_id=3,  # Κτίριο 3
            period_start_date=start_date.strftime('%Y-%m-%d'),
            period_end_date=end_date.strftime('%Y-%m-%d')
        )
        
        print("✅ Υπολογιστής δημιουργήθηκε επιτυχώς!")
        print(f"🏢 Κτίριο ID: {calculator.building_id}")
        print(f"🏢 Όνομα Κτιρίου: {calculator.building.name}")
        print(f"🏠 Συνολικά διαμερίσματα: {calculator.apartments.count()}")
        print(f"💰 Ανέκδοτες δαπάνες: {calculator.expenses.count()}")
        
        # Εμφάνιση παραμέτρων
        print("\n⚙️ Παράμετροι Υπολογισμού:")
        print(f"   - Ποσοστό πάγιου θέρμανσης: {calculator.heating_fixed_percentage * 100}%")
        print(f"   - Εισφορά αποθεματικού: {calculator.reserve_fund_contribution}€ ανά διαμέρισμα")
        
        # Εμφάνιση διαμερισμάτων
        print("\n🏠 Διαμερίσματα:")
        print("-" * 80)
        print(f"{'Αριθμός':<10} {'Ιδιοκτήτης':<20} {'Χιλιοστά':<10} {'Θέρμανσης':<12} {'Ανελκυστήρα':<12}")
        print("-" * 80)
        
        for apartment in calculator.apartments[:5]:  # Πρώτα 5
            print(f"{apartment.number:<10} "
                  f"{apartment.owner_name[:19]:<20} "
                  f"{apartment.participation_mills or 0:<10} "
                  f"{apartment.heating_mills or 0:<12} "
                  f"{apartment.elevator_mills or 0:<12}")
        
        if calculator.apartments.count() > 5:
            print(f"... και {calculator.apartments.count() - 5} ακόμα")
        
        # Εμφάνιση δαπανών
        if calculator.expenses.exists():
            print("\n💰 Ανέκδοτες Δαπάνες:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<12} {'Κατηγορία':<25} {'Ποσό':<10} {'Κατανομή':<15}")
            print("-" * 80)
            
            for expense in calculator.expenses[:10]:  # Πρώτες 10
                print(f"{expense.date.strftime('%d/%m/%Y'):<12} "
                      f"{expense.get_category_display()[:24]:<25} "
                      f"{expense.amount:<10.2f} "
                      f"{expense.get_distribution_type_display()[:14]:<15}")
            
            if calculator.expenses.count() > 10:
                print(f"... και {calculator.expenses.count() - 10} ακόμα")
        
        # Test υπολογισμού
        print("\n🧮 Εκτέλεση Υπολογισμού:")
        print("-" * 60)
        
        result = calculator.calculate_advanced_shares()
        
        print("✅ Υπολογισμός ολοκληρώθηκε επιτυχώς!")
        print("📊 Αποτελέσματα:")
        print(f"   - Συνολικά διαμερίσματα: {result['total_apartments']}")
        print(f"   - Ημερομηνία υπολογισμού: {result['calculation_date']}")
        
        # Εμφάνιση συνολικών δαπανών ανά κατηγορία
        expense_totals = result['expense_totals']
        print("\n💰 Συνολικά Ποσά ανά Κατηγορία:")
        print("-" * 40)
        print(f"Γενικές Δαπάνες: {expense_totals['general']:.2f}€")
        print(f"Δαπάνες Ανελκυστήρα: {expense_totals['elevator']:.2f}€")
        print(f"Δαπάνες Θέρμανσης: {expense_totals['heating']:.2f}€")
        print(f"Ισόποσες Δαπάνες: {expense_totals['equal_share']:.2f}€")
        print(f"Ατομικές Δαπάνες: {expense_totals['individual']:.2f}€")
        
        # Εμφάνιση μεριδίων για τα πρώτα 3 διαμερίσματα
        shares = result['shares']
        print("\n🏠 Μερίδια Διαμερισμάτων (πρώτα 3):")
        print("-" * 120)
        print(f"{'Διαμέρισμα':<12} {'Ιδιοκτήτης':<20} {'Συνολικό':<10} {'Γενικές':<10} {'Ανελκυστήρα':<12} {'Θέρμανσης':<12} {'Ισόποσες':<12} {'Αποθεματικό':<12}")
        print("-" * 120)
        
        count = 0
        for apartment_id, share_data in shares.items():
            if count >= 3:
                break
            
            breakdown = share_data['breakdown']
            print(f"{share_data['apartment_number']:<12} "
                  f"{share_data['owner_name'][:19]:<20} "
                  f"{share_data['total_amount']:<10.2f} "
                  f"{breakdown['general_expenses']:<10.2f} "
                  f"{breakdown['elevator_expenses']:<12.2f} "
                  f"{breakdown['heating_expenses']:<12.2f} "
                  f"{breakdown['equal_share_expenses']:<12.2f} "
                  f"{breakdown['reserve_fund_contribution']:<12.2f}")
            count += 1
        
        # Εμφάνιση λεπτομερειών θέρμανσης
        heating_costs = result['heating_costs']
        print("\n🌡️ Λεπτομέρειες Θέρμανσης:")
        print("-" * 50)
        print(f"Συνολικό κόστος: {heating_costs['total_cost']:.2f}€")
        print(f"Πάγιο κόστος (30%): {heating_costs['fixed_cost']:.2f}€")
        print(f"Μεταβλητό κόστος (70%): {heating_costs['variable_cost']:.2f}€")
        print(f"Συνολική κατανάλωση: {heating_costs['total_consumption_hours']:.2f} ώρες")
        print(f"Κόστος ανά ώρα: {heating_costs['cost_per_hour']:.4f}€")
        
        # Εμφάνιση λεπτομερειών θέρμανσης ανά διαμέρισμα
        print("\n🌡️ Λεπτομέρειες Θέρμανσης ανά Διαμέρισμα:")
        print("-" * 80)
        print(f"{'Διαμέρισμα':<12} {'Πάγιο':<10} {'Μεταβλητό':<12} {'Κατανάλωση':<15} {'Συνολικό':<10}")
        print("-" * 80)
        
        count = 0
        for apartment_id, share_data in shares.items():
            if count >= 3:
                break
            
            heating_breakdown = share_data['heating_breakdown']
            total_heating = heating_breakdown['fixed_cost'] + heating_breakdown['variable_cost']
            
            print(f"{share_data['apartment_number']:<12} "
                  f"{heating_breakdown['fixed_cost']:<10.2f} "
                  f"{heating_breakdown['variable_cost']:<12.2f} "
                  f"{heating_breakdown['consumption_hours']:<15.2f} "
                  f"{total_heating:<10.2f}")
            count += 1
        
        print("\n🎉 Ολοκληρώθηκε το test του προηγμένου υπολογιστή!")
        
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_advanced_calculator_simple()
