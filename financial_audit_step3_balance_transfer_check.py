#!/usr/bin/env python3
"""
Financial Audit - Step 3: Έλεγχος Μεταφοράς Υπολοίπων
=====================================================

Αυτό το script ελέγχει αν τα υπολοιπα (χρεωστικά ή πιστωτικά) 
περνούν σωστά τον επόμενο μήνα ως μεταφορά υπολοίπου.

Χρήση:
docker cp financial_audit_step3_balance_transfer_check.py linux_version-backend-1:/app/
docker exec -it linux_version-backend-1 python /app/financial_audit_step3_balance_transfer_check.py
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from collections import defaultdict

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db.models import Sum, Count, Q
from django.utils import timezone
from financial.models import Expense, Payment, Transaction
from buildings.models import Building
from apartments.models import Apartment

def check_balance_transfer():
    """Έλεγχος μεταφοράς υπολοίπων μεταξύ μηνών"""
    
    print("🔍 FINANCIAL AUDIT - STEP 3: ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
    print("=" * 80)
    
    try:
        with schema_context('demo'):
            
            # Επιλογή κτιρίου για έλεγχο
            building = Building.objects.get(id=1)
            print(f"🏢 Έλεγχος κτιρίου: {building.name}")
            
            # Λήψη διαμερισμάτων
            apartments = Apartment.objects.filter(building=building)
            print(f"🏠 Έλεγχος {apartments.count()} διαμερισμάτων")
            
            # Έλεγχος για 6 μήνες (Ιανουάριος - Ιούνιος 2024)
            months = [
                (2024, 1), (2024, 2), (2024, 3), 
                (2024, 4), (2024, 5), (2024, 6)
            ]
            
            print("\n📅 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ ΑΝΑ ΜΗΝΑ")
            print("-" * 60)
            
            issues_found = []
            
            for i, (year, month) in enumerate(months):
                print(f"\n📊 Μήνας: {month}/{year}")
                print(f"   {'='*40}")
                
                # Υπολογισμός υπολοίπου για τον τρέχοντα μήνα
                current_month_start = date(year, month, 1)
                if month == 12:
                    current_month_end = date(year + 1, 1, 1)
                else:
                    current_month_end = date(year, month + 1, 1)
                
                # Δαπάνες του μήνα
                month_expenses = Expense.objects.filter(
                    building=building,
                    date__gte=current_month_start,
                    date__lt=current_month_end
                )
                total_expenses = month_expenses.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                
                # Εισπράξεις του μήνα
                month_payments = Payment.objects.filter(
                    apartment__building=building,
                    date__gte=current_month_start,
                    date__lt=current_month_end
                )
                total_payments = month_payments.aggregate(
                    total=Sum('amount')
                )['total'] or Decimal('0.00')
                
                # Υπολογισμός υπολοίπου μήνα
                month_balance = total_payments - total_expenses
                
                print(f"   💸 Δαπάνες: {total_expenses}€")
                print(f"   💰 Εισπράξεις: {total_payments}€")
                print(f"   📊 Υπόλοιπο μήνα: {month_balance}€")
                
                # Έλεγχος ανά διαμέρισμα
                apartment_balances = {}
                
                for apartment in apartments:
                    # Υπολογισμός υπολοίπου διαμερίσματος για τον μήνα
                    apartment_expenses = Decimal('0.00')
                    apartment_payments = Decimal('0.00')
                    
                    # Δαπάνες διαμερίσματος (κατανομή με χιλιοστά)
                    for expense in month_expenses:
                        if expense.distribution_type == 'by_participation_mills':
                            mills = apartment.participation_mills or 100
                            share = expense.amount * Decimal(str(mills)) / Decimal('1000')
                            apartment_expenses += share
                        elif expense.distribution_type == 'equal_share':
                            share = expense.amount / Decimal(str(apartments.count()))
                            apartment_expenses += share
                    
                    # Εισπράξεις διαμερίσματος
                    apartment_payments = month_payments.filter(
                        apartment=apartment
                    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                    
                    apartment_balance = apartment_payments - apartment_expenses
                    apartment_balances[apartment.id] = apartment_balance
                    
                    print(f"      🏠 {apartment.number}: {apartment_balance}€")
                
                # Έλεγχος μεταφοράς στον επόμενο μήνα
                if i < len(months) - 1:  # Όχι για τον τελευταίο μήνα
                    next_year, next_month = months[i + 1]
                    print(f"\n   🔄 ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΣΤΟΝ ΕΠΟΜΕΝΟ ΜΗΝΑ ({next_month}/{next_year})")
                    
                    # Υπολογισμός υπολοίπου επόμενου μήνα
                    next_month_start = date(next_year, next_month, 1)
                    if next_month == 12:
                        next_month_end = date(next_year + 1, 1, 1)
                    else:
                        next_month_end = date(next_year, next_month + 1, 1)
                    
                    next_month_expenses = Expense.objects.filter(
                        building=building,
                        date__gte=next_month_start,
                        date__lt=next_month_end
                    )
                    next_total_expenses = next_month_expenses.aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00')
                    
                    next_month_payments = Payment.objects.filter(
                        apartment__building=building,
                        date__gte=next_month_start,
                        date__lt=next_month_end
                    )
                    next_total_payments = next_month_payments.aggregate(
                        total=Sum('amount')
                    )['total'] or Decimal('0.00')
                    
                    next_month_balance = next_total_payments - next_total_expenses
                    
                    print(f"      💸 Επόμενος μήνας - Δαπάνες: {next_total_expenses}€")
                    print(f"      💰 Επόμενος μήνας - Εισπράξεις: {next_total_payments}€")
                    print(f"      📊 Επόμενος μήνας - Υπόλοιπο: {next_month_balance}€")
                    
                    # Έλεγχος αν το υπόλοιπο μεταφέρθηκε σωστά
                    expected_next_balance = month_balance + next_month_balance
                    actual_next_balance = next_month_balance
                    
                    if abs(expected_next_balance - actual_next_balance) > Decimal('0.01'):
                        issue = {
                            'month': f"{month}/{year}",
                            'next_month': f"{next_month}/{next_year}",
                            'expected': expected_next_balance,
                            'actual': actual_next_balance,
                            'difference': expected_next_balance - actual_next_balance
                        }
                        issues_found.append(issue)
                        print(f"      ⚠️  ΠΡΟΒΛΗΜΑ: Η μεταφορά υπολοίπου δεν είναι σωστή!")
                        print(f"         Αναμενόμενο: {expected_next_balance}€")
                        print(f"         Πραγματικό: {actual_next_balance}€")
                        print(f"         Διαφορά: {expected_next_balance - actual_next_balance}€")
                    else:
                        print(f"      ✅ Η μεταφορά υπολοίπου είναι σωστή")
            
            # Συνοπτική αναφορά
            print("\n📋 ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ")
            print("=" * 60)
            
            if issues_found:
                print(f"❌ Βρέθηκαν {len(issues_found)} προβλήματα με τη μεταφορά υπολοίπων:")
                for issue in issues_found:
                    print(f"   - Μήνας {issue['month']} → {issue['next_month']}: Διαφορά {issue['difference']}€")
            else:
                print("✅ Δεν βρέθηκαν προβλήματα με τη μεταφορά υπολοίπων")
            
            # Έλεγχος συνολικού υπολοίπου
            print(f"\n🏦 ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΟΥ ΥΠΟΛΟΙΠΟΥ")
            print("-" * 40)
            
            total_expenses = Expense.objects.filter(building=building).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            total_payments = Payment.objects.filter(
                apartment__building=building
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            calculated_total_balance = total_payments - total_expenses
            stored_total_balance = building.current_reserve or Decimal('0.00')
            
            print(f"💰 Συνολικές εισπράξεις: {total_payments}€")
            print(f"💸 Συνολικές δαπάνες: {total_expenses}€")
            print(f"📊 Υπολογισμένο συνολικό υπόλοιπο: {calculated_total_balance}€")
            print(f"🏦 Αποθηκευμένο συνολικό υπόλοιπο: {stored_total_balance}€")
            
            if abs(calculated_total_balance - stored_total_balance) > Decimal('0.01'):
                print(f"⚠️  ΠΡΟΒΛΗΜΑ: Το συνολικό υπόλοιπο δεν είναι σωστό!")
                print(f"   Διαφορά: {calculated_total_balance - stored_total_balance}€")
            else:
                print(f"✅ Το συνολικό υπόλοιπο είναι σωστό")
            
            print("\n✅ Ο έλεγχος μεταφοράς υπολοίπων ολοκληρώθηκε!")
            
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_balance_transfer()
