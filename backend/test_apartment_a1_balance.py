#!/usr/bin/env python3
"""
Έλεγχος υπολογισμού υπολοίπου για διαμέρισμα Α1
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_apartment_a1_balance():
    """Έλεγχος υπολογισμού υπολοίπου για διαμέρισμα Α1"""
    
    with schema_context('demo'):
        from apartments.models import Apartment
        from financial.models import Payment, Transaction, Expense
        
        print("🔍 ΕΛΕΓΧΟΣ ΥΠΟΛΟΓΙΣΜΟΥ ΥΠΟΛΟΙΠΟΥ - ΔΙΑΜΕΡΙΣΜΑ Α1")
        print("=" * 60)
        
        # 1. Εύρεση διαμερίσματος Α1
        try:
            apartment = Apartment.objects.get(number='Α1', building_id=1)
            print(f"📍 Διαμέρισμα: {apartment.number}")
            print(f"🏢 Κτίριο: {apartment.building.name}")
            print(f"👤 Ιδιοκτήτης: {apartment.owner_name}")
            print(f"🏠 Ενοικιαστής: {apartment.tenant_name}")
            print(f"📊 Χιλιοστά: {apartment.participation_mills}")
        except Apartment.DoesNotExist:
            print("❌ Διαμέρισμα Α1 δεν βρέθηκε!")
            return
        
        print("\n" + "=" * 60)
        
        # 2. Τρέχων μήνας (Αύγουστος 2025)
        current_month = "2025-08"
        year, mon = map(int, current_month.split('-'))
        month_start = date(year, mon, 1)
        print(f"📅 Τρέχων μήνας: {current_month}")
        print(f"📅 Αρχή μήνα: {month_start}")
        
        print("\n" + "=" * 60)
        
        # 3. Υπολογισμός προηγούμενου υπολοίπου (μέχρι 31/07/2025)
        print("📊 ΥΠΟΛΟΓΙΣΜΟΣ ΠΡΟΗΓΟΥΜΕΝΟΥ ΥΠΟΛΟΙΠΟΥ")
        
        # Όλες οι συναλλαγές μέχρι 31/07/2025
        transactions = Transaction.objects.filter(
            apartment=apartment,
            date__lt=month_start
        ).order_by('date', 'id')
        
        running_balance = Decimal("0.00")
        print("\n📜 Συναλλαγές μέχρι 31/07/2025:")
        
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
        
        print("\n" + "=" * 60)
        
        # 4. Υπολογισμός τρέχοντος μήνα (Αύγουστος 2025)
        print("📊 ΥΠΟΛΟΓΙΣΜΟΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ")
        
        # Δαπάνες Αυγούστου 2025
        august_expenses = Expense.objects.filter(
            building=apartment.building,
            date__gte=month_start
        )
        
        total_august_expenses = Decimal("0.00")
        print("\n📋 Δαπάνες Αυγούστου 2025:")
        
        for expense in august_expenses:
            # Υπολογισμός μεριδίου βάσει χιλιοστών
            total_mills = sum(apt.participation_mills or 0 for apt in Apartment.objects.filter(building=apartment.building))
            if total_mills > 0:
                share_amount = expense.amount * (Decimal(str(apartment.participation_mills or 0)) / Decimal(str(total_mills)))
            else:
                share_amount = expense.amount / Apartment.objects.filter(building=apartment.building).count()
            
            total_august_expenses += share_amount
            print(f"   • {expense.title}: {share_amount:,.2f}€ (συνολικό: {expense.amount:,.2f}€)")
        
        print(f"\n💰 Συνολικές δαπάνες Αυγούστου: {total_august_expenses:,.2f}€")
        
        # Πληρωμές Αυγούστου 2025
        august_payments = Payment.objects.filter(
            apartment=apartment,
            date__gte=month_start
        ).order_by('date', 'id')
        
        total_august_payments = Decimal("0.00")
        print("\n💵 Πληρωμές Αυγούστου 2025:")
        
        for payment in august_payments:
            total_august_payments += payment.amount
            print(f"   • {payment.date}: {payment.amount:,.2f}€ ({payment.get_method_display()})")
        
        print(f"\n💰 Συνολικές πληρωμές Αυγούστου: {total_august_payments:,.2f}€")
        
        print("\n" + "=" * 60)
        
        # 5. Τελικοί υπολογισμοί
        print("🧮 ΤΕΛΙΚΟΙ ΥΠΟΛΟΓΙΣΜΟΙ")
        
        monthly_balance = total_august_payments - total_august_expenses
        global_balance = previous_balance + monthly_balance
        
        print(f"📊 Προηγούμενο υπόλοιπο: {previous_balance:,.2f}€")
        print(f"💰 Πληρωμές Αυγούστου: {total_august_payments:,.2f}€")
        print(f"📋 Δαπάνες Αυγούστου: {total_august_expenses:,.2f}€")
        print(f"🔄 Μηνιαίο υπόλοιπο: {monthly_balance:,.2f}€ ({total_august_payments:,.2f} - {total_august_expenses:,.2f})")
        print(f"🏦 Καθολικό υπόλοιπο: {global_balance:,.2f}€ ({previous_balance:,.2f} + {monthly_balance:,.2f})")
        
        print("\n" + "=" * 60)
        
        # 6. Σύγκριση με το υπάρχον current_balance
        print("🔍 ΣΥΓΚΡΙΣΗ ΜΕ ΥΠΑΡΧΟΝ ΣΥΣΤΗΜΑ")
        
        apartment.refresh_from_db()
        current_system_balance = apartment.current_balance or Decimal("0.00")
        print(f"💾 Current balance από DB: {current_system_balance:,.2f}€")
        print(f"🧮 Υπολογισμένο καθολικό: {global_balance:,.2f}€")
        
        if abs(current_system_balance - global_balance) < Decimal("0.01"):
            print("✅ Τα υπόλοιπα ταιριάζουν!")
        else:
            print(f"❌ Διαφορά: {abs(current_system_balance - global_balance):,.2f}€")
        
        print("\n" + "=" * 60)
        print("🎯 ΣΥΜΠΕΡΑΣΜΑΤΑ")
        
        # Ελέγχει αν το προηγούμενο υπόλοιπο είναι 0,00€ όπως αναμένεται
        if abs(previous_balance) < Decimal("0.01"):
            print("✅ Το προηγούμενο υπόλοιπο είναι όντως 0,00€")
        else:
            print(f"❌ Το προηγούμενο υπόλοιπο ΔΕΝ είναι 0,00€, είναι {previous_balance:,.2f}€")
        
        print("\nΣτο UI θα πρέπει να εμφανίζεται:")
        print(f"📊 Προηγ. Υπόλοιπο: {previous_balance:,.2f}€")
        print(f"📋 Μηνιαία Οφειλή: {total_august_expenses:,.2f}€")
        print(f"🔄 Υπόλοιπο Μήνα: {monthly_balance:,.2f}€")
        print(f"🏦 Καθολικό Υπόλοιπο: {global_balance:,.2f}€")

if __name__ == "__main__":
    test_apartment_a1_balance()
