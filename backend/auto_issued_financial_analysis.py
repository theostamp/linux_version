#!/usr/bin/env python3
"""
Οικονομική Ανάλυση Αραχώβης 12 με Auto-Issued Logic
Αναλύει πως προκύπτει το ποσό 334,85 € με τη νέα λογική που όλες οι δαπάνες θεωρούνται εκδοθείσες
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
from django.db.models import Sum

def print_header(title, symbol="="):
    """Print formatted header"""
    print(f"\n{symbol * 60}")
    print(f" {title} ")
    print(f"{symbol * 60}")

def print_subheader(title, symbol="-"):
    """Print formatted subheader"""
    print(f"\n{symbol * 40}")
    print(f" {title} ")
    print(f"{symbol * 40}")

def format_currency(amount):
    """Format amount as EUR currency"""
    if amount is None:
        return "0,00 €"
    return f"{amount:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

def analyze_auto_issued_logic():
    """Ανάλυση με τη νέα λογική auto-issued"""
    
    with schema_context('demo'):
        print_header("🏢 ΟΙΚΟΝΟΜΙΚΗ ΑΝΑΛΥΣΗ ΑΡΑΧΩΒΗΣ 12 - AUTO ISSUED LOGIC")
        print(f"📅 Ημερομηνία: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print("🔄 Λογική: Όλες οι δαπάνες auto-issued, άμεση ενημέρωση υπολοίπων")
        
        try:
            # Import models
            from financial.models import Expense, Payment, Transaction
            from apartments.models import Apartment
            
            # Find Αραχώβης 12 apartments
            apartments = Apartment.objects.filter(
                building__address__icontains="Αραχώβης"
            )
            
            if apartments.count() == 0:
                print("❌ Δεν βρέθηκαν διαμερίσματα για Αραχώβης 12")
                return
                
            building = apartments.first().building
            print(f"✅ Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            
            # Check what data exists
            total_expenses_building = Expense.objects.filter(building=building).count()
            total_payments_building = Payment.objects.filter(apartment__building=building).count()
            total_transactions_building = Transaction.objects.filter(apartment__building=building).count()
            
            print("\n📊 ΔΙΑΘΕΣΙΜΑ ΔΕΔΟΜΕΝΑ:")
            print(f"   💸 Συνολικές δαπάνες: {total_expenses_building}")
            print(f"   💰 Συνολικές πληρωμές: {total_payments_building}")
            print(f"   💳 Συνολικές συναλλαγές: {total_transactions_building}")
            
            if total_expenses_building == 0 and total_payments_building == 0 and total_transactions_building == 0:
                print("\n⚠️ ΣΗΜΑΝΤΙΚΟ: Δεν υπάρχουν οικονομικά δεδομένα για το κτίριο!")
                print("   Το ποσό 334,85 € πιθανότατα προέρχεται από:")
                print("   1. Υπολογισμό στο frontend")
                print("   2. Προκαθορισμένα ποσά κοινοχρήστων") 
                print("   3. Εκτίμηση βάσει άλλων κτιρίων")
                print("   4. Template ή default τιμές")
                return
            
            # 1. EXPENSE ANALYSIS - όλες θεωρούνται issued
            print_header("💸 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ (AUTO-ISSUED)")
            
            # Current month expenses (February 2025)
            feb_2025 = date(2025, 2, 1)
            feb_expenses = Expense.objects.filter(
                building=building,
                date__year=feb_2025.year,
                date__month=feb_2025.month
            ).order_by('-date')
            
            print(f"📅 Δαπάνες Φεβρουαρίου 2025: {feb_expenses.count()}")
            feb_total = Decimal('0')
            
            for expense in feb_expenses:
                print(f"   💸 {expense.title}: {format_currency(expense.amount)}")
                print(f"      📅 {expense.date} | 🏷️ {expense.category}")
                print(f"      📊 Κατανομή: {expense.distribution_type}")
                feb_total += expense.amount
            
            print(f"\n💰 ΣΥΝΟΛΟ ΦΕΒΡΟΥΑΡΙΟΥ: {format_currency(feb_total)}")
            
            # All building expenses (recent months)
            all_expenses = Expense.objects.filter(building=building).order_by('-date')[:20]
            
            print_subheader("📊 ΠΡΟΣΦΑΤΕΣ ΔΑΠΑΝΕΣ (Τελευταίες 20)")
            total_recent = Decimal('0')
            
            for expense in all_expenses:
                print(f"   💸 {expense.title}: {format_currency(expense.amount)}")
                print(f"      📅 {expense.date} | 🏷️ {expense.category}")
                total_recent += expense.amount
                
            print(f"\n💰 ΣΥΝΟΛΟ ΠΡΟΣΦΑΤΩΝ: {format_currency(total_recent)}")
            
            # 2. TRANSACTION ANALYSIS 
            print_header("💳 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ")
            
            # Get recent transactions for all apartments
            all_transactions = Transaction.objects.filter(
                apartment__building=building
            ).order_by('-date')[:30]
            
            print(f"📊 Τελευταίες συναλλαγές: {all_transactions.count()}")
            
            credits_total = Decimal('0')
            debits_total = Decimal('0')
            
            for trans in all_transactions:
                trans_type = "🟢 Πίστωση" if trans.amount > 0 else "🔴 Χρέωση"
                print(f"   {trans_type}: {format_currency(abs(trans.amount))}")
                print(f"      🏠 Διαμ. {trans.apartment.apartment_number} | 📅 {trans.date}")
                print(f"      📝 {trans.description}")
                
                if trans.amount > 0:
                    credits_total += trans.amount
                else:
                    debits_total += abs(trans.amount)
            
            print("\n💰 ΣΥΝΟΛΑ ΣΥΝΑΛΛΑΓΩΝ:")
            print(f"   🟢 Πιστώσεις: {format_currency(credits_total)}")
            print(f"   🔴 Χρεώσεις: {format_currency(debits_total)}")
            print(f"   ⚖️ Καθαρό: {format_currency(credits_total - debits_total)}")
            
            # 3. BALANCE PER APARTMENT
            print_header("⚖️ ΥΠΟΛΟΙΠΑ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
            
            total_building_balance = Decimal('0')
            positive_balances = []
            negative_balances = []
            zero_balances = []
            
            for apt in apartments.order_by('number'):
                apt_transactions = Transaction.objects.filter(apartment=apt)
                balance = apt_transactions.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
                
                print(f"\n🏠 Διαμέρισμα {apt.number}:")
                print(f"   👤 {apt.owner_name or 'Μη καθορισμένος'}")
                print(f"   📊 Χιλιοστά: {apt.participation_mills or 'Μη καθορισμένα'}")
                print(f"   💰 Υπόλοιπο: {format_currency(balance)}")
                
                if balance > Decimal('0.01'):
                    print("   ✅ Πιστωτικό υπόλοιπο")
                    positive_balances.append(balance)
                elif balance < Decimal('-0.01'):
                    print("   ⚠️ Χρεωστικό υπόλοιπο")
                    negative_balances.append(abs(balance))
                else:
                    print("   ⚖️ Μηδενικό υπόλοιπο")
                    zero_balances.append(balance)
                
                total_building_balance += balance
            
            # 4. FINANCIAL SUMMARY
            print_header("🔍 ΟΙΚΟΝΟΜΙΚΗ ΣΥΝΟΨΗ")

            print(f"🏠 Διαμερίσματα: {apartments.count()}")

            # Calculate per apartment
            if apartments.count() > 0:
                per_apartment = feb_total / apartments.count()
                print(f"💡 Μέσο ποσό ανά διαμέρισμα: {format_currency(per_apartment)}")

            # Check negative balances
            total_negative = sum(negative_balances) if negative_balances else Decimal('0')
            print(f"💳 Συνολικά χρεωστικά υπόλοιπα: {format_currency(total_negative)}")
            
            # 5. DETAILED BREAKDOWN
            print_subheader("📊 ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ")
            
            print(f"💸 Δαπάνες Φεβρουαρίου: {format_currency(feb_total)}")
            print(f"💰 Συνολικό υπόλοιπο κτιρίου: {format_currency(total_building_balance)}")
            print(f"⚠️ Συνολικά χρεωστικά: {format_currency(total_negative)}")
            print(f"✅ Συνολικά πιστωτικά: {format_currency(sum(positive_balances) if positive_balances else Decimal('0'))}")
            print(f"⚖️ Μηδενικά υπόλοιπα: {len(zero_balances)}")
            
            # Calculate monthly common expenses per apartment based on participation
            total_mills = sum(apt.participation_mills for apt in apartments if apt.participation_mills) or 1000
            print("\n📊 ΚΑΤΑΝΟΜΗ ΒΑΣΕΙ ΧΙΛΙΟΣΤΩΝ:")
            print(f"   Συνολικά χιλιοστά: {total_mills}")
            
            if feb_total > 0:
                for apt in apartments[:5]:  # Show first 5 as example
                    if apt.participation_mills:
                        apt_share = feb_total * apt.participation_mills / total_mills
                        print(f"   Διαμ. {apt.number}: {format_currency(apt_share)} ({apt.participation_mills} χιλιοστά)")
            
            # 6. CONCLUSION
            print_header("📋 ΣΥΜΠΕΡΑΣΜΑΤΑ")
            
            print("🏢 Κτίριο: Αραχώβης 12")
            print(f"🏠 Διαμερίσματα: {apartments.count()}")
            print(f"🎯 Υποχρεώσεις περιόδου: {format_currency(target_amount)}")
            
            if abs(feb_total - target_amount) < Decimal('10'):
                print("\n✅ ΤΟ ΠΟΣΟ 334,85 € ΠΡΟΕΡΧΕΤΑΙ ΑΠΟ:")
                print("   📸 Δαπάνες Φεβρουαρίου 2025")
                print("   🔄 Auto-issued logic: Άμεση εφαρμογή στα υπόλοιπα")
                print("   📊 Κατανομή βάσει χιλιοστών συμμετοχής")
            else:
                print("\n🔍 ΤΟ ΠΟΣΟ 334,85 € ΠΙΘΑΝΟΤΑΤΑ ΠΡΟΕΡΧΕΤΑΙ ΑΠΟ:")
                print("   📸 Συνδυασμό δαπανών και εκκρεμοτήτων")
                print("   🔄 Υπολογισμό κοινοχρήστων προηγούμενων περιόδων")
                print("   📊 Αυτόματη ενημέρωση λόγω auto-issued logic")
            
            print("\n🚀 ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΕΝΕΡΓΕΙΕΣ:")
            print("   1. Έλεγχος υπολογισμού κοινοχρήστων τρέχουσας περιόδου")
            print("   2. Επιβεβαίωση εκκρεμών πληρωμών")
            print("   3. Επαλήθευση auto-issued logic στο frontend")
            print("   4. Έλεγχος χιλιοστών συμμετοχής")
            
        except Exception as e:
            print(f"❌ Σφάλμα: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    analyze_auto_issued_logic()
