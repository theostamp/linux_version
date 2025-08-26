import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Payment, Transaction, Expense
from apartments.models import Apartment

def analyze_existing_data():
    """Ανάλυση των υπάρχοντων δεδομένων για κατανόηση της τρέχουσας κατάστασης"""
    
    print("🔍 ΑΝΑΛΥΣΗ ΥΠΑΡΧΟΝΤΩΝ ΔΕΔΟΜΕΝΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.all()
        print(f"📊 Διαμερίσματα: {apartments.count()}")
        
        # Έλεγχος πληρωμών
        payments = Payment.objects.all()
        print(f"💰 Πληρωμές: {payments.count()}")
        
        if payments.exists():
            print(f"   - Πρώτη πληρωμή: {payments.earliest('created_at').created_at}")
            print(f"   - Τελευταία πληρωμή: {payments.latest('created_at').created_at}")
            print(f"   - Συνολικό ποσό: {sum(p.amount for p in payments):.2f}€")
        
        # Έλεγχος συναλλαγών
        transactions = Transaction.objects.all()
        print(f"💳 Συναλλαγές: {transactions.count()}")
        
        if transactions.exists():
            print(f"   - Πρώτη συναλλαγή: {transactions.earliest('created_at').created_at}")
            print(f"   - Τελευταία συναλλαγή: {transactions.latest('created_at').created_at}")
            print(f"   - Συνολικό ποσό: {sum(t.amount for t in transactions):.2f}€")
        
        # Έλεγχος δαπανών
        expenses = Expense.objects.all()
        print(f"📉 Δαπάνες: {expenses.count()}")
        
        if expenses.exists():
            print(f"   - Πρώτη δαπάνη: {expenses.earliest('created_at').created_at}")
            print(f"   - Τελευταία δαπάνη: {expenses.latest('created_at').created_at}")
            print(f"   - Συνολικό ποσό: {sum(e.amount for e in expenses):.2f}€")
        
        # Έλεγχος εισπράξεων (μέσω πληρωμών)
        total_income = sum(p.amount for p in payments)
        print(f"📈 Συνολικές Εισπράξεις: {total_income:.2f}€")
        
        # Ανάλυση ανά διαμέρισμα
        print("\n🏢 ΑΝΑΛΥΣΗ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
        print("-" * 30)
        
        for apartment in apartments:
            apartment_payments = payments.filter(apartment=apartment)
            apartment_transactions = transactions.filter(apartment=apartment)
            
            print(f"Διαμέρισμα {apartment.number}:")
            print(f"  - Πληρωμές: {apartment_payments.count()}")
            print(f"  - Συναλλαγές: {apartment_transactions.count()}")
            print(f"  - Συνολικό ποσό πληρωμών: {sum(p.amount for p in apartment_payments):.2f}€")
            print(f"  - Συνολικό ποσό συναλλαγών: {sum(t.amount for t in apartment_transactions):.2f}€")
            print(f"  - Τρέχον υπόλοιπο: {apartment.current_balance:.2f}€")
            print()
        
        # Έλεγχος για διπλές εγγραφές
        print("🔍 ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΕΓΓΡΑΦΩΝ:")
        print("-" * 30)
        
        # Έλεγχος διπλών πληρωμών
        payment_duplicates = payments.values('apartment', 'amount', 'created_at').annotate(
            count=django.db.models.Count('id')
        ).filter(count__gt=1)
        
        if payment_duplicates.exists():
            print(f"⚠️  Βρέθηκαν διπλές πληρωμές: {payment_duplicates.count()}")
        else:
            print("✅ Δεν βρέθηκαν διπλές πληρωμές")
        
        # Έλεγχος διπλών συναλλαγών
        transaction_duplicates = transactions.values('apartment', 'amount', 'created_at').annotate(
            count=django.db.models.Count('id')
        ).filter(count__gt=1)
        
        if transaction_duplicates.exists():
            print(f"⚠️  Βρέθηκαν διπλές συναλλαγές: {transaction_duplicates.count()}")
        else:
            print("✅ Δεν βρέθηκαν διπλές συναλλαγές")
        
        # Σύνοψη
        print("\n📋 ΣΥΝΟΨΗ:")
        print("-" * 20)
        print(f"Συνολικό ποσό πληρωμών: {sum(p.amount for p in payments):.2f}€")
        print(f"Συνολικό ποσό συναλλαγών: {sum(t.amount for t in transactions):.2f}€")
        print(f"Διαφορά: {sum(p.amount for p in payments) - sum(t.amount for t in transactions):.2f}€")
        
        if transactions.count() == 0:
            print("\n🚨 Κρίσιμο! ΠΡΟΒΛΗΜΑ: Δεν υπάρχουν συναλλαγές!")
            print("   Αυτό εξηγεί γιατί η μεταφορά υπολοίπων δεν λειτουργεί.")
            print("   Χρειάζεται δημιουργία Transaction records από Payment records.")

if __name__ == "__main__":
    analyze_existing_data()
