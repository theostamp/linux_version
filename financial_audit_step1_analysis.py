#!/usr/bin/env python3
"""
Financial Audit - Step 1: Ανάλυση Τρέχουσας Δομής
==================================================

Αυτό το script εξετάζει τη βασική δομή των οικονομικών δεδομένων
και παρέχει μια επισκόπηση του πώς λειτουργεί το σύστημα.

Χρήση:
docker cp financial_audit_step1_analysis.py linux_version-backend-1:/app/
docker exec -it linux_version-backend-1 python /app/financial_audit_step1_analysis.py
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
from django.db.models import Sum, Count
from financial.models import Expense, Payment, Transaction
from buildings.models import Building
from apartments.models import Apartment

def analyze_financial_structure():
    """Ανάλυση της βασικής δομής των οικονομικών δεδομένων"""
    
    print("🔍 FINANCIAL AUDIT - STEP 1: ΑΝΑΛΥΣΗ ΤΡΕΧΟΥΣΑΣ ΔΟΜΗΣ")
    print("=" * 80)
    
    try:
        with schema_context('demo'):
            
            # 1. Εξέταση κτιρίων
            print("\n🏢 1. ΕΞΕΤΑΣΗ ΚΤΙΡΙΩΝ")
            print("-" * 40)
            
            buildings = Building.objects.all()
            print(f"Συνολικά κτίρια: {buildings.count()}")
            
            for building in buildings:
                print(f"\n📊 Κτίριο: {building.name} (ID: {building.id})")
                print(f"   📍 Διεύθυνση: {building.address}")
                print(f"   💰 Τρέχον αποθεματικό: {building.current_reserve or 0}€")
                print(f"   🎯 Στόχος αποθεματικού: {building.reserve_fund_goal or 0}€")
                print(f"   📅 Διάρκεια αποθεματικού: {building.reserve_fund_duration_months or 0} μήνες")
                print(f"   🗓️ Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Μη ορισμένη'}")
                print(f"   💸 Δαπάνη διαχείρισης ανά διαμέρισμα: {building.management_fee_per_apartment or 0}€")
                
                # Εξέταση διαμερισμάτων
                apartments = Apartment.objects.filter(building=building)
                total_mills = sum(apt.participation_mills or 0 for apt in apartments)
                print(f"   🏠 Διαμερίσματα: {apartments.count()}")
                print(f"   📊 Συνολικά χιλιοστά: {total_mills}")
                
                if total_mills != 1000:
                    print("   ⚠️  ΠΡΟΣΟΧΗ: Τα χιλιοστά δεν ισούνται με 1000!")
            
            # 2. Εξέταση δαπανών
            print("\n💸 2. ΕΞΕΤΑΣΗ ΔΑΠΑΝΩΝ")
            print("-" * 40)
            
            expenses = Expense.objects.all()
            print(f"Συνολικές δαπάνες: {expenses.count()}")
            
            # Ανάλυση ανά τύπο
            expense_types = expenses.values('expense_type').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            
            print("\n📊 Ανάλυση ανά τύπο δαπάνης:")
            for exp_type in expense_types:
                print(f"   {exp_type['expense_type']}: {exp_type['count']} δαπάνες, {exp_type['total']}€")
            
            # Ανάλυση ανά κατηγορία
            expense_categories = expenses.values('category').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('-total')
            
            print("\n📊 Top 10 κατηγορίες δαπανών:")
            for i, cat in enumerate(expense_categories[:10], 1):
                print(f"   {i}. {cat['category']}: {cat['count']} δαπάνες, {cat['total']}€")
            
            # Ανάλυση ανά τρόπο κατανομής
            distribution_types = expenses.values('distribution_type').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            
            print("\n📊 Ανάλυση ανά τρόπο κατανομής:")
            for dist_type in distribution_types:
                print(f"   {dist_type['distribution_type']}: {dist_type['count']} δαπάνες, {dist_type['total']}€")
            
            # 3. Εξέταση εισπράξεων
            print("\n💰 3. ΕΞΕΤΑΣΗ ΕΙΣΠΡΑΞΕΩΝ")
            print("-" * 40)
            
            payments = Payment.objects.all()
            print(f"Συνολικές εισπράξεις: {payments.count()}")
            
            # Ανάλυση ανά τύπο πληρωμής
            payment_types = payments.values('payment_type').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            
            print("\n📊 Ανάλυση ανά τύπο πληρωμής:")
            for pay_type in payment_types:
                print(f"   {pay_type['payment_type']}: {pay_type['count']} πληρωμές, {pay_type['total']}€")
            
            # Ανάλυση ανά τρόπο πληρωμής
            payment_methods = payments.values('method').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            
            print("\n📊 Ανάλυση ανά τρόπο πληρωμής:")
            for method in payment_methods:
                print(f"   {method['method']}: {method['count']} πληρωμές, {method['total']}€")
            
            # 4. Εξέταση συναλλαγών
            print("\n💳 4. ΕΞΕΤΑΣΗ ΣΥΝΑΛΛΑΓΩΝ")
            print("-" * 40)
            
            transactions = Transaction.objects.all()
            print(f"Συνολικές συναλλαγές: {transactions.count()}")
            
            # Ανάλυση ανά τύπο συναλλαγής
            transaction_types = transactions.values('type').annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            
            print("\n📊 Ανάλυση ανά τύπο συναλλαγής:")
            for trans_type in transaction_types:
                print(f"   {trans_type['type']}: {trans_type['count']} συναλλαγές, {trans_type['total']}€")
            
            # 5. Χρονική ανάλυση
            print("\n📅 5. ΧΡΟΝΙΚΗ ΑΝΑΛΥΣΗ")
            print("-" * 40)
            
            # Ανάλυση ανά μήνα
            monthly_expenses = expenses.extra(
                select={'month': "DATE_TRUNC('month', date)"}
            ).values('month').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('month')
            
            print("\n📊 Δαπάνες ανά μήνα:")
            for month_data in monthly_expenses:
                month_str = month_data['month'].strftime('%Y-%m')
                print(f"   {month_str}: {month_data['count']} δαπάνες, {month_data['total']}€")
            
            monthly_payments = payments.extra(
                select={'month': "DATE_TRUNC('month', date)"}
            ).values('month').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('month')
            
            print("\n📊 Εισπράξεις ανά μήνα:")
            for month_data in monthly_payments:
                month_str = month_data['month'].strftime('%Y-%m')
                print(f"   {month_str}: {month_data['count']} εισπράξεις, {month_data['total']}€")
            
            # 6. Έλεγχος ασυνέπειας
            print("\n🔍 6. ΕΛΕΓΧΟΣ ΑΣΥΝΕΠΕΙΑΣ")
            print("-" * 40)
            
            # Έλεγχος διπλών δαπανών
            duplicate_expenses = expenses.values('title', 'amount', 'date').annotate(
                count=Count('id')
            ).filter(count__gt=1)
            
            if duplicate_expenses.exists():
                print("⚠️  Βρέθηκαν πιθανές διπλές δαπάνες:")
                for dup in duplicate_expenses:
                    print(f"   - {dup['title']}: {dup['amount']}€ στις {dup['date']} ({dup['count']} φορές)")
            else:
                print("✅ Δεν βρέθηκαν διπλές δαπάνες")
            
            # Έλεγχος αρνητικών ποσών
            negative_expenses = expenses.filter(amount__lt=0)
            if negative_expenses.exists():
                print(f"⚠️  Βρέθηκαν {negative_expenses.count()} δαπάνες με αρνητικό ποσό")
            else:
                print("✅ Όλες οι δαπάνες έχουν θετικό ποσό")
            
            negative_payments = payments.filter(amount__lt=0)
            if negative_payments.exists():
                print(f"⚠️  Βρέθηκαν {negative_payments.count()} εισπράξεις με αρνητικό ποσό")
            else:
                print("✅ Όλες οι εισπράξεις έχουν θετικό ποσό")
            
            # 7. Συνοπτική στατιστική
            print("\n📊 7. ΣΥΝΟΠΤΙΚΗ ΣΤΑΤΙΣΤΙΚΗ")
            print("-" * 40)
            
            total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            total_transactions = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            print(f"💰 Συνολικές δαπάνες: {total_expenses}€")
            print(f"💰 Συνολικές εισπράξεις: {total_payments}€")
            print(f"💰 Συνολικές συναλλαγές: {total_transactions}€")
            print(f"💰 Διαφορά (εισπράξεις - δαπάνες): {total_payments - total_expenses}€")
            
            # Έλεγχος αν η διαφορά ταιριάζει με το αποθεματικό
            for building in buildings:
                calculated_reserve = total_payments - total_expenses
                stored_reserve = building.current_reserve or Decimal('0.00')
                difference = abs(calculated_reserve - stored_reserve)
                
                print(f"\n🏢 Κτίριο {building.name}:")
                print(f"   Υπολογισμένο αποθεματικό: {calculated_reserve}€")
                print(f"   Αποθηκευμένο αποθεματικό: {stored_reserve}€")
                print(f"   Διαφορά: {difference}€")
                
                if difference > Decimal('0.01'):
                    print("   ⚠️  ΠΡΟΣΟΧΗ: Υπάρχει διαφορά στο αποθεματικό!")
                else:
                    print("   ✅ Το αποθεματικό είναι σωστό")
            
            print("\n✅ Η ανάλυση ολοκληρώθηκε επιτυχώς!")
            
    except Exception as e:
        print(f"❌ Σφάλμα κατά την ανάλυση: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_financial_structure()
