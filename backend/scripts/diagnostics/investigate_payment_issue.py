#!/usr/bin/env python3
"""
Ερεύνα την περίπτωση πληρωμής ενοικίου για Γεώργιο Παπαδόπουλο
Διαμέρισμα 1, Αλκμάνος 22
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
from apartments.models import Apartment
from buildings.models import Building
from financial.models import Payment, Transaction
from django.db.models import Sum
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator

def investigate_payment_issue():
    """
    Ερευνά την περίπτωση πληρωμής ενοικίου για Γεώργιο Παπαδόπουλο
    """
    
    print("🔍 ΕΡΕΥΝΑ ΠΛΗΡΩΜΗΣ ΕΝΟΙΚΙΟΥ")
    print("=" * 60)
    print("👤 Ιδιοκτήτης: Γεώργιος Παπαδόπουλος")
    print("🏠 Διαμέρισμα: 1")
    print("🏢 Κτίριο: Αλκμάνος 22")
    print()
    
    try:
        print("🔧 Django setup completed successfully")
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        return False
    
    with schema_context('demo'):
        try:
            # Βρες το κτίριο Αλκμάνος 22
            building = Building.objects.get(name__icontains="Αλκμάνος")
            print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
            print(f"📍 Διεύθυνση: {building.address}")
            
            # Βρες το διαμέρισμα 1
            apartment = Apartment.objects.get(building=building, number='1')
            print(f"🏠 Διαμέρισμα: {apartment.number}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"📊 Χιλιόστιμα: {apartment.participation_mills}")
            print(f"💰 Τρέχον υπόλοιπο (DB): {apartment.current_balance}€")
            print()
            
            # 1. ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ
            print("1️⃣ ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ")
            print("-" * 30)
            
            payments = Payment.objects.filter(apartment=apartment).order_by('date')
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"📋 Συνολικές πληρωμές: {total_payments}€")
            print(f"📊 Αριθμός πληρωμών: {payments.count()}")
            
            if payments.exists():
                print("\n📝 Λεπτομέρειες πληρωμών:")
                for i, payment in enumerate(payments, 1):
                    print(f"   {i}. {payment.date}: {payment.amount}€ ({payment.payment_type})")
                    print(f"      Μέθοδος: {payment.get_method_display()}")
                    print(f"      Περιγραφή: {payment.description}")
                    print()
            else:
                print("   ⚠️ Δεν βρέθηκαν πληρωμές!")
            
            # 2. ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ
            print("2️⃣ ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ")
            print("-" * 30)
            
            transactions = Transaction.objects.filter(
                apartment=apartment
            ).order_by('date', 'created_at')
            
            print(f"📊 Συνολικές συναλλαγές: {transactions.count()}")
            
            if transactions.exists():
                print("\n📝 Λεπτομέρειες συναλλαγών:")
                running_balance = Decimal('0.00')
                
                for i, transaction in enumerate(transactions, 1):
                    # Υπολογισμός running balance
                    if transaction.type in ['payment', 'common_expense_payment', 'payment_received', 'refund']:
                        running_balance += transaction.amount
                    elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                            'interest_charge', 'penalty_charge']:
                        running_balance -= transaction.amount
                    
                    print(f"   {i}. {transaction.date}: {transaction.description}")
                    print(f"      Ποσό: {transaction.amount}€ ({transaction.get_type_display()})")
                    print(f"      Υπόλοιπο πριν: {transaction.balance_before}€")
                    print(f"      Υπόλοιπο μετά: {transaction.balance_after}€")
                    print(f"      Υπολογισμένο: {running_balance}€")
                    print()
                
                print(f"🎯 Τελικό υπολογισμένο υπόλοιπο: {running_balance}€")
            else:
                print("   ⚠️ Δεν βρέθηκαν συναλλαγές!")
            
            # 3. ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟ COMMON EXPENSE CALCULATOR
            print("3️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟ COMMON EXPENSE CALCULATOR")
            print("-" * 40)
            
            try:
                calculator = CommonExpenseCalculator(building.id)
                shares = calculator.calculate_shares()
                
                apartment_share = shares.get(apartment.id, {})
                print(f"📊 Αποτέλεσμα από CommonExpenseCalculator:")
                print(f"   Συνολική χρέωση: {apartment_share.get('total_amount', 0)}€")
                print(f"   Προηγούμενο υπόλοιπο: {apartment_share.get('previous_balance', 0)}€")
                print(f"   Τρέχουσα χρέωση: {apartment_share.get('expense_share', 0)}€")
                print(f"   Συνολική οφειλή: {apartment_share.get('net_obligation', 0)}€")
                print()
            except Exception as e:
                print(f"❌ Σφάλμα στον CommonExpenseCalculator: {e}")
            
            # 4. ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟ ADVANCED CALCULATOR
            print("4️⃣ ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟ ADVANCED CALCULATOR")
            print("-" * 40)
            
            try:
                advanced_calculator = AdvancedCommonExpenseCalculator(building.id)
                advanced_shares = advanced_calculator.calculate_shares()
                
                apartment_advanced = advanced_shares.get(apartment.id, {})
                print(f"📊 Αποτέλεσμα από AdvancedCommonExpenseCalculator:")
                print(f"   Συνολική χρέωση: {apartment_advanced.get('total_amount', 0)}€")
                print(f"   Προηγούμενο υπόλοιπο: {apartment_advanced.get('previous_balance', 0)}€")
                print(f"   Τρέχουσα χρέωση: {apartment_advanced.get('expense_share', 0)}€")
                print(f"   Συνολική οφειλή: {apartment_advanced.get('total_due', 0)}€")
                print()
            except Exception as e:
                print(f"❌ Σφάλμα στον AdvancedCommonExpenseCalculator: {e}")
            
            # 5. ΣΥΓΚΡΙΣΗ ΚΑΙ ΑΝΑΛΥΣΗ
            print("5️⃣ ΣΥΓΚΡΙΣΗ ΚΑΙ ΑΝΑΛΥΣΗ")
            print("-" * 25)
            
            print(f"💰 Υπόλοιπο από DB: {apartment.current_balance}€")
            print(f"💰 Συνολικές πληρωμές: {total_payments}€")
            
            if transactions.exists():
                # Υπολογισμός χρεώσεων από συναλλαγές
                total_charges = Transaction.objects.filter(
                    apartment=apartment,
                    type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                             'interest_charge', 'penalty_charge']
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                total_payments_from_transactions = Transaction.objects.filter(
                    apartment=apartment,
                    type__in=['payment', 'common_expense_payment', 'payment_received', 'refund']
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                calculated_balance = total_payments + total_payments_from_transactions - total_charges
                
                print(f"💰 Συνολικές χρεώσεις (από συναλλαγές): {total_charges}€")
                print(f"💰 Συνολικές πληρωμές (από συναλλαγές): {total_payments_from_transactions}€")
                print(f"💰 Υπολογισμένο υπόλοιπο: {calculated_balance}€")
                
                # Έλεγχος αν υπάρχει διαφορά
                db_balance = apartment.current_balance or Decimal('0.00')
                difference = abs(db_balance - calculated_balance)
                
                if difference > Decimal('0.01'):  # Tolerance για στρογγυλοποίηση
                    print(f"⚠️ ΠΡΟΒΛΗΜΑ: Διαφορά {difference}€ μεταξύ DB και υπολογισμένου υπολοίπου!")
                    print(f"   DB: {db_balance}€")
                    print(f"   Υπολογισμένο: {calculated_balance}€")
                else:
                    print("✅ Τα υπολοίπα είναι συνεπή!")
            
            # 6. ΕΛΕΓΧΟΣ ΕΝΟΙΚΙΟΥ
            print("\n6️⃣ ΕΛΕΓΧΟΣ ΕΝΟΙΚΙΟΥ")
            print("-" * 20)
            
            # Έλεγχος αν υπάρχουν πληρωμές ενοικίου
            rent_payments = Payment.objects.filter(
                apartment=apartment,
                payment_type='rent'
            )
            
            print(f"💰 Πληρωμές ενοικίου: {rent_payments.count()}")
            
            if rent_payments.exists():
                total_rent = rent_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                print(f"💰 Συνολικό ενοίκιο: {total_rent}€")
                
                print("\n📝 Λεπτομέρειες πληρωμών ενοικίου:")
                for i, payment in enumerate(rent_payments, 1):
                    print(f"   {i}. {payment.date}: {payment.amount}€")
                    print(f"      Περιγραφή: {payment.description}")
                    print(f"      Μέθοδος: {payment.get_method_display()}")
                    print()
            
            # 7. ΣΥΜΠΕΡΑΣΜΑΤΑ
            print("7️⃣ ΣΥΜΠΕΡΑΣΜΑΤΑ")
            print("-" * 15)
            
            if apartment.current_balance and apartment.current_balance > 0:
                print(f"⚠️ Το διαμέρισμα έχει θετικό υπόλοιπο: {apartment.current_balance}€")
                print("   Αυτό σημαίνει ότι ο ιδιοκτήτης χρωστάει χρήματα")
            elif apartment.current_balance and apartment.current_balance < 0:
                print(f"✅ Το διαμέρισμα έχει αρνητικό υπόλοιπο: {apartment.current_balance}€")
                print("   Αυτό σημαίνει ότι έχει πληρώσει περισσότερα από όσα χρωστάει")
            else:
                print("✅ Το διαμέρισμα έχει μηδενικό υπόλοιπο")
            
            return True
            
        except Apartment.DoesNotExist:
            print("❌ Δεν βρέθηκε το διαμέρισμα 1 στο Αλκμάνος 22")
            return False
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22")
            return False
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            return False

if __name__ == "__main__":
    success = investigate_payment_issue()
    if success:
        print("\n✅ Η έρευνα ολοκληρώθηκε επιτυχώς!")
    else:
        print("\n❌ Η έρευνα απέτυχε!")
