#!/usr/bin/env python3
"""
Script to investigate why we don't have the missing numbers in the database
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Payment, Apartment
from buildings.models import Building
from django.db.models import Sum
from datetime import datetime

def investigate_missing_data():
    """Investigate why we don't have the missing numbers in the database"""
    
    with schema_context('demo'):
        # Get building data
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Check September 2025 data (August usage)
        selected_month = "2025-09"
        print(f"📅 ΕΡΕΥΝΑ ΓΙΑ: {selected_month} (χρήση Αυγούστου)")
        print("=" * 60)
        
        # 1. INVESTIGATE PREVIOUS OBLIGATIONS (5.000,00€)
        print("🔍 1. ΕΡΕΥΝΑ ΠΑΛΑΙΟΤΕΡΩΝ ΟΦΕΙΛΩΝ (5.000,00€):")
        print("-" * 50)
        
        # Check all payments before September 2025
        previous_payments = Payment.objects.filter(
            apartment__building=building,
            date__lt=selected_month + "-01"
        ).order_by('-date')
        
        print(f"Πληρωμές πριν τον {selected_month}: {previous_payments.count()}")
        
        if previous_payments.exists():
            total_previous = previous_payments.aggregate(total=Sum('amount'))['total'] or 0
            print(f"Συνολικό ποσό παλαιότερων πληρωμών: {total_previous}€")
            
            # Check last 5 payments
            print("\nΤελευταίες 5 πληρωμές:")
            for i, payment in enumerate(previous_payments[:5]):
                print(f"  {i+1}. {payment.date} - Διαμ. {payment.apartment.number}: {payment.amount}€")
        else:
            print("❌ ΔΕΝ ΒΡΕΘΗΚΑΝ παλαιότερες πληρωμές!")
        
        # Check previous_obligations_amount field
        print("\n🔍 Έλεγχος πεδίου 'previous_obligations_amount':")
        payments_with_prev_obligations = Payment.objects.filter(
            apartment__building=building,
            previous_obligations_amount__gt=0
        )
        print(f"Πληρωμές με previous_obligations_amount > 0: {payments_with_prev_obligations.count()}")
        
        if payments_with_prev_obligations.exists():
            total_prev_obligations = payments_with_prev_obligations.aggregate(
                total=Sum('previous_obligations_amount')
            )['total'] or 0
            print(f"Συνολικό previous_obligations_amount: {total_prev_obligations}€")
        
        print()
        
        # 2. INVESTIGATE RESERVE FUND (1.083,33€)
        print("🔍 2. ΕΡΕΥΝΑ ΑΠΟΘΕΜΑΤΙΚΟΥ ΤΑΜΕΙΟΥ (1.083,33€):")
        print("-" * 50)
        
        # Check reserve_fund_amount field
        payments_with_reserve = Payment.objects.filter(
            apartment__building=building,
            reserve_fund_amount__gt=0
        )
        print(f"Πληρωμές με reserve_fund_amount > 0: {payments_with_reserve.count()}")
        
        if payments_with_reserve.exists():
            total_reserve = payments_with_reserve.aggregate(
                total=Sum('reserve_fund_amount')
            )['total'] or 0
            print(f"Συνολικό reserve_fund_amount: {total_reserve}€")
            
            # Check by month
            print("\nΑποθεματικό ανά μήνα:")
            reserve_by_month = payments_with_reserve.values('date__month', 'date__year').annotate(
                total=Sum('reserve_fund_amount')
            ).order_by('date__year', 'date__month')
            
            for item in reserve_by_month:
                month_name = datetime(2000, item['date__month'], 1).strftime('%B')
                print(f"  {month_name} {item['date__year']}: {item['total']}€")
        else:
            print("❌ ΔΕΝ ΒΡΕΘΗΚΑΝ πληρωμές με αποθεματικό!")
        
        print()
        
        # 3. INVESTIGATE MANAGEMENT FEES (80,00€)
        print("🔍 3. ΕΡΕΥΝΑ ΚΟΣΤΟΥΣ ΔΙΑΧΕΙΡΙΣΗΣ (80,00€):")
        print("-" * 50)
        
        # Check building management fee settings
        print("Διαθέσιμα πεδία στο Building model:")
        building_fields = [field.name for field in building._meta.fields]
        print(f"Πεδία: {building_fields}")
        
        # Check specific management fee fields
        management_fields = [field for field in building_fields if 'management' in field.lower() or 'fee' in field.lower()]
        print(f"\nΠεδία διαχείρισης: {management_fields}")
        
        for field_name in management_fields:
            value = getattr(building, field_name, None)
            print(f"  {field_name}: {value}")
        
        # Check if management fees are included in payments
        print("\n🔍 Έλεγχος αν το κόστος διαχείρισης περιλαμβάνεται στις πληρωμές:")
        
        # Calculate total payments for September
        september_payments = Payment.objects.filter(
            apartment__building=building,
            date__startswith=selected_month
        )
        
        total_september = september_payments.aggregate(total=Sum('amount'))['total'] or 0
        print(f"Συνολικό Σεπτεμβρίου: {total_september}€")
        
        # Estimate management fee (assuming it's included)
        apartments_count = Apartment.objects.filter(building=building).count()
        estimated_management_per_apt = 8.00  # 80€ / 10 διαμερίσματα
        total_estimated_management = apartments_count * estimated_management_per_apt
        
        print(f"Εκτιμώμενο κόστος διαχείρισης: {total_estimated_management}€")
        
        print()
        
        # 4. INVESTIGATE EXPENSES
        print("🔍 4. ΕΡΕΥΝΑ ΔΑΠΑΝΩΝ:")
        print("-" * 50)
        
        # Check if there are expenses for September
        september_expenses = Expense.objects.filter(
            building=building,
            date__startswith=selected_month
        )
        
        print(f"Δαπάνες για {selected_month}: {september_expenses.count()}")
        
        if september_expenses.exists():
            total_expenses = september_expenses.aggregate(total=Sum('amount'))['total'] or 0
            print(f"Συνολικό δαπανών: {total_expenses}€")
            
            print("\nΛεπτομέρειες δαπανών:")
            for expense in september_expenses:
                print(f"  {expense.date}: {expense.description} - {expense.amount}€")
        else:
            print("❌ ΔΕΝ ΒΡΕΘΗΚΑΝ δαπάνες για τον Σεπτέμβριο!")
        
        print()
        
        # 5. SUMMARY AND RECOMMENDATIONS
        print("📋 ΣΥΝΟΨΗ ΚΑΙ ΣΥΜΒΟΥΛΕΣ:")
        print("=" * 60)
        
        print("🔍 ΤΙ ΒΡΗΚΑΜΕ:")
        print(f"  ✅ Πληρωμές Σεπτεμβρίου: {total_september}€")
        print("  ❌ Παλαιότερες οφειλές: Δεν βρέθηκαν")
        print("  ❌ Αποθεματικό ταμείο: Δεν βρέθηκε")
        print("  ❌ Κόστος διαχείρισης: Δεν βρέθηκε")
        print("  ❌ Δαπάνες Σεπτεμβρίου: Δεν βρέθηκαν")
        
        print("\n💡 ΓΙΑΤΙ ΔΕΝ ΤΑ ΕΧΟΥΜΕ:")
        print("  1. Παλαιότερες οφειλές: Μπορεί να μην έχουν καταγραφεί ή να είναι σε άλλο μοντέλο")
        print("  2. Αποθεματικό ταμείο: Μπορεί να μην συλλέγεται ή να είναι σε άλλο μοντέλο")
        print("  3. Κόστος διαχείρισης: Μπορεί να περιλαμβάνεται στις πληρωμές ή να είναι σε άλλο μοντέλο")
        print("  4. Δαπάνες: Μπορεί να μην έχουν καταγραφεί για τον Σεπτέμβριο")
        
        print("\n🚀 ΤΙ ΠΡΕΠΕΙ ΝΑ ΚΑΝΟΥΜΕ:")
        print("  1. Ελέγξουμε άλλα μοντέλα (Transaction, Obligation, κλπ.)")
        print("  2. Δημιουργήσουμε τα λειπόμενα δεδομένα στη βάση")
        print("  3. Συνδέσουμε το modal με τα πραγματικά δεδομένα")
        print("  4. Εφαρμόσουμε fallback values όταν τα δεδομένα λείπουν")

if __name__ == "__main__":
    investigate_missing_data()



