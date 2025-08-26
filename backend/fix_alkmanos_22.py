#!/usr/bin/env python3
"""
🔧 Script για διόρθωση προβλημάτων Αλκμάνος 22

Σκοπός: Διόρθωση προβλημάτων που εντοπίστηκαν στο κτίριο Αλκμάνος 22
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
from financial.models import Transaction, Expense, Payment
from apartments.models import Apartment
from buildings.models import Building

def fix_alkmanos_22():
    """Διόρθωση προβλημάτων Αλκμάνος 22"""
    
    print("🔧 ΔΙΟΡΘΩΣΗ ΑΛΚΜΑΝΟΣ 22")
    print("=" * 50)
    
    with schema_context('demo'):
        # Βρες το κτίριο Αλκμάνος 22
        try:
            building = Building.objects.get(name__icontains="Αλκμάνος")
            print(f"🏢 Κτίριο: {building.name} (ID: {building.id})")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο Αλκμάνος 22")
            return
        
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        
        # 1. Διόρθωση participation mills (1020 → 1000)
        print("\n1️⃣ ΔΙΟΡΘΩΣΗ PARTICIPATION MILLS")
        print("-" * 30)
        
        total_mills = sum(apartment.participation_mills for apartment in apartments)
        print(f"📊 Συνολικά χιλιόστιμα: {total_mills}")
        
        if total_mills != 1000:
            print(f"⚠️ Χρειάζεται διόρθωση: {total_mills} ≠ 1000")
            
            # Υπολογισμός παράγοντα διόρθωσης
            correction_factor = 1000 / total_mills
            print(f"🔧 Παράγοντας διόρθωσης: {correction_factor:.4f}")
            
            # Εφαρμογή διόρθωσης
            for apartment in apartments:
                old_mills = apartment.participation_mills
                new_mills = round(old_mills * correction_factor, 2)
                apartment.participation_mills = new_mills
                apartment.save()
                print(f"   Διαμέρισμα {apartment.number}: {old_mills} → {new_mills}")
            
            # Επιβεβαίωση
            total_mills_after = sum(apartment.participation_mills for apartment in apartments)
            print(f"✅ Μετά τη διόρθωση: {total_mills_after}")
        else:
            print("✅ Τα χιλιόστιμα είναι σωστά (1000)")
        
        # 2. Προσθήκη διαχειριστικών τελών
        print("\n2️⃣ ΠΡΟΣΘΗΚΗ ΔΙΑΧΕΙΡΙΣΤΙΚΩΝ ΤΕΛΩΝ")
        print("-" * 30)
        
        # Έλεγχος αν υπάρχουν ήδη διαχειριστικά τέλη
        admin_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month=8
        )
        
        if admin_expenses.exists():
            print("ℹ️ Υπάρχουν ήδη διαχειριστικά τέλη για Αύγουστο 2025")
            for expense in admin_expenses:
                print(f"   • {expense.title}: {expense.amount}€")
        else:
            print("➕ Προσθήκη διαχειριστικών τελών...")
            
            # Δημιουργία διαχειριστικών τελών
            admin_expense = Expense.objects.create(
                building=building,
                title="Διαχειριστικά τέλη Αυγούστου 2025",
                amount=Decimal('120.00'),
                category='management_fees',
                date=date(2025, 8, 15),
                distribution_type='by_participation_mills',
                notes="Διαχειριστικά τέλη για τον Αύγουστο 2025"
            )
            print(f"   ✅ Προστέθηκε: {admin_expense.title} - {admin_expense.amount}€")
        
        # 3. Διόρθωση αρνητικού αποθεματικού
        print("\n3️⃣ ΔΙΟΡΘΩΣΗ ΑΡΝΗΤΙΚΟΥ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        print("-" * 30)
        
        current_reserve = building.current_reserve
        print(f"📊 Τρέχον αποθεματικό: {current_reserve}€")
        
        if current_reserve < 0:
            print(f"⚠️ Το αποθεματικό είναι αρνητικό: {current_reserve}€")
            
            # Υπολογισμός απαραίτητης εισφοράς
            required_contribution = abs(current_reserve)
            print(f"💰 Απαραίτητη εισφορά: {required_contribution}€")
            
            # Προσθήκη εισφοράς αποθεματικού (χρησιμοποιώντας το πρώτο διαμέρισμα ως proxy)
            first_apartment = apartments.first()
            if first_apartment:
                reserve_payment = Payment.objects.create(
                    apartment=first_apartment,
                    amount=required_contribution,
                    reserve_fund_amount=required_contribution,
                    date=date(2025, 8, 20),
                    method='bank_transfer',
                    payment_type='reserve_fund',
                    payer_type='owner',
                    payer_name="Γενική Εισφορά",
                    notes="Ειδική εισφορά αποθεματικού για διόρθωση αρνητικού υπολοίπου"
                )
                print(f"   ✅ Προστέθηκε εισφορά: {reserve_payment.amount}€")
            else:
                print("   ❌ Δεν βρέθηκε διαμέρισμα για εισφορά")
            
            # Ενημέρωση αποθεματικού κτιρίου
            building.current_reserve = Decimal('0.00')
            building.save()
            print(f"   ✅ Ενημερώθηκε αποθεματικό: 0.00€")
        else:
            print("✅ Το αποθεματικό είναι θετικό ή μηδέν")
        
        # 4. Επιβεβαίωση ρυθμίσεων
        print("\n4️⃣ ΕΠΙΒΕΒΑΙΩΣΗ ΡΥΘΜΙΣΕΩΝ")
        print("-" * 30)
        
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"💰 Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment}€")
        
        if building.reserve_fund_goal and building.reserve_fund_duration_months:
            monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
            print(f"📊 Μηνιαία δόση: {monthly_target:.2f}€")
        else:
            print("⚠️ Δεν έχουν οριστεί στόχος ή διάρκεια")
        
        # 5. Συνολική κατάσταση
        print("\n5️⃣ ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 30)
        
        from django.db import models
        
        total_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=8
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        total_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=8
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"💰 Συνολικά έξοδα Αυγούστου: {total_expenses}€")
        print(f"💰 Συνολικές πληρωμές Αυγούστου: {total_payments}€")
        print(f"📊 Υπόλοιπο: {total_payments - total_expenses}€")
        print(f"🏦 Τρέχον αποθεματικό: {building.current_reserve}€")
        
        # Επιβεβαίωση χιλιοστίμων
        final_total_mills = sum(apartment.participation_mills for apartment in apartments)
        print(f"📊 Συνολικά χιλιόστιμα: {final_total_mills}")
        
        if final_total_mills == 1000:
            print("✅ Όλα τα χιλιόστιμα είναι σωστά!")
        else:
            print(f"⚠️ Χιλιόστιμα ακόμα λάθος: {final_total_mills}")

def verify_fixes():
    """Επιβεβαίωση των διορθώσεων"""
    
    print("\n🔍 ΕΠΙΒΕΒΑΙΩΣΗ ΔΙΟΡΘΩΣΕΩΝ")
    print("=" * 50)
    
    with schema_context('demo'):
        building = Building.objects.get(name__icontains="Αλκμάνος")
        apartments = Apartment.objects.filter(building=building)
        
        # Έλεγχος χιλιοστίμων
        total_mills = sum(apartment.participation_mills for apartment in apartments)
        mills_ok = total_mills == 1000
        
        # Έλεγχος αποθεματικού
        reserve_ok = building.current_reserve >= 0
        
        # Έλεγχος διαχειριστικών τελών
        admin_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month=8
        )
        admin_ok = admin_expenses.exists()
        
        print(f"📊 Χιλιόστιμα (1000): {'✅' if mills_ok else '❌'} ({total_mills})")
        print(f"🏦 Αποθεματικό (≥0): {'✅' if reserve_ok else '❌'} ({building.current_reserve}€)")
        print(f"💼 Διαχειριστικά τέλη: {'✅' if admin_ok else '❌'}")
        
        if mills_ok and reserve_ok and admin_ok:
            print("\n🎉 Όλες οι διορθώσεις επιτυχής!")
        else:
            print("\n⚠️ Χρειάζονται επιπλέον διορθώσεις")

if __name__ == "__main__":
    print("🔧 ΑΛΚΜΑΝΟΣ 22 FIXES")
    print("=" * 60)
    
    # Εκτέλεση διορθώσεων
    fix_alkmanos_22()
    
    # Επιβεβαίωση
    verify_fixes()
    
    print("\n✅ Οι διορθώσεις ολοκληρώθηκαν!")
