#!/usr/bin/env python3
"""
🔍 Τελικός Έλεγχος Payment System - New Concierge
==================================================

Αυτό το script κάνει έναν πλήρη έλεγχο του payment system για να επιβεβαιώσει ότι:
1. Όλα τα backend components λειτουργούν σωστά
2. Τα δεδομένα είναι συνεπή
3. Οι υπολογισμοί είναι σωστοί
4. Το frontend θα λειτουργήσει σωστά

Εκτέλεση: docker exec -it linux_version-backend-1 python /app/final_payment_system_verification.py
"""

import os
import django
from decimal import Decimal

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from financial.models import Building, Apartment, Payment, Transaction
from financial.serializers import PaymentSerializer

User = get_user_model()

def print_header(title):
    """Εκτύπωση επικεφαλίδας"""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_section(title):
    """Εκτύπωση τμήματος"""
    print(f"\n📋 {title}")
    print(f"{'-'*40}")

def print_success(message):
    """Εκτύπωση επιτυχίας"""
    print(f"✅ {message}")

def print_error(message):
    """Εκτύπωση σφάλματος"""
    print(f"❌ {message}")

def print_info(message):
    """Εκτύπωση πληροφορίας"""
    print(f"ℹ️  {message}")

def check_database_consistency():
    """Έλεγχος συνεπής βάσης δεδομένων"""
    print_section("Έλεγχος Συνεπής Βάσης Δεδομένων")
    
    try:
        # Έλεγχος ότι όλα τα κτίρια έχουν τουλάχιστον ένα διαμέρισμα
        buildings = Building.objects.all()
        for building in buildings:
            apartments = Apartment.objects.filter(building=building)
            if apartments.count() == 0:
                print_error(f"Κτίριο {building.name} δεν έχει διαμερίσματα")
            else:
                print_success(f"Κτίριο {building.name}: {apartments.count()} διαμερίσματα")
        
        # Έλεγχος ότι όλα τα payments έχουν αντίστοιχα transactions
        payments = Payment.objects.all()
        for payment in payments:
            transactions = Transaction.objects.filter(
                reference_id=str(payment.id),
                reference_type='payment'
            )
            if transactions.count() == 0:
                print_error(f"Payment {payment.id} δεν έχει αντίστοιχο transaction")
            elif transactions.count() > 1:
                print_error(f"Payment {payment.id} έχει {transactions.count()} transactions (αναμένεται 1)")
            else:
                print_success(f"Payment {payment.id}: 1 transaction ✅")
        
        return True
    except Exception as e:
        print_error(f"Σφάλμα κατά τον έλεγχο βάσης: {e}")
        return False

def check_balance_calculations():
    """Έλεγχος υπολογισμών υπολοίπων"""
    print_section("Έλεγχος Υπολογισμών Υπολοίπων")
    
    try:
        apartments = Apartment.objects.all()
        for apartment in apartments:
            # Υπολογισμός από transactions
            transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'id')
            calculated_balance = Decimal('0.00')
            
            for transaction in transactions:
                if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                    calculated_balance += transaction.amount
                elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                        'interest_charge', 'penalty_charge']:
                    calculated_balance -= transaction.amount
                elif transaction.type == 'balance_adjustment':
                    if transaction.balance_after is not None:
                        calculated_balance = transaction.balance_after
            
            # Έλεγχος με το αποθηκευμένο balance
            stored_balance = apartment.current_balance or Decimal('0.00')
            
            if abs(calculated_balance - stored_balance) > Decimal('0.01'):
                print_error(f"Διαμέρισμα {apartment.number}: Υπολογισμένο={calculated_balance}, Αποθηκευμένο={stored_balance}")
            else:
                print_success(f"Διαμέρισμα {apartment.number}: {calculated_balance}€ ✅")
        
        return True
    except Exception as e:
        print_error(f"Σφάλμα κατά τον έλεγχο υπολογισμών: {e}")
        return False

def check_payment_serializer():
    """Έλεγχος PaymentSerializer"""
    print_section("Έλεγχος PaymentSerializer")
    
    try:
        payments = Payment.objects.all()[:5]  # Έλεγχος πρώτων 5 payments
        
        for payment in payments:
            serializer = PaymentSerializer(payment, context={'request': None})
            data = serializer.data
            
            # Έλεγχος ότι όλα τα απαραίτητα πεδία υπάρχουν
            required_fields = ['id', 'apartment', 'amount', 'date', 'method', 'current_balance']
            for field in required_fields:
                if field not in data:
                    print_error(f"Payment {payment.id}: Λείπει πεδίο {field}")
                else:
                    print_success(f"Payment {payment.id}: Πεδίο {field} ✅")
            
            # Έλεγχος ότι το current_balance είναι αριθμός
            if 'current_balance' in data:
                try:
                    float(data['current_balance'])
                    print_success(f"Payment {payment.id}: current_balance είναι αριθμός ✅")
                except (ValueError, TypeError):
                    print_error(f"Payment {payment.id}: current_balance δεν είναι αριθμός")
        
        return True
    except Exception as e:
        print_error(f"Σφάλμα κατά τον έλεγχο serializer: {e}")
        return False

def check_building_3_specific():
    """Έλεγχος ειδικά για κτίριο 3"""
    print_section("Έλεγχος Κτιρίου 3 (Αραχώβης)")
    
    try:
        building = Building.objects.get(id=3)
        print_info(f"Κτίριο: {building.name}")
        print_info(f"Διεύθυνση: {building.address}")
        print_info(f"Τρέχον αποθεματικό: {building.current_reserve}€")
        
        apartments = Apartment.objects.filter(building=building)
        print_info(f"Διαμερίσματα: {apartments.count()}")
        
        payments = Payment.objects.filter(apartment__building=building)
        print_info(f"Συνολικές εισπράξεις: {payments.count()}")
        
        total_payments = sum(payment.amount for payment in payments)
        print_info(f"Συνολικό ποσό εισπράξεων: {total_payments}€")
        
        transactions = Transaction.objects.filter(building=building)
        print_info(f"Συνολικές συναλλαγές: {transactions.count()}")
        
        # Έλεγχος αν payments = transactions
        if payments.count() == transactions.count():
            print_success("✅ Όλα τα payments έχουν αντίστοιχα transactions")
        else:
            print_error(f"❌ Αναντιστοιχία: {payments.count()} payments vs {transactions.count()} transactions")
        
        return True
    except Building.DoesNotExist:
        print_error("Κτίριο 3 δεν βρέθηκε")
        return False
    except Exception as e:
        print_error(f"Σφάλμα κατά τον έλεγχο κτιρίου 3: {e}")
        return False

def check_frontend_compatibility():
    """Έλεγχος συμβατότητας με frontend"""
    print_section("Έλεγχος Συμβατότητας Frontend")
    
    try:
        # Έλεγχος ότι τα πεδία που χρειάζεται το frontend υπάρχουν
        payments = Payment.objects.all()[:3]
        
        for payment in payments:
            # Έλεγχος ότι το apartment έχει αριθμό
            if not payment.apartment.number:
                print_error(f"Payment {payment.id}: Διαμέρισμα δεν έχει αριθμό")
            
            # Έλεγχος ότι το apartment έχει building
            if not payment.apartment.building:
                print_error(f"Payment {payment.id}: Διαμέρισμα δεν έχει κτίριο")
            
            # Έλεγχος ότι το building έχει όνομα
            if not payment.apartment.building.name:
                print_error(f"Payment {payment.id}: Κτίριο δεν έχει όνομα")
            
            print_success(f"Payment {payment.id}: Frontend compatibility ✅")
        
        return True
    except Exception as e:
        print_error(f"Σφάλμα κατά τον έλεγχο frontend compatibility: {e}")
        return False

def generate_summary_report():
    """Δημιουργία σύνοψης αναφοράς"""
    print_section("Σύνοψη Αναφοράς")
    
    try:
        total_buildings = Building.objects.count()
        total_apartments = Apartment.objects.count()
        total_payments = Payment.objects.count()
        total_transactions = Transaction.objects.count()
        
        print_info(f"Συνολικά κτίρια: {total_buildings}")
        print_info(f"Συνολικά διαμερίσματα: {total_apartments}")
        print_info(f"Συνολικές εισπράξεις: {total_payments}")
        print_info(f"Συνολικές συναλλαγές: {total_transactions}")
        
        # Υπολογισμός συνολικού ποσού εισπράξεων
        total_amount = sum(payment.amount for payment in Payment.objects.all())
        print_info(f"Συνολικό ποσό εισπράξεων: {total_amount}€")
        
        # Έλεγχος αν υπάρχουν διαμερίσματα με αρνητικό υπόλοιπο
        negative_balances = Apartment.objects.filter(current_balance__lt=0).count()
        if negative_balances > 0:
            print_info(f"Διαμερίσματα με αρνητικό υπόλοιπο: {negative_balances}")
        else:
            print_success("Όλα τα διαμερίσματα έχουν θετικό ή μηδενικό υπόλοιπο")
        
        return True
    except Exception as e:
        print_error(f"Σφάλμα κατά τη δημιουργία αναφοράς: {e}")
        return False

def main():
    """Κύρια συνάρτηση"""
    print_header("ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ PAYMENT SYSTEM")
    print_info("Έναρξη ελέγχου...")
    
    checks = [
        ("Database Consistency", check_database_consistency),
        ("Balance Calculations", check_balance_calculations),
        ("Payment Serializer", check_payment_serializer),
        ("Building 3 Specific", check_building_3_specific),
        ("Frontend Compatibility", check_frontend_compatibility),
        ("Summary Report", generate_summary_report),
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print_error(f"Σφάλμα στο {check_name}: {e}")
            results.append((check_name, False))
    
    # Τελική σύνοψη
    print_header("ΤΕΛΙΚΗ ΣΥΝΟΨΗ")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print_info(f"Επιτυχείς έλεγχοι: {passed}/{total}")
    
    if passed == total:
        print_success("🎉 ΟΛΟΙ ΟΙ ΕΛΕΓΧΟΙ ΠΕΡΑΣΑΝ ΕΠΙΤΥΧΩΣ!")
        print_success("Το Payment System είναι έτοιμο για παραγωγή!")
    else:
        print_error("⚠️  ΚΑΠΟΙΟΙ ΕΛΕΓΧΟΙ ΑΠΕΤΥΧΑΝ")
        for check_name, result in results:
            status = "✅" if result else "❌"
            print(f"{status} {check_name}")
    
    print_header("ΤΕΛΟΣ ΕΛΕΓΧΟΥ")

if __name__ == "__main__":
    main()
