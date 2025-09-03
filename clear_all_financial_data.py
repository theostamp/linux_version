#!/usr/bin/env python3
"""
Script για τη διαγραφή όλων των οικονομικών ποσών από τη βάση δεδομένων

Αυτό το script διαγράφει:
- Όλες τις δαπάνες (Expense)
- Όλες τις εισπράξεις (Payment)
- Όλες τις συναλλαγές (Transaction)
- Όλα τα μερίδια διαμερισμάτων (ApartmentShare)
- Όλες τις περιόδους κοινοχρήστων (CommonExpensePeriod)
- Όλες τις αποδείξεις (FinancialReceipt)
- Όλες τις μετρήσεις (MeterReading)
- Όλες τις σχέσεις δαπανών-διαμερισμάτων (ExpenseApartment)
- Μηδενίζει τα υπόλοιπα διαμερισμάτων

⚠️  ΠΡΟΣΟΧΗ: Αυτό το script διαγράφει ΜΟΝΙΜΑ όλα τα οικονομικά δεδομένα!
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

def clear_all_financial_data():
    """Διαγράφει όλα τα οικονομικά δεδομένα από τη βάση"""
    
    print("🚨 ΕΚΚΙΝΗΣΗ ΔΙΑΓΡΑΦΗΣ ΟΛΩΝ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ 🚨")
    print("=" * 70)
    
    # Επιβεβαίωση από τον χρήστη
    confirmation = input("Είστε σίγουροι ότι θέλετε να διαγράψετε ΟΛΑ τα οικονομικά δεδομένα; (yes/no): ")
    if confirmation.lower() != 'yes':
        print("❌ Ακύρωση διαγραφής.")
        return
    
    # Επιπλέον επιβεβαίωση
    final_confirmation = input("ΠΡΟΣΟΧΗ: Αυτή η ενέργεια ΔΕΝ μπορεί να αναιρεθεί! Γράψτε 'DELETE ALL' για να συνεχίσετε: ")
    if final_confirmation != 'DELETE ALL':
        print("❌ Ακύρωση διαγραφής.")
        return
    
    print("\n🔄 Ξεκινάει η διαγραφή των οικονομικών δεδομένων...")
    
    try:
        with schema_context('demo'):
            # Χρήση transaction για ασφάλεια
            with transaction.atomic():
                
                # 1. Διαγραφή όλων των συναλλαγών (Transaction)
                print("🗑️  Διαγραφή συναλλαγών...")
                from financial.models import Transaction
                transaction_count = Transaction.objects.count()
                Transaction.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {transaction_count} συναλλαγές")
                
                # 2. Διαγραφή όλων των εισπράξεων (Payment)
                print("🗑️  Διαγραφή εισπράξεων...")
                from financial.models import Payment
                payment_count = Payment.objects.count()
                Payment.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {payment_count} εισπράξεις")
                
                # 3. Διαγραφή όλων των αποδείξεων (FinancialReceipt)
                print("🗑️  Διαγραφή αποδείξεων...")
                from financial.models import FinancialReceipt
                receipt_count = FinancialReceipt.objects.count()
                FinancialReceipt.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {receipt_count} αποδείξεις")
                
                # 4. Διαγραφή όλων των σχέσεων δαπανών-διαμερισμάτων (ExpenseApartment)
                print("🗑️  Διαγραφή σχέσεων δαπανών-διαμερισμάτων...")
                from financial.models import ExpenseApartment
                expense_apt_count = ExpenseApartment.objects.count()
                ExpenseApartment.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {expense_apt_count} σχέσεις δαπανών-διαμερισμάτων")
                
                # 5. Διαγραφή όλων των μεριδίων διαμερισμάτων (ApartmentShare)
                print("🗑️  Διαγραφή μεριδίων διαμερισμάτων...")
                from financial.models import ApartmentShare
                share_count = ApartmentShare.objects.count()
                ApartmentShare.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {share_count} μερίδια διαμερισμάτων")
                
                # 6. Διαγραφή όλων των περιόδων κοινοχρήστων (CommonExpensePeriod)
                print("🗑️  Διαγραφή περιόδων κοινοχρήστων...")
                from financial.models import CommonExpensePeriod
                period_count = CommonExpensePeriod.objects.count()
                CommonExpensePeriod.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {period_count} περίοδοι κοινοχρήστων")
                
                # 7. Διαγραφή όλων των μετρήσεων (MeterReading)
                print("🗑️  Διαγραφή μετρήσεων...")
                from financial.models import MeterReading
                meter_count = MeterReading.objects.count()
                MeterReading.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {meter_count} μετρήσεις")
                
                # 8. Διαγραφή όλων των δαπανών (Expense)
                print("🗑️  Διαγραφή δαπανών...")
                from financial.models import Expense
                expense_count = Expense.objects.count()
                Expense.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {expense_count} δαπάνες")
                
                # 9. Μηδενισμός υπόλοιπων διαμερισμάτων
                print("🔄 Μηδενισμός υπόλοιπων διαμερισμάτων...")
                from apartments.models import Apartment
                apartment_count = Apartment.objects.count()
                
                for apartment in Apartment.objects.all():
                    apartment.current_balance = Decimal('0.00')
                    apartment.save()
                
                print(f"   ✅ Μηδενίστηκαν τα υπόλοιπα για {apartment_count} διαμερίσματα")
                
                # 10. Διαγραφή προμηθευτών (Supplier) - προαιρετικά
                print("🗑️  Διαγραφή προμηθευτών...")
                from financial.models import Supplier
                supplier_count = Supplier.objects.count()
                Supplier.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {supplier_count} προμηθευτές")
                
                # 11. Καθαρισμός audit logs
                print("🗑️  Καθαρισμός audit logs...")
                try:
                    from financial.audit import FinancialAuditLog
                    audit_count = FinancialAuditLog.objects.count()
                    FinancialAuditLog.objects.all().delete()
                    print(f"   ✅ Διαγράφηκαν {audit_count} audit logs")
                except ImportError:
                    print("   ℹ️  Audit logs δεν βρέθηκαν")
                
                print("\n" + "=" * 70)
                print("🎉 ΕΠΙΤΥΧΗΣ ΔΙΑΓΡΑΦΗ ΟΛΩΝ ΤΩΝ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ! 🎉")
                print("=" * 70)
                
                # Σύνοψη διαγραφής
                print("\n📊 ΣΥΝΟΛΙΚΑ ΔΙΑΓΡΑΦΗΚΑΝ:")
                print(f"   • {transaction_count} συναλλαγές")
                print(f"   • {payment_count} εισπράξεις")
                print(f"   • {receipt_count} αποδείξεις")
                print(f"   • {expense_apt_count} σχέσεις δαπανών-διαμερισμάτων")
                print(f"   • {share_count} μερίδια διαμερισμάτων")
                print(f"   • {period_count} περίοδοι κοινοχρήστων")
                print(f"   • {meter_count} μετρήσεις")
                print(f"   • {expense_count} δαπάνες")
                print(f"   • {supplier_count} προμηθευτές")
                print(f"   • Μηδενίστηκαν τα υπόλοιπα για {apartment_count} διαμερίσματα")
                
                print("\n💰 Συνολικό κόστος διαγραφής: €0.00")
                print("🔒 Η βάση δεδομένων είναι τώρα καθαρή από όλα τα οικονομικά δεδομένα!")
                
    except Exception as e:
        print(f"\n❌ ΣΦΑΛΜΑ κατά τη διαγραφή: {str(e)}")
        print("🔄 Εκτελείται rollback...")
        raise

def verify_clean_database():
    """Επιβεβαιώνει ότι η βάση είναι καθαρή"""
    
    print("\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΚΑΘΑΡΙΣΜΟΥ ΒΑΣΗΣ ΔΕΔΟΜΕΝΩΝ...")
    print("=" * 50)
    
    try:
        with schema_context('demo'):
            from financial.models import (
                Transaction, Payment, FinancialReceipt, ExpenseApartment,
                ApartmentShare, CommonExpensePeriod, MeterReading, Expense, Supplier
            )
            from apartments.models import Apartment
            
            # Έλεγχος για οικονομικά δεδομένα
            models_to_check = [
                ('Συναλλαγές', Transaction),
                ('Εισπράξεις', Payment),
                ('Αποδείξεις', FinancialReceipt),
                ('Σχέσεις Δαπανών-Διαμερισμάτων', ExpenseApartment),
                ('Μερίδια Διαμερισμάτων', ApartmentShare),
                ('Περίοδοι Κοινοχρήστων', CommonExpensePeriod),
                ('Μετρήσεις', MeterReading),
                ('Δαπάνες', Expense),
                ('Προμηθευτές', Supplier),
            ]
            
            all_clean = True
            for name, model in models_to_check:
                count = model.objects.count()
                status = "✅ ΚΑΘΑΡΟ" if count == 0 else f"❌ {count} εγγραφές"
                print(f"   {name}: {status}")
                if count > 0:
                    all_clean = False
            
            # Έλεγχος για μηδενικά υπόλοιπα
            print("\n💰 Έλεγχος υπόλοιπων διαμερισμάτων:")
            apartment_count = Apartment.objects.count()
            apartments_with_balance = Apartment.objects.exclude(current_balance=Decimal('0.00')).count()
            
            if apartments_with_balance == 0:
                print(f"   ✅ Όλα τα {apartment_count} διαμερίσματα έχουν μηδενικό υπόλοιπο")
            else:
                print(f"   ❌ {apartments_with_balance} διαμερίσματα έχουν μη μηδενικό υπόλοιπο")
                all_clean = False
            
            if all_clean:
                print("\n🎉 Η βάση δεδομένων είναι ΠΛΕΟΝΑΣΤΩΣ ΚΑΘΑΡΗ!")
            else:
                print("\n⚠️  Η βάση δεδομένων ΔΕΝ είναι πλήρως καθαρή!")
                
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο: {str(e)}")

if __name__ == "__main__":
    try:
        # Εκτέλεση διαγραφής
        clear_all_financial_data()
        
        # Επιβεβαίωση καθαρισμού
        verify_clean_database()
        
        print("\n✅ Το script ολοκληρώθηκε επιτυχώς!")
        
    except KeyboardInterrupt:
        print("\n\n❌ Το script διακόπηκε από τον χρήστη.")
    except Exception as e:
        print(f"\n❌ Κρίσιμο σφάλμα: {str(e)}")
        sys.exit(1)
