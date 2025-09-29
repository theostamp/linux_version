#!/usr/bin/env python3
"""
Διόρθωση του προβλήματος του Γεώργιου Παπαδόπουλου
Διαμέρισμα 1, Αλκμάνος 22
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from apartments.models import Apartment
from buildings.models import Building
from financial.models import Payment, Transaction
from financial.services.balance_integrity_service import BalanceIntegrityService
from decimal import Decimal

def fix_papadopoulos_issue():
    """
    Διορθώνει το πρόβλημα του Γεώργιου Παπαδόπουλου
    """
    
    print("🔧 ΔΙΟΡΘΩΣΗ ΠΡΟΒΛΗΜΑΤΟΣ ΓΕΩΡΓΙΟΥ ΠΑΠΑΔΟΠΟΥΛΟΥ")
    print("=" * 60)
    print("👤 Ιδιοκτήτης: Γεώργιος Παπαδόπουλος")
    print("🏠 Διαμέρισμα: 1")
    print("🏢 Κτίριο: Αλκμάνος 22")
    print()
    
    with schema_context('demo'):
        try:
            # Βρες το κτίριο και το διαμέρισμα
            building = Building.objects.get(name__icontains="Αλκμάνος")
            apartment = Apartment.objects.get(building=building, number='1')
            
            print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            print(f"🏠 Διαμέρισμα: {apartment.number}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"💰 Τρέχον υπόλοιπο: {apartment.current_balance}€")
            print()
            
            # 1. ΕΠΑΛΗΘΕΥΣΗ ΜΕ ΤΗ ΝΕΑ ΥΠΗΡΕΣΙΑ
            print("1️⃣ ΕΠΑΛΗΘΕΥΣΗ ΜΕ ΤΗ ΝΕΑ ΥΠΗΡΕΣΙΑ")
            print("-" * 40)
            
            service = BalanceIntegrityService(building.id)
            apartment_result = service.validate_apartment_balance(apartment)
            
            print(f"📊 Αποτελέσματα επαλήθευσης:")
            print(f"   Τρέχον υπόλοιπο (DB): {apartment_result['current_balance']}€")
            print(f"   Υπολογισμένο υπόλοιπο: {apartment_result['calculated_balance']}€")
            print(f"   Διαφορά: {apartment_result['difference']}€")
            print(f"   Έχει σφάλματα: {'Ναι' if apartment_result['has_errors'] else 'Όχι'}")
            
            if apartment_result['has_errors']:
                print("\n❌ Σφάλματα που βρέθηκαν:")
                for error in apartment_result['errors']:
                    print(f"   - {error['description']}")
            
            # 2. ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ
            print("\n2️⃣ ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ")
            print("-" * 35)
            
            duplicates = service.detect_duplicate_transactions()
            apartment_duplicates = [d for d in duplicates if d['apartment_number'] == '1']
            
            if apartment_duplicates:
                print(f"⚠️ Βρέθηκαν {len(apartment_duplicates)} διπλές καταχωρήσεις:")
                for duplicate in apartment_duplicates:
                    print(f"   - {duplicate['amount']}€ ({duplicate['type']}) στις {duplicate['date']}")
            else:
                print("✅ Δεν βρέθηκαν διπλές καταχωρήσεις")
            
            # 3. ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ
            print("\n3️⃣ ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ")
            print("-" * 35)
            
            transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'created_at')
            
            print("📝 Ιστορικό συναλλαγών:")
            running_balance = Decimal('0.00')
            
            for i, transaction in enumerate(transactions, 1):
                # Υπολογισμός running balance
                if transaction.type in ['payment', 'common_expense_payment', 'payment_received', 'refund']:
                    running_balance += transaction.amount
                elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                        'interest_charge', 'penalty_charge']:
                    running_balance -= transaction.amount
                
                print(f"   {i}. {transaction.date.strftime('%Y-%m-%d %H:%M')}: {transaction.description}")
                print(f"      Ποσό: {transaction.amount}€ ({transaction.get_type_display()})")
                print(f"      Υπόλοιπο πριν: {transaction.balance_before}€")
                print(f"      Υπόλοιπο μετά: {transaction.balance_after}€")
                print(f"      Υπολογισμένο: {running_balance}€")
                
                # Έλεγχος για παράξενες καταστάσεις
                if transaction.balance_after != running_balance:
                    print(f"      ⚠️ ΔΙΑΦΟΡΑ: DB υπόλοιπο ({transaction.balance_after}€) ≠ Υπολογισμένο ({running_balance}€)")
                
                print()
            
            # 4. ΠΡΟΤΑΣΗ ΔΙΟΡΘΩΣΗΣ
            print("4️⃣ ΠΡΟΤΑΣΗ ΔΙΟΡΘΩΣΗΣ")
            print("-" * 20)
            
            if apartment_result['has_errors'] or apartment_duplicates:
                print("🔧 Χρειάζεται διόρθωση:")
                
                if apartment_result['has_errors']:
                    print("   - Διόρθωση υπολοίπου διαμερίσματος")
                
                if apartment_duplicates:
                    print("   - Αφαίρεση διπλών καταχωρήσεων")
                
                print("\n🚀 Εκτέλεση διόρθωσης...")
                
                # Διόρθωση υπολοίπου
                if apartment_result['has_errors']:
                    fix_result = service.fix_apartment_balance(apartment)
                    print(f"✅ Διόρθωση υπολοίπου: {fix_result['old_balance']}€ → {fix_result['new_balance']}€")
                
                # Αφαίρεση διπλών καταχωρήσεων
                if apartment_duplicates:
                    duplicate_result = service.remove_duplicate_transactions(apartment_duplicates)
                    print(f"✅ Διαγράφηκαν {duplicate_result['duplicates_removed']} διπλές καταχωρήσεις")
                
                # Επαναυπολογισμός τελικού υπολοίπου
                apartment.refresh_from_db()
                final_balance = service._calculate_balance_from_transactions(apartment)
                
                print(f"\n🎯 ΤΕΛΙΚΟ ΑΠΟΤΕΛΕΣΜΑ:")
                print(f"   Νέο υπόλοιπο διαμερίσματος: {apartment.current_balance}€")
                print(f"   Υπολογισμένο υπόλοιπο: {final_balance}€")
                
                if abs(apartment.current_balance - final_balance) <= Decimal('0.01'):
                    print("✅ Το υπόλοιπο είναι τώρα σωστό!")
                else:
                    print("⚠️ Υπάρχει ακόμα διαφορά στο υπόλοιπο")
                
            else:
                print("✅ Δεν χρειάζεται διόρθωση - το υπόλοιπο είναι σωστό!")
            
            # 5. ΕΠΑΛΗΘΕΥΣΗ ΜΕΤΑ ΤΗ ΔΙΟΡΘΩΣΗ
            print("\n5️⃣ ΕΠΑΛΗΘΕΥΣΗ ΜΕΤΑ ΤΗ ΔΙΟΡΘΩΣΗ")
            print("-" * 35)
            
            final_validation = service.validate_apartment_balance(apartment)
            
            print(f"📊 Τελική επαλήθευση:")
            print(f"   Υπόλοιπο DB: {final_validation['current_balance']}€")
            print(f"   Υπολογισμένο: {final_validation['calculated_balance']}€")
            print(f"   Διαφορά: {final_validation['difference']}€")
            print(f"   Έχει σφάλματα: {'Ναι' if final_validation['has_errors'] else 'Όχι'}")
            
            if not final_validation['has_errors']:
                print("🎉 Η διόρθωση ολοκληρώθηκε επιτυχώς!")
            else:
                print("⚠️ Υπάρχουν ακόμα προβλήματα που χρειάζονται προσοχή")
            
            return True
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = fix_papadopoulos_issue()
    if success:
        print("\n✅ Η διόρθωση ολοκληρώθηκε επιτυχώς!")
    else:
        print("\n❌ Η διόρθωση απέτυχε!")
