#!/usr/bin/env python3

import os
import sys
import django
from datetime import datetime, date
from decimal import Decimal

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def check_august_payments():
    with schema_context('demo'):
        from apartments.models import Apartment
        from financial.models import Payment, Transaction
        
        print("🔍 ΕΛΕΓΧΟΣ ΠΛΗΡΩΜΩΝ ΑΥΓΟΥΣΤΟΥ 2025")
        print("=" * 60)
        
        # Διαμέρισμα 3
        apt3 = Apartment.objects.get(number='3', building_id=4)
        print(f"🏠 Διαμέρισμα: {apt3.number}")
        print(f"👤 Ενοικιαστής: {apt3.tenant_name}")
        print(f"💰 Καθολικό υπόλοιπο: {apt3.current_balance}€")
        
        print("\n" + "=" * 60)
        print("📅 ΠΛΗΡΩΜΕΣ ΑΥΓΟΥΣΤΟΥ 2025")
        
        # Πληρωμές Αυγούστου 2025
        august_payments = Payment.objects.filter(
            apartment=apt3,
            date__year=2025,
            date__month=8
        ).order_by('date')
        
        if august_payments.exists():
            total_august = Decimal('0.00')
            reserve_august = Decimal('0.00')
            
            for payment in august_payments:
                total_august += payment.amount
                if payment.reserve_fund_amount:
                    reserve_august += payment.reserve_fund_amount
                    
                print(f"💵 {payment.date}: {payment.amount}€ ({payment.get_method_display()})")
                if payment.reserve_fund_amount:
                    print(f"   🏦 Αποθεματικό: {payment.reserve_fund_amount}€")
                print(f"   📝 Σημειώσεις: {payment.notes or 'Κανένα'}")
                
            print(f"\n💰 Συνολικές πληρωμές Αυγούστου: {total_august}€")
            print(f"🏦 Συνολικό αποθεματικό: {reserve_august}€")
            print(f"🔷 Κανονικές πληρωμές: {total_august - reserve_august}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές Αυγούστου 2025")
        
        print("\n" + "=" * 60)
        print("📅 ΠΛΗΡΩΜΕΣ ΙΟΥΛΙΟΥ 2025 (ΠΡΟΗΓ. ΜΗΝΑΣ)")
        
        # Πληρωμές Ιουλίου 2025
        july_payments = Payment.objects.filter(
            apartment=apt3,
            date__year=2025,
            date__month=7
        ).order_by('date')
        
        if july_payments.exists():
            total_july = Decimal('0.00')
            for payment in july_payments:
                total_july += payment.amount
                print(f"💵 {payment.date}: {payment.amount}€ ({payment.get_method_display()})")
                if payment.reserve_fund_amount:
                    print(f"   🏦 Αποθεματικό: {payment.reserve_fund_amount}€")
                    
            print(f"\n💰 Συνολικές πληρωμές Ιουλίου: {total_july}€")
        else:
            print("❌ Δεν βρέθηκαν πληρωμές Ιουλίου 2025")
        
        print("\n" + "=" * 60)
        print("📊 ΌΛΕΣ ΟΙ ΣΥΝΑΛΛΑΓΕΣ")
        
        # Όλες οι συναλλαγές
        all_transactions = Transaction.objects.filter(
            apartment=apt3
        ).order_by('date', 'id')
        
        running_balance = Decimal('0.00')
        print(f"\n📜 Συναλλαγές διαμερίσματος 3:")
        
        for i, trans in enumerate(all_transactions, 1):
            old_balance = running_balance
            
            if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
                running_balance += trans.amount
                direction = "+"
            elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                              'interest_charge', 'penalty_charge']:
                running_balance -= trans.amount
                direction = "-"
            elif trans.type == 'balance_adjustment':
                if trans.balance_after is not None:
                    running_balance = trans.balance_after
                    direction = "→"
            
            print(f"   {i}. {trans.date}: {direction}{trans.amount}€ ({trans.type})")
            print(f"      📝 {trans.description}")
            print(f"      💰 Υπόλοιπο: {old_balance}€ → {running_balance}€")
            print()
        
        print(f"🏦 Τελικό υπόλοιπο από συναλλαγές: {running_balance}€")
        print(f"🏦 Current balance από model: {apt3.current_balance}€")
        
        if abs(running_balance - apt3.current_balance) < Decimal('0.01'):
            print("✅ Τα υπόλοιπα ταιριάζουν!")
        else:
            print(f"❌ Διαφορά: {abs(running_balance - apt3.current_balance)}€")
        
        print("\n" + "=" * 60)
        print("🧮 ΥΠΟΛΟΓΙΣΜΟΣ ΠΡΟΗΓΟΥΜΕΝΟΥ ΥΠΟΛΟΙΠΟΥ")
        
        # Αν έχουμε 38.13€ καθολικό και πληρωμές 38.13€ Αυγούστου
        # τότε το προηγούμενο υπόλοιπο πρέπει να είναι:
        if august_payments.exists():
            # Υπόλοιπο πριν τις πληρωμές Αυγούστου
            august_start = date(2025, 8, 1)
            
            # Συναλλαγές μέχρι 31/07/2025
            july_end_transactions = Transaction.objects.filter(
                apartment=apt3,
                date__lt=august_start
            ).order_by('date', 'id')
            
            previous_balance = Decimal('0.00')
            for trans in july_end_transactions:
                if trans.type in ['common_expense_payment', 'payment_received', 'refund']:
                    previous_balance += trans.amount
                elif trans.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                  'interest_charge', 'penalty_charge']:
                    previous_balance -= trans.amount
                elif trans.type == 'balance_adjustment' and trans.balance_after is not None:
                    previous_balance = trans.balance_after
            
            print(f"📊 Προηγούμενο υπόλοιπο (μέχρι 31/07): {previous_balance}€")
            print(f"💰 Πληρωμές Αυγούστου: {total_august}€")
            print(f"🏦 Αναμενόμενο καθολικό: {previous_balance + total_august}€")
            print(f"🏦 Πραγματικό καθολικό: {apt3.current_balance}€")
            
            # Υπολογισμός μηνιαίας οφειλής (από PaymentSerializer)
            if august_payments.exists():
                from financial.serializers import PaymentSerializer
                serializer = PaymentSerializer()
                monthly_due = serializer.get_monthly_due(august_payments.first())
                
                monthly_balance = total_august - Decimal(str(monthly_due))
                
                print(f"\n📋 Μηνιαία οφειλή Αυγούστου: {monthly_due}€")
                print(f"🔄 Μηνιαίο υπόλοιπο: {monthly_balance}€")
                print(f"🧮 Έλεγχος: {previous_balance} + {monthly_balance} = {previous_balance + monthly_balance}€")

if __name__ == "__main__":
    check_august_payments()
