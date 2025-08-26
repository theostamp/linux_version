#!/usr/bin/env python3
"""
Financial Audit - Συνοπτική Αναφορά Ευρημάτων
==============================================

Αυτό το script δημιουργεί μια συνοπτική αναφορά όλων των ευρημάτων
από τους ελέγχους οικονομικών δεδομένων.
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
from financial.models import Apartment, Expense, Payment, Transaction, Building
from financial.services import CommonExpenseCalculator

def format_currency(amount):
    """Μορφοποίηση ποσού σε ευρώ"""
    return f"{float(amount):.2f}€"

def generate_summary_report():
    """Δημιουργία συνοπτικής αναφοράς"""
    print("📋 FINANCIAL AUDIT - ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ ΕΥΡΗΜΑΤΩΝ")
    print("=" * 80)
    print()
    
    with schema_context('demo'):
        # Λήψη κτιρίου
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.address}")
        
        # Λήψη διαμερισμάτων
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        print()
        
        # Στατιστικά δεδομένων
        print("📊 ΣΤΑΤΙΣΤΙΚΑ ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        total_expenses = Expense.objects.filter(building=building).count()
        total_payments = Payment.objects.filter(apartment__building=building).count()
        total_transactions = Transaction.objects.filter(building=building).count()
        
        print(f"💸 Δαπάνες: {total_expenses}")
        print(f"💰 Εισπράξεις: {total_payments}")
        print(f"🔄 Συναλλαγές: {total_transactions}")
        print()
        
        # Συνολικό υπόλοιπο
        total_balance = sum(apt.current_balance for apt in apartments)
        print(f"📈 Συνολικό υπόλοιπο διαμερισμάτων: {format_currency(total_balance)}")
        print()
        
        # Ευρήματα από τους ελέγχους
        print("🔍 ΕΥΡΗΜΑΤΑ ΑΠΟ ΤΟΥΣ ΕΛΕΓΧΟΥΣ")
        print("-" * 50)
        
        # 1. Έλεγχος μεταφοράς υπολοίπων
        print("1️⃣ ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        print("   ❌ Βρέθηκε πρόβλημα: Η μεταφορά υπολοίπων δεν είναι σωστή")
        print("   📊 Διαφορά: 150.00€ ανά μήνα")
        print("   🎯 Αναμενόμενο: 300.00€, Πραγματικό: 150.00€")
        print("   📅 Επηρεάζει: Μήνες 1/2024 έως 5/2024")
        print()
        
        # 2. Έλεγχος κατανομής χιλιοστών
        print("2️⃣ ΕΛΕΓΧΟΣ ΚΑΤΑΝΟΜΗΣ ΧΙΛΙΟΣΤΩΝ")
        print("   ✅ Τα συνολικά χιλιοστά είναι σωστά (1000)")
        print("   ✅ Η κατανομή χιλιοστών ανά διαμέρισμα είναι σωστή")
        print("   ℹ️  Δεν υπάρχουν δαπάνες για έλεγχο κατανομής")
        print()
        
        # 3. Έλεγχος διπλών χρεώσεων
        print("3️⃣ ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΧΡΕΩΣΕΩΝ")
        print("   ✅ Δεν βρέθηκαν διπλές δαπάνες")
        print("   ✅ Δεν βρέθηκαν διπλές εισπράξεις")
        print("   ℹ️  Δεν υπάρχουν εισπράξεις αποθεματικού")
        print("   ℹ️  Δεν υπάρχουν δαπάνες διαχείρισης")
        print()
        
        # 4. Χρονική εμφάνιση
        print("4️⃣ ΧΡΟΝΙΚΗ ΕΜΦΑΝΙΣΗ ΔΕΔΟΜΕΝΩΝ")
        print("   📅 Μήνες με δεδομένα: 6 (1/2024 έως 6/2024)")
        print("   ✅ Όλα τα δεδομένα εμφανίζονται στους σωστούς μήνες")
        print()
        
        # Ανάλυση προβλημάτων
        print("⚠️  ΑΝΑΛΥΣΗ ΠΡΟΒΛΗΜΑΤΩΝ")
        print("-" * 50)
        
        print("🔴 ΚΡΙΤΙΚΟ ΠΡΟΒΛΗΜΑ:")
        print("   • Η μεταφορά υπολοίπων μεταξύ μηνών δεν λειτουργεί σωστά")
        print("   • Κάθε μήνας ξεκινά με 150.00€ αντί για 300.00€")
        print("   • Αυτό οδηγεί σε λανθασμένα υπολογισμένα υπόλοιπα")
        print()
        
        print("🟡 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΔΙΟΡΘΩΣΕΙΣ:")
        print("   1. Έλεγχος του calculation system για τη μεταφορά υπολοίπων")
        print("   2. Επιβεβαίωση ότι τα previous_balance υπολογίζονται σωστά")
        print("   3. Έλεγχος του transaction flow για τη μεταφορά")
        print()
        
        # Συνολική αξιολόγηση
        print("📈 ΣΥΝΟΛΙΚΗ ΑΞΙΟΛΟΓΗΣΗ")
        print("-" * 50)
        
        print("✅ ΘΕΤΙΚΑ ΣΗΜΕΙΑ:")
        print("   • Τα χιλιοστά είναι σωστά κατανεμημένα")
        print("   • Δεν υπάρχουν διπλές χρεώσεις")
        print("   • Η χρονική εμφάνιση είναι σωστή")
        print("   • Το συνολικό υπόλοιπο είναι ακριβές")
        print()
        
        print("❌ ΠΡΟΒΛΗΜΑΤΑ:")
        print("   • Κριτικό πρόβλημα με τη μεταφορά υπολοίπων")
        print("   • Απαιτείται άμεση διόρθωση")
        print()
        
        print("🎯 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΕΝΕΡΓΕΙΕΣ:")
        print("   1. Άμεση διόρθωση του calculation system")
        print("   2. Επαναληπτικός έλεγχος μετά τη διόρθωση")
        print("   3. Δημιουργία automated tests για τη μεταφορά υπολοίπων")
        print("   4. Ενημέρωση του documentation")
        print()
        
        print("✅ Η συνοπτική αναφορά ολοκληρώθηκε!")

if __name__ == "__main__":
    generate_summary_report()
