#!/usr/bin/env python3
"""
Script για τη μηδενισμό μόνο των υπόλοιπων διαμερισμάτων

Αυτό το script:
- Μηδενίζει τα current_balance όλων των διαμερισμάτων σε €0.00
- ΔΕΝ διαγράφει άλλα οικονομικά δεδομένα
- Είναι ασφαλές για χρήση όταν θέλετε μόνο να καθαρίσετε τα υπόλοιπα

Χρήση:
1. Αντιγράψτε το script στο Docker container
2. Εκτελέστε το μέσα στο container
3. Επιβεβαιώστε τα αποτελέσματα
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
from django.db import transaction

def reset_apartment_balances():
    """Μηδενίζει τα υπόλοιπα όλων των διαμερισμάτων"""
    
    print("🔄 ΜΗΔΕΝΙΣΜΟΣ ΥΠΟΛΟΙΠΩΝ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
    print("=" * 50)
    
    # Επιβεβαίωση
    confirmation = input("Μηδενίζω τα υπόλοιπα όλων των διαμερισμάτων σε €0.00; (yes/no): ")
    if confirmation.lower() != 'yes':
        print("❌ Ακύρωση.")
        return
    
    try:
        with schema_context('demo'):
            with transaction.atomic():
                
                # Ανάκτηση διαμερισμάτων
                from apartments.models import Apartment
                apartments = Apartment.objects.all()
                apartment_count = apartments.count()
                
                print(f"\n📊 Βρέθηκαν {apartment_count} διαμερίσματα")
                
                # Έλεγχος τρεχόντων υπόλοιπων
                total_balance_before = Decimal('0.00')
                apartments_with_balance = 0
                
                for apt in apartments:
                    if apt.current_balance and apt.current_balance != Decimal('0.00'):
                        total_balance_before += apt.current_balance
                        apartments_with_balance += 1
                
                print(f"💰 Συνολικό υπόλοιπο πριν: {total_balance_before:,.2f}€")
                print(f"🏠 Διαμερίσματα με μη μηδενικό υπόλοιπο: {apartments_with_balance}")
                
                if apartments_with_balance == 0:
                    print("\n✅ Όλα τα διαμερίσματα έχουν ήδη μηδενικό υπόλοιπο!")
                    return
                
                # Μηδενισμός υπόλοιπων
                print(f"\n🔄 Ξεκινάει ο μηδενισμός...")
                
                reset_count = 0
                for apartment in apartments:
                    if apartment.current_balance and apartment.current_balance != Decimal('0.00'):
                        old_balance = apartment.current_balance
                        apartment.current_balance = Decimal('0.00')
                        apartment.save()
                        reset_count += 1
                        
                        if reset_count <= 10:  # Εμφάνιση πρώτων 10
                            print(f"   🏠 {apartment.number}: {old_balance:,.2f}€ → €0.00")
                        elif reset_count == 11:
                            print(f"   ... και άλλα {apartments_with_balance - 10} διαμερίσματα")
                
                print(f"\n✅ Μηδενίστηκαν τα υπόλοιπα για {reset_count} διαμερίσματα")
                
                # Επιβεβαίωση
                print(f"\n🔍 Επιβεβαίωση αποτελεσμάτων...")
                
                # Έλεγχος τελικών υπόλοιπων
                total_balance_after = Decimal('0.00')
                apartments_with_balance_after = 0
                
                for apt in Apartment.objects.all():
                    if apt.current_balance and apt.current_balance != Decimal('0.00'):
                        total_balance_after += apt.current_balance
                        apartments_with_balance_after += 1
                
                print(f"💰 Συνολικό υπόλοιπο μετά: {total_balance_after:,.2f}€")
                print(f"🏠 Διαμερίσματα με μη μηδενικό υπόλοιπο: {apartments_with_balance_after}")
                
                if apartments_with_balance_after == 0:
                    print("\n🎉 ΕΠΙΤΥΧΗΣ ΜΗΔΕΝΙΣΜΟΣ!")
                    print(f"📊 Σύνοψη:")
                    print(f"   • Αρχικό υπόλοιπο: {total_balance_before:,.2f}€")
                    print(f"   • Τελικό υπόλοιπο: €0.00")
                    print(f"   • Διαμερίσματα επηρεασμένα: {reset_count}")
                    print(f"   • Εξοικονόμηση: {total_balance_before:,.2f}€")
                else:
                    print(f"\n⚠️  Προσοχή: {apartments_with_balance_after} διαμερίσματα εξακολουθούν να έχουν μη μηδενικό υπόλοιπο!")
                
    except Exception as e:
        print(f"\n❌ Σφάλμα: {str(e)}")
        raise

def verify_balances():
    """Επιβεβαιώνει ότι τα υπόλοιπα είναι μηδενικά"""
    
    print("\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΥΠΟΛΟΙΠΩΝ...")
    print("=" * 40)
    
    try:
        with schema_context('demo'):
            from apartments.models import Apartment
            
            apartments = Apartment.objects.all()
            apartment_count = apartments.count()
            
            # Έλεγχος για μηδενικά υπόλοιπα
            apartments_with_balance = 0
            total_balance = Decimal('0.00')
            
            for apt in apartments:
                if apt.current_balance and apt.current_balance != Decimal('0.00'):
                    apartments_with_balance += 1
                    total_balance += apt.current_balance
            
            if apartments_with_balance == 0:
                print(f"✅ Όλα τα {apartment_count} διαμερίσματα έχουν μηδενικό υπόλοιπο!")
                return True
            else:
                print(f"❌ {apartments_with_balance} διαμερίσματα έχουν μη μηδενικό υπόλοιπο")
                print(f"💰 Συνολικό υπόλοιπο: {total_balance:,.2f}€")
                
                # Εμφάνιση λεπτομερειών
                print(f"\n📋 Λεπτομέρειες:")
                for apt in apartments:
                    if apt.current_balance and apt.current_balance != Decimal('0.00'):
                        print(f"   🏠 {apt.number}: {apt.current_balance:,.2f}€")
                
                return False
                
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο: {str(e)}")
        return False

if __name__ == "__main__":
    try:
        # Εκτέλεση μηδενισμού
        reset_apartment_balances()
        
        # Επιβεβαίωση
        verify_balances()
        
        print("\n✅ Το script ολοκληρώθηκε!")
        
    except KeyboardInterrupt:
        print("\n\n❌ Το script διακόπηκε από τον χρήστη.")
    except Exception as e:
        print(f"\n❌ Κρίσιμο σφάλμα: {str(e)}")
        sys.exit(1)
