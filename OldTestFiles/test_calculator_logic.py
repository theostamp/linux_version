#!/usr/bin/env python3
"""
Test script για τη λογική του προηγμένου υπολογιστή κοινοχρήστων
"""

from decimal import Decimal

def test_calculator_logic():
    """Test της λογικής του υπολογιστή χωρίς database"""
    
    print("🧪 Test Λογικής Προηγμένου Υπολογιστή Κοινοχρήστων")
    print("=" * 60)
    
    # Test 1: Υπολογισμός πάγιου και μεταβλητού κόστους θέρμανσης
    print("\n1️⃣ Test Υπολογισμού Θέρμανσης:")
    print("-" * 40)
    
    total_heating_cost = Decimal('1000.00')
    heating_fixed_percentage = Decimal('0.30')  # 30%
    
    fixed_cost = total_heating_cost * heating_fixed_percentage
    variable_cost = total_heating_cost - fixed_cost
    
    print(f"Συνολικό κόστος θέρμανσης: {total_heating_cost}€")
    print(f"Πάγιο κόστος (30%): {fixed_cost}€")
    print(f"Μεταβλητό κόστος (70%): {variable_cost}€")
    
    # Test 2: Κατανομή γενικών δαπανών ανά χιλιοστά
    print("\n2️⃣ Test Κατανομής Γενικών Δαπανών:")
    print("-" * 40)
    
    total_general_expenses = Decimal('500.00')
    total_mills = Decimal('1000')  # Συνολικά χιλιοστά
    
    # Παράδειγμα διαμερισμάτων
    apartments = [
        {'id': 1, 'number': '1', 'mills': Decimal('85')},
        {'id': 2, 'number': '2', 'mills': Decimal('75')},
        {'id': 3, 'number': '3', 'mills': Decimal('90')},
    ]
    
    print(f"Συνολικές γενικές δαπάνες: {total_general_expenses}€")
    print(f"Συνολικά χιλιοστά: {total_mills}")
    print("\nΚατανομή ανά διαμέρισμα:")
    
    for apt in apartments:
        share = total_general_expenses * (apt['mills'] / total_mills)
        percentage = (apt['mills'] / total_mills) * 100
        print(f"  Διαμέρισμα {apt['number']}: {apt['mills']}χλ. ({percentage:.1f}%) = {share:.2f}€")
    
    # Test 3: Κατανομή δαπανών ανελκυστήρα
    print("\n3️⃣ Test Κατανομής Δαπανών Ανελκυστήρα:")
    print("-" * 40)
    
    total_elevator_expenses = Decimal('200.00')
    total_elevator_mills = Decimal('1000')
    
    elevator_apartments = [
        {'id': 1, 'number': '1', 'elevator_mills': Decimal('80')},
        {'id': 2, 'number': '2', 'elevator_mills': Decimal('70')},
        {'id': 3, 'number': '3', 'elevator_mills': Decimal('85')},
    ]
    
    print(f"Συνολικές δαπάνες ανελκυστήρα: {total_elevator_expenses}€")
    print(f"Συνολικά χιλιοστά ανελκυστήρα: {total_elevator_mills}")
    print("\nΚατανομή ανά διαμέρισμα:")
    
    for apt in elevator_apartments:
        share = total_elevator_expenses * (apt['elevator_mills'] / total_elevator_mills)
        percentage = (apt['elevator_mills'] / total_elevator_mills) * 100
        print(f"  Διαμέρισμα {apt['number']}: {apt['elevator_mills']}χλ. ({percentage:.1f}%) = {share:.2f}€")
    
    # Test 4: Κατανομή ισόποσων δαπανών
    print("\n4️⃣ Test Κατανομής Ισόποσων Δαπανών:")
    print("-" * 40)
    
    total_equal_share_expenses = Decimal('300.00')
    apartments_count = len(apartments)
    
    share_per_apartment = total_equal_share_expenses / apartments_count
    
    print(f"Συνολικές ισόποσες δαπάνες: {total_equal_share_expenses}€")
    print(f"Αριθμός διαμερισμάτων: {apartments_count}")
    print(f"Μερίδιο ανά διαμέρισμα: {share_per_apartment:.2f}€")
    
    # Test 5: Εισφορά αποθεματικού
    print("\n5️⃣ Test Εισφοράς Αποθεματικού:")
    print("-" * 40)
    
    reserve_fund_contribution = Decimal('5.00')
    
    print(f"Εισφορά αποθεματικού ανά διαμέρισμα: {reserve_fund_contribution}€")
    print(f"Συνολική εισφορά για {apartments_count} διαμερίσματα: {reserve_fund_contribution * apartments_count}€")
    
    # Test 6: Συνολικός υπολογισμός για ένα διαμέρισμα
    print("\n6️⃣ Test Συνολικού Υπολογισμού:")
    print("-" * 40)
    
    # Παράδειγμα για το διαμέρισμα 1
    apt1 = apartments[0]
    apt1_elevator = elevator_apartments[0]
    
    # Υπολογισμός μεριδίων
    general_share = total_general_expenses * (apt1['mills'] / total_mills)
    elevator_share = total_elevator_expenses * (apt1_elevator['elevator_mills'] / total_elevator_mills)
    equal_share = share_per_apartment
    reserve_contribution = reserve_fund_contribution
    
    # Υπολογισμός θέρμανσης (παράδειγμα)
    heating_fixed_share = fixed_cost * (apt1['mills'] / total_mills)
    heating_variable_share = Decimal('0.00')  # Θα υπολογιστεί με βάση μετρητές
    total_heating_share = heating_fixed_share + heating_variable_share
    
    total_amount = general_share + elevator_share + total_heating_share + equal_share + reserve_contribution
    
    print(f"Συνολικό μερίδιο για το διαμέρισμα {apt1['number']}:")
    print(f"  - Γενικές δαπάνες: {general_share:.2f}€")
    print(f"  - Δαπάνες ανελκυστήρα: {elevator_share:.2f}€")
    print(f"  - Δαπάνες θέρμανσης: {total_heating_share:.2f}€")
    print(f"    * Πάγιο: {heating_fixed_share:.2f}€")
    print(f"    * Μεταβλητό: {heating_variable_share:.2f}€")
    print(f"  - Ισόποσες δαπάνες: {equal_share:.2f}€")
    print(f"  - Εισφορά αποθεματικού: {reserve_contribution:.2f}€")
    print(f"  = ΣΥΝΟΛΟ: {total_amount:.2f}€")
    
    # Test 7: Αντιστοίχιση κατηγοριών δαπανών
    print("\n7️⃣ Test Αντιστοίχισης Κατηγοριών Δαπανών:")
    print("-" * 40)
    
    # Κατηγορίες δαπανών σύμφωνα με το TODO
    general_categories = [
        'cleaning', 'electricity_common', 'water_common', 'garbage_collection',
        'security', 'concierge', 'building_maintenance', 'building_insurance'
    ]
    
    elevator_categories = [
        'elevator_maintenance', 'elevator_repair', 'elevator_inspection'
    ]
    
    heating_categories = [
        'heating_fuel', 'heating_gas', 'heating_maintenance'
    ]
    
    equal_share_categories = [
        'special_contribution', 'reserve_fund', 'emergency_fund'
    ]
    
    print("Γενικές δαπάνες (κατανομή ανά χιλιοστά):")
    for cat in general_categories:
        print(f"  - {cat}")
    
    print("\nΔαπάνες ανελκυστήρα (κατανομή ανά χιλιοστά ανελκυστήρα):")
    for cat in elevator_categories:
        print(f"  - {cat}")
    
    print("\nΔαπάνες θέρμανσης (πάγιο + μεταβλητό):")
    for cat in heating_categories:
        print(f"  - {cat}")
    
    print("\nΙσόποσες δαπάνες (ίσο μερίδιο):")
    for cat in equal_share_categories:
        print(f"  - {cat}")
    
    print("\n🎉 Ολοκληρώθηκε το test της λογικής του υπολογιστή!")

if __name__ == "__main__":
    test_calculator_logic()
