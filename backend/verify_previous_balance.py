#!/usr/bin/env python3
"""
Έλεγχος υπολογισμού προηγούμενου υπολοίπου για διαμέρισμα 3
"""

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def verify_previous_balance():
    """Έλεγχος προηγούμενου υπολοίπου για διαμέρισμα 3"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from financial.models import Payment, Transaction
        from financial.services import FinancialDashboardService
        
        print("🔍 ΕΛΕΓΧΟΣ ΠΡΟΗΓΟΥΜΕΝΟΥ ΥΠΟΛΟΙΠΟΥ")
        print("=" * 50)
        
        # 1. Εύρεση διαμερίσματος 3
        try:
            apartment = Apartment.objects.get(number='3', building_id=4)
            print(f"📍 Διαμέρισμα: {apartment.number}")
            print(f"🏢 Κτίριο: {apartment.building.name}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"🏠 Ενοικιαστής: {apartment.tenant_name}")
        except Apartment.DoesNotExist:
            print("❌ Διαμέρισμα 3 δεν βρέθηκε!")
            return
        
        print("\n" + "=" * 50)
        
        # 2. Τρέχων μήνας (Αύγουστος 2025)
        current_month = "2025-08"
        print(f"📅 Τρέχων μήνας: {current_month}")
        
        # 3. Προηγούμενος μήνας (Ιούλιος 2025)
        previous_month = "2025-07"
        previous_month_end = date(2025, 7, 31)
        print(f"📅 Προηγούμενος μήνας: {previous_month}")
        print(f"📅 Ημερομηνία αναφοράς: {previous_month_end}")
        
        print("\n" + "=" * 50)
        
        # 4. Υπολογισμός ιστορικού υπολοίπου μέχρι τέλος Ιουλίου 2025
        print("📊 ΥΠΟΛΟΓΙΣΜΟΣ ΙΣΤΟΡΙΚΟΥ ΥΠΟΛΟΙΠΟΥ")
        
        # Όλες οι συναλλαγές μέχρι 31/07/2025
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lte=previous_month_end
        ).order_by('date', 'id')
        
        running_balance = Decimal('0.00')
        print(f"\n📜 Συναλλαγές μέχρι {previous_month_end}:")
        
        for i, transaction in enumerate(transactions, 1):
            old_balance = running_balance
            
            if transaction.type in ['common_expense_payment', 'payment_received', 'refund']:
                running_balance += transaction.amount
                print(f"   {i}. {transaction.date}: +{transaction.amount}€ ({transaction.type}) → {running_balance}€")
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                    'interest_charge', 'penalty_charge']:
                running_balance -= transaction.amount
                print(f"   {i}. {transaction.date}: -{transaction.amount}€ ({transaction.type}) → {running_balance}€")
            elif transaction.type == 'balance_adjustment':
                if transaction.balance_after is not None:
                    running_balance = transaction.balance_after
                    print(f"   {i}. {transaction.date}: adjustment → {running_balance}€ ({transaction.type})")
        
        previous_balance = running_balance
        print(f"\n✅ Προηγούμενο υπόλοιπο (μέχρι 31/07/2025): {previous_balance}€")
        
        print("\n" + "=" * 50)
        
        # 5. Πληρωμές Αυγούστου 2025
        print("💰 ΠΛΗΡΩΜΕΣ ΑΥΓΟΥΣΤΟΥ 2025")
        
        august_payments = Payment.objects.filter(
            apartment=apartment,
            date__year=2025,
            date__month=8
        ).order_by('date', 'id')
        
        total_august_payments = Decimal('0.00')
        for payment in august_payments:
            total_august_payments += payment.amount
            print(f"   💵 {payment.date}: {payment.amount}€ ({payment.get_method_display()})")
            if payment.reserve_fund_amount:
                print(f"      🏦 Αποθεματικό: {payment.reserve_fund_amount}€")
        
        print(f"\n💰 Συνολικές πληρωμές Αυγούστου: {total_august_payments}€")
        
        print("\n" + "=" * 50)
        
        # 6. Μηνιαία οφειλή Αυγούστου 2025
        print("📋 ΜΗΝΙΑΙΑ ΟΦΕΙΛΗ ΑΥΓΟΥΣΤΟΥ 2025")
        
        # Χρήση του PaymentSerializer για τον υπολογισμό
        from financial.serializers import PaymentSerializer
        
        if august_payments.exists():
            serializer = PaymentSerializer()
            monthly_due = serializer.get_monthly_due(august_payments.first())
            print(f"📊 Μηνιαία οφειλή (από serializer): {monthly_due}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές για τον υπολογισμό οφειλής")
            monthly_due = 0
        
        print("\n" + "=" * 50)
        
        # 7. Υπολογισμοί
        print("🧮 ΤΕΛΙΚΟΙ ΥΠΟΛΟΓΙΣΜΟΙ")
        
        monthly_balance = total_august_payments - Decimal(str(monthly_due))
        global_balance = previous_balance + monthly_balance
        
        print(f"📊 Προηγούμενο υπόλοιπο: {previous_balance}€")
        print(f"💰 Πληρωμές Αυγούστου: {total_august_payments}€")
        print(f"📋 Μηνιαία οφειλή: {monthly_due}€")
        print(f"🔄 Μηνιαίο υπόλοιπο: {monthly_balance}€ ({total_august_payments} - {monthly_due})")
        print(f"🏦 Καθολικό υπόλοιπο: {global_balance}€ ({previous_balance} + {monthly_balance})")
        
        print("\n" + "=" * 50)
        
        # 8. Σύγκριση με το υπάρχον current_balance
        print("🔍 ΣΥΓΚΡΙΣΗ ΜΕ ΥΠΑΡΧΟΝ ΣΥΣΤΗΜΑ")
        
        apartment.refresh_from_db()
        current_system_balance = apartment.current_balance or Decimal('0.00')
        print(f"💾 Current balance από DB: {current_system_balance}€")
        print(f"🧮 Υπολογισμένο καθολικό: {global_balance}€")
        
        if abs(current_system_balance - global_balance) < Decimal('0.01'):
            print("✅ Τα υπόλοιπα ταιριάζουν!")
        else:
            print(f"❌ Διαφορά: {abs(current_system_balance - global_balance)}€")
        
        print("\n" + "=" * 50)
        print("🎯 ΣΥΜΠΕΡΑΣΜΑΤΑ")
        
        # Ελέγχει αν το προηγούμενο υπόλοιπο είναι 38,13€ όπως υποπτεύεται ο χρήστης
        if abs(previous_balance - Decimal('38.13')) < Decimal('0.01'):
            print(f"✅ Το προηγούμενο υπόλοιπο είναι όντως 38,13€")
        else:
            print(f"❌ Το προηγούμενο υπόλοιπο ΔΕΝ είναι 38,13€, είναι {previous_balance}€")
        
        print("\nΣτο UI θα πρέπει να εμφανίζεται:")
        print(f"📊 Προηγ. Υπόλοιπο: {previous_balance}€")
        print(f"🔄 Υπόλοιπο Μήνα: {monthly_balance}€")
        print(f"🏦 Καθολικό Υπόλοιπο: {global_balance}€")

if __name__ == "__main__":
    verify_previous_balance()
