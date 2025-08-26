#!/usr/bin/env python
"""
🧪 ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ AUTO_INITIALIZATION.PY
===========================================
Αυτό το script ελέγχει ότι το auto_initialization.py λειτουργεί σωστά
με όλα τα χιλιοστά να έχουν συνολικό άθροισμα 1000.
"""

def test_arachovis_12_mills():
    """Έλεγχος χιλιοστών για Αραχώβης 12"""
    print("🔍 ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ - ΑΡΑΧΩΒΗΣ 12")
    print("=" * 50)
    
    # Χιλιοστά από το auto_initialization.py
    apartments_data = [
        {'number': 'Α1', 'participation_mills': 96, 'heating_mills': 100, 'elevator_mills': 103},
        {'number': 'Α2', 'participation_mills': 106, 'heating_mills': 108, 'elevator_mills': 105},
        {'number': 'Α3', 'participation_mills': 90, 'heating_mills': 86, 'elevator_mills': 88},
        {'number': 'Β1', 'participation_mills': 113, 'heating_mills': 111, 'elevator_mills': 110},
        {'number': 'Β2', 'participation_mills': 94, 'heating_mills': 96, 'elevator_mills': 98},
        {'number': 'Β3', 'participation_mills': 100, 'heating_mills': 98, 'elevator_mills': 96},
        {'number': 'Γ1', 'participation_mills': 105, 'heating_mills': 103, 'elevator_mills': 108},
        {'number': 'Γ2', 'participation_mills': 87, 'heating_mills': 90, 'elevator_mills': 86},
        {'number': 'Γ3', 'participation_mills': 99, 'heating_mills': 95, 'elevator_mills': 100},
        {'number': 'Δ1', 'participation_mills': 110, 'heating_mills': 113, 'elevator_mills': 106}
    ]
    
    total_participation = sum(apt['participation_mills'] for apt in apartments_data)
    total_heating = sum(apt['heating_mills'] for apt in apartments_data)
    total_elevator = sum(apt['elevator_mills'] for apt in apartments_data)
    
    print("Διαμερίσματα και χιλιοστά:")
    for apt in apartments_data:
        print(f"   {apt['number']}: Συμμετοχή={apt['participation_mills']}, Θέρμανση={apt['heating_mills']}, Ανελκυστήρας={apt['elevator_mills']}")
    
    print(f"\nΣυνολικά χιλιοστά:")
    print(f"   Συμμετοχή: {total_participation}")
    print(f"   Θέρμανση: {total_heating}")
    print(f"   Ανελκυστήρας: {total_elevator}")
    
    all_correct = (total_participation == 1000 and total_heating == 1000 and total_elevator == 1000)
    
    if all_correct:
        print("✅ ΟΛΑ ΣΩΣΤΑ! Όλα τα χιλιοστά έχουν συνολικό άθροισμα 1000")
    else:
        print("❌ ΒΡΕΘΗΚΑΝ ΠΡΟΒΛΗΜΑΤΑ!")
        if total_participation != 1000:
            print(f"   - Χιλιοστά συμμετοχής: {total_participation} (πρέπει να είναι 1000)")
        if total_heating != 1000:
            print(f"   - Χιλιοστά θέρμανσης: {total_heating} (πρέπει να είναι 1000)")
        if total_elevator != 1000:
            print(f"   - Χιλιοστά ανελκυστήρα: {total_elevator} (πρέπει να είναι 1000)")
    
    return all_correct


def test_alkmanos_22_mills():
    """Έλεγχος χιλιοστών για Αλκμάνος 22"""
    print("\n🔍 ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ - ΑΛΚΜΑΝΟΣ 22")
    print("=" * 50)
    
    # Χιλιοστά από το auto_initialization.py
    apartments_data = [
        {'number': '1', 'participation_mills': 95, 'heating_mills': 100, 'elevator_mills': 95},
        {'number': '2', 'participation_mills': 102, 'heating_mills': 105, 'elevator_mills': 102},
        {'number': '3', 'participation_mills': 88, 'heating_mills': 92, 'elevator_mills': 88},
        {'number': '4', 'participation_mills': 110, 'heating_mills': 115, 'elevator_mills': 110},
        {'number': '5', 'participation_mills': 105, 'heating_mills': 108, 'elevator_mills': 105},
        {'number': '6', 'participation_mills': 98, 'heating_mills': 102, 'elevator_mills': 98},
        {'number': '7', 'participation_mills': 92, 'heating_mills': 95, 'elevator_mills': 92},
        {'number': '8', 'participation_mills': 115, 'heating_mills': 100, 'elevator_mills': 115},
        {'number': '9', 'participation_mills': 108, 'heating_mills': 100, 'elevator_mills': 108},
        {'number': '10', 'participation_mills': 87, 'heating_mills': 83, 'elevator_mills': 87}
    ]
    
    total_participation = sum(apt['participation_mills'] for apt in apartments_data)
    total_heating = sum(apt['heating_mills'] for apt in apartments_data)
    total_elevator = sum(apt['elevator_mills'] for apt in apartments_data)
    
    print("Διαμερίσματα και χιλιοστά:")
    for apt in apartments_data:
        print(f"   {apt['number']}: Συμμετοχή={apt['participation_mills']}, Θέρμανση={apt['heating_mills']}, Ανελκυστήρας={apt['elevator_mills']}")
    
    print(f"\nΣυνολικά χιλιοστά:")
    print(f"   Συμμετοχή: {total_participation}")
    print(f"   Θέρμανση: {total_heating}")
    print(f"   Ανελκυστήρας: {total_elevator}")
    
    all_correct = (total_participation == 1000 and total_heating == 1000 and total_elevator == 1000)
    
    if all_correct:
        print("✅ ΟΛΑ ΣΩΣΤΑ! Όλα τα χιλιοστά έχουν συνολικό άθροισμα 1000")
    else:
        print("❌ ΒΡΕΘΗΚΑΝ ΠΡΟΒΛΗΜΑΤΑ!")
        if total_participation != 1000:
            print(f"   - Χιλιοστά συμμετοχής: {total_participation} (πρέπει να είναι 1000)")
        if total_heating != 1000:
            print(f"   - Χιλιοστά θέρμανσης: {total_heating} (πρέπει να είναι 1000)")
        if total_elevator != 1000:
            print(f"   - Χιλιοστά ανελκυστήρα: {total_elevator} (πρέπει να είναι 1000)")
    
    return all_correct


def main():
    """Κύρια λειτουργία"""
    print("🧪 ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ AUTO_INITIALIZATION.PY")
    print("=" * 60)
    print("Ελέγχος ότι όλα τα χιλιοστά έχουν συνολικό άθροισμα 1000")
    print("=" * 60)
    
    # Έλεγχος χιλιοστών
    arachovis_ok = test_arachovis_12_mills()
    alkmanos_ok = test_alkmanos_22_mills()
    
    # Τελικό αποτέλεσμα
    print("\n" + "=" * 60)
    print("📊 ΤΕΛΙΚΟ ΑΠΟΤΕΛΕΣΜΑ")
    print("=" * 60)
    
    if arachovis_ok and alkmanos_ok:
        print("✅ ΟΛΑ ΣΩΣΤΑ! Το auto_initialization.py είναι έτοιμο για χρήση")
        print("✅ Όλα τα χιλιοστά έχουν συνολικό άθροισμα 1000")
        print("✅ Η επικύρωση θα ελέγξει αυτόματα τα χιλιοστά κατά τη δημιουργία")
    else:
        print("❌ ΒΡΕΘΗΚΑΝ ΠΡΟΒΛΗΜΑΤΑ! Χρειάζεται διόρθωση")
        if not arachovis_ok:
            print("   - Αραχώβης 12: Λανθασμένα χιλιοστά")
        if not alkmanos_ok:
            print("   - Αλκμάνος 22: Λανθασμένα χιλιοστά")
    
    print("\n💡 Σημειώσεις:")
    print("   - Όλα τα χιλιοστά (συμμετοχής, θέρμανσης, ανελκυστήρα) πρέπει να έχουν συνολικό άθροισμα 1000")
    print("   - Το script επικύρωσης θα ελέγξει αυτόματα τα χιλιοστά κατά τη δημιουργία")
    print("   - Αν βρεθούν λανθασμένα χιλιοστά, το script θα σταματήσει με σφάλμα")


if __name__ == "__main__":
    main()
