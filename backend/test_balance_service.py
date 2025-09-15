#!/usr/bin/env python3
"""
Test script για τη νέα υπηρεσία ακεραιότητας υπολοίπων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building

def test_balance_service():
    """
    Δοκιμάζει τη νέα υπηρεσία ακεραιότητας υπολοίπων
    """
    
    print("🧪 ΔΟΚΙΜΗ ΥΠΗΡΕΣΙΑΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΥΠΟΛΟΙΠΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        try:
            # Βρες το κτίριο Αλκμάνος 22
            building = Building.objects.get(name__icontains="Αλκμάνος")
            print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            
            # Import τη υπηρεσία
            sys.path.append('/app/financial/services')
            from balance_integrity_service import BalanceIntegrityService
            
            # Δημιουργία υπηρεσίας
            service = BalanceIntegrityService(building.id)
            print("✅ Υπηρεσία δημιουργήθηκε επιτυχώς")
            
            # Επαλήθευση όλων των υπολοίπων
            print("\n🔍 ΕΠΑΛΗΘΕΥΣΗ ΥΠΟΛΟΙΠΩΝ...")
            results = service.validate_all_balances()
            
            print(f"\n📊 ΑΠΟΤΕΛΕΣΜΑΤΑ:")
            print(f"   Συνολικά διαμερίσματα: {results['total_apartments']}")
            print(f"   Σφάλματα βρέθηκαν: {results['errors_found']}")
            print(f"   Διπλές καταχωρήσεις: {len(results['duplicate_transactions'])}")
            
            # Λεπτομέρειες για διαμέρισμα 1 (Γεώργιος Παπαδόπουλος)
            apartment_1_result = next(
                (r for r in results['apartment_results'] if r['apartment_number'] == '1'), 
                None
            )
            
            if apartment_1_result:
                print(f"\n🏠 ΔΙΑΜΕΡΙΣΜΑ 1 - ΓΕΩΡΓΙΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ:")
                print(f"   Τρέχον υπόλοιπο: {apartment_1_result['current_balance']}€")
                print(f"   Υπολογισμένο υπόλοιπο: {apartment_1_result['calculated_balance']}€")
                print(f"   Διαφορά: {apartment_1_result['difference']}€")
                print(f"   Έχει σφάλματα: {'Ναι' if apartment_1_result['has_errors'] else 'Όχι'}")
                
                if apartment_1_result['has_errors']:
                    print("\n❌ Σφάλματα:")
                    for error in apartment_1_result['errors']:
                        print(f"   - {error['description']}")
            
            # Διπλές καταχωρήσεις για διαμέρισμα 1
            apartment_1_duplicates = [
                d for d in results['duplicate_transactions'] 
                if d['apartment_number'] == '1'
            ]
            
            if apartment_1_duplicates:
                print(f"\n⚠️ ΔΙΠΛΕΣ ΚΑΤΑΧΩΡΗΣΕΙΣ ΓΙΑ ΔΙΑΜΕΡΙΣΜΑ 1:")
                for duplicate in apartment_1_duplicates:
                    print(f"   - {duplicate['amount']}€ ({duplicate['type']}) στις {duplicate['date']}")
            
            # Προτάσεις διόρθωσης
            if results['errors_found'] > 0 or results['duplicate_transactions']:
                print(f"\n🔧 ΧΡΕΙΑΖΕΤΑΙ ΔΙΟΡΘΩΣΗ:")
                
                if results['errors_found'] > 0:
                    print("   - Διόρθωση υπολοίπων διαμερισμάτων")
                
                if results['duplicate_transactions']:
                    print("   - Αφαίρεση διπλών καταχωρήσεων")
                
                print(f"\n🚀 Εκτέλεση διόρθωσης...")
                
                # Διόρθωση υπολοίπων
                if results['errors_found'] > 0:
                    fix_results = service.fix_all_balances()
                    print(f"✅ Διορθώθηκαν {fix_results['corrections_made']} υπολοίπα")
                
                # Αφαίρεση διπλών καταχωρήσεων
                if results['duplicate_transactions']:
                    duplicate_results = service.remove_duplicate_transactions(results['duplicate_transactions'])
                    print(f"✅ Διαγράφηκαν {duplicate_results['duplicates_removed']} διπλές καταχωρήσεις")
                
                # Επαναυπολογισμός και επαλήθευση
                print(f"\n🔄 Επαναυπολογισμός και επαλήθευση...")
                final_results = service.validate_all_balances()
                
                print(f"\n📊 ΤΕΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:")
                print(f"   Σφάλματα μετά τη διόρθωση: {final_results['errors_found']}")
                print(f"   Διπλές καταχωρήσεις μετά τη διόρθωση: {len(final_results['duplicate_transactions'])}")
                
                if final_results['errors_found'] == 0 and len(final_results['duplicate_transactions']) == 0:
                    print("🎉 Όλα τα προβλήματα διορθώθηκαν επιτυχώς!")
                else:
                    print("⚠️ Υπάρχουν ακόμα προβλήματα που χρειάζονται προσοχή")
            
            else:
                print("\n✅ Δεν χρειάζεται διόρθωση - όλα τα υπολοίπα είναι σωστά!")
            
            return True
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = test_balance_service()
    if success:
        print("\n✅ Η δοκιμή ολοκληρώθηκε επιτυχώς!")
    else:
        print("\n❌ Η δοκιμή απέτυχε!")
