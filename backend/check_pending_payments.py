#!/usr/bin/env python
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
from financial.models import Payment, Transaction
from buildings.models import Building
from apartments.models import Apartment

def check_pending_payments():
    """
    Έλεγχος για εκκρεμείς πληρωμές που δεν έχουν επιβεβαιωθεί.
    """
    with schema_context('demo'):
        # Εύρεση όλων των πληρωμών
        all_payments = Payment.objects.all().order_by('-date')
        print(f"🔍 Συνολικός αριθμός πληρωμών: {all_payments.count()}")
        
        # Έλεγχος αν υπάρχει πεδίο is_verified ή status στο μοντέλο Payment
        has_verification_field = False
        try:
            # Έλεγχος για is_verified
            test_payment = all_payments.first()
            if hasattr(test_payment, 'is_verified'):
                has_verification_field = True
                print("✅ Το μοντέλο Payment έχει πεδίο is_verified")
        except:
            pass
        
        try:
            # Έλεγχος για status
            test_payment = all_payments.first()
            if hasattr(test_payment, 'status'):
                has_verification_field = True
                print("✅ Το μοντέλο Payment έχει πεδίο status")
        except:
            pass
        
        if not has_verification_field:
            print("ℹ️ Το μοντέλο Payment δεν έχει πεδίο is_verified ή status")
            print("🔍 Θα γίνει έλεγχος για εκκρεμείς πληρωμές με άλλα κριτήρια")
        
        # Έλεγχος για πληρωμές που μπορεί να είναι εκκρεμείς
        pending_criteria = {
            "Χωρίς απόδειξη": all_payments.filter(receipt__isnull=True).count(),
            "Πρόσφατες (τελευταίες 30 μέρες)": all_payments.filter(date__gte=date.today().replace(day=1)).count(),
            "Με μηδενικές σημειώσεις": all_payments.filter(notes="").count(),
            "Χωρίς αριθμό αναφοράς": all_payments.filter(reference_number="").count()
        }
        
        print("\n📋 Πιθανές εκκρεμείς πληρωμές βάσει κριτηρίων:")
        for criterion, count in pending_criteria.items():
            print(f"   - {criterion}: {count}")
        
        # Ψάχνουμε συγκεκριμένα για 10 εκκρεμείς πληρωμές όπως αναφέρεται στο αίτημα
        recent_payments = all_payments[:15]  # Παίρνουμε τις 15 πιο πρόσφατες για να δούμε
        
        print("\n📊 Αναλυτικά στοιχεία για τις πρόσφατες πληρωμές:")
        print(f"{'ID':<5} {'Διαμέρισμα':<15} {'Ημερομηνία':<15} {'Ποσό':<10} {'Μέθοδος':<20} {'Απόδειξη':<10} {'Αναφορά':<15}")
        print("-" * 90)
        
        for payment in recent_payments:
            receipt_status = "✓" if payment.receipt else "✗"
            reference = payment.reference_number[:10] + "..." if payment.reference_number and len(payment.reference_number) > 13 else (payment.reference_number or "—")
            
            print(f"{payment.id:<5} {payment.apartment.number:<15} {payment.date.strftime('%d/%m/%Y'):<15} {float(payment.amount):<10.2f} {payment.get_method_display():<20} {receipt_status:<10} {reference:<15}")
        
        # Ελέγχουμε αν υπάρχουν ακριβώς 10 πληρωμές που μπορεί να θεωρούνται εκκρεμείς
        recent_without_receipt = all_payments.filter(receipt__isnull=True)[:15]
        if recent_without_receipt.count() >= 10:
            print(f"\n⚠️ Βρέθηκαν {recent_without_receipt.count()} πρόσφατες πληρωμές χωρίς απόδειξη!")
            print("📋 Πιθανώς αυτές είναι οι 10 εκκρεμείς πληρωμές που αναφέρονται.")
            
            print("\n📊 Αναλυτικά στοιχεία για τις πληρωμές χωρίς απόδειξη:")
            print(f"{'ID':<5} {'Διαμέρισμα':<15} {'Ημερομηνία':<15} {'Ποσό':<10} {'Μέθοδος':<20}")
            print("-" * 70)
            
            for payment in recent_without_receipt[:10]:
                print(f"{payment.id:<5} {payment.apartment.number:<15} {payment.date.strftime('%d/%m/%Y'):<15} {float(payment.amount):<10.2f} {payment.get_method_display():<20}")
        
        # Έλεγχος για συναλλαγές (Transactions) που σχετίζονται με τις πληρωμές
        payment_transactions = Transaction.objects.filter(type='common_expense_payment')[:10]
        
        print("\n📑 Παραδείγματα συναλλαγών πληρωμών:")
        for transaction in payment_transactions:
            print(f"   - {transaction.description} ({float(transaction.amount):.2f}€) - {transaction.date.strftime('%d/%m/%Y')}")
        
        # Προτεινόμενη λύση
        print("\n🔧 ΠΡΟΤΕΙΝΟΜΕΝΗ ΛΥΣΗ:")
        print("1. Προσθήκη πεδίου 'is_verified' στο μοντέλο Payment")
        print("2. Ενημέρωση του API ώστε να επιτρέπει την επιβεβαίωση πληρωμών")
        print("3. Προσθήκη κουμπιού επιβεβαίωσης στο UI")
        print("4. Προσθήκη φίλτρου για εύκολο εντοπισμό των μη επιβεβαιωμένων πληρωμών")

if __name__ == '__main__':
    check_pending_payments()
