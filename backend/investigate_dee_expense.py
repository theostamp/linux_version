#!/usr/bin/env python3
"""
Script to investigate the DEH expense of 5,000€ recorded on 14/03/2025
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building

def investigate_dee_expense():
    """Investigate the DEH expense of 5,000€ recorded on 14/03/2025"""
    
    with schema_context('demo'):
        # Get building data
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        print("🔍 ΕΡΕΥΝΑ ΔΑΠΑΝΗΣ ΔΕΗ ΚΟΙΝΟΧΡΗΣΤΩΝ (5.000,00€):")
        print("=" * 60)
        
        # 1. SEARCH FOR DEH EXPENSE
        print("🔍 1. ΑΝΑΖΗΤΗΣΗ ΔΑΠΑΝΗΣ ΔΕΗ:")
        print("-" * 40)
        
        # Search for expenses with DEH in title
        dee_expenses = Expense.objects.filter(
            building=building,
            title__icontains='ΔΕΗ'
        )
        
        print(f"Δαπάνες με 'ΔΕΗ' στον τίτλο: {dee_expenses.count()}")
        
        if dee_expenses.exists():
            print("\nΛεπτομέρειες ΔΕΗ δαπανών:")
            for expense in dee_expenses:
                print(f"  📅 {expense.date}: {expense.title}")
                print(f"     💰 Ποσό: {expense.amount}€")
                print(f"     🏷️  Κατηγορία: {expense.category if hasattr(expense, 'category') else 'N/A'}")
                print(f"     📊 Τρόπος κατανομής: {expense.distribution_type if hasattr(expense, 'distribution_type') else 'N/A'}")
                print(f"     🆔 ID: {expense.id}")
                print()
        
        # 2. SEARCH FOR EXPENSES AROUND MARCH 14, 2025
        print("🔍 2. ΑΝΑΖΗΤΗΣΗ ΔΑΠΑΝΩΝ ΓΥΡΩ ΑΠΟ 14/03/2025:")
        print("-" * 50)
        
        # Search for expenses around March 14, 2025
        march_expenses = Expense.objects.filter(
            building=building,
            date__range=['2025-03-10', '2025-03-20']
        ).order_by('date')
        
        print(f"Δαπάνες 10-20 Μαρτίου 2025: {march_expenses.count()}")
        
        if march_expenses.exists():
            print("\nΛεπτομέρειες δαπανών Μαρτίου:")
            for expense in march_expenses:
                print(f"  📅 {expense.date}: {expense.title}")
                print(f"     💰 Ποσό: {expense.amount}€")
                print(f"     🏷️  Κατηγορία: {expense.category if hasattr(expense, 'category') else 'N/A'}")
                print(f"     📊 Τρόπος κατανομής: {expense.distribution_type if hasattr(expense, 'distribution_type') else 'N/A'}")
                print()
        
        # 3. SEARCH FOR EXPENSES WITH 5000€ AMOUNT
        print("🔍 3. ΑΝΑΖΗΤΗΣΗ ΔΑΠΑΝΩΝ ΜΕ ΠΟΣΟ 5.000€:")
        print("-" * 45)
        
        # Search for expenses with amount around 5000€
        expenses_5000 = Expense.objects.filter(
            building=building,
            amount__range=[4990, 5010]
        )
        
        print(f"Δαπάνες με ποσό γύρω από 5.000€: {expenses_5000.count()}")
        
        if expenses_5000.exists():
            print("\nΛεπτομέρειες δαπανών ~5.000€:")
            for expense in expenses_5000:
                print(f"  📅 {expense.date}: {expense.title}")
                print(f"     💰 Ποσό: {expense.amount}€")
                print(f"     🏷️  Κατηγορία: {expense.category if hasattr(expense, 'category') else 'N/A'}")
                print(f"     📊 Τρόπος κατανομής: {expense.distribution_type if hasattr(expense, 'distribution_type') else 'N/A'}")
                print()
        
        # 4. CHECK EXPENSE MODEL STRUCTURE
        print("🔍 4. ΔΟΜΗ ΜΟΝΤΕΛΟΥ EXPENSE:")
        print("-" * 35)
        
        if Expense.objects.exists():
            sample_expense = Expense.objects.first()
            print(f"Διαθέσιμα πεδία: {[field.name for field in sample_expense._meta.fields]}")
            
            # Check specific fields
            print("\n🔍 Έλεγχος συγκεκριμένων πεδίων:")
            for field_name in ['title', 'amount', 'date', 'category', 'distribution_type', 'building']:
                if hasattr(sample_expense, field_name):
                    value = getattr(sample_expense, field_name)
                    print(f"  {field_name}: {value}")
                else:
                    print(f"  {field_name}: ΔΕΝ ΥΠΑΡΧΕΙ")
        else:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ δαπάνες στη βάση!")
        
        print()
        
        # 5. SEARCH FOR ALL EXPENSES
        print("🔍 5. ΟΛΕΣ ΟΙ ΔΑΠΑΝΕΣ ΣΤΗ ΒΑΣΗ:")
        print("-" * 35)
        
        all_expenses = Expense.objects.filter(building=building).order_by('-date')
        print(f"Συνολικός αριθμός δαπανών: {all_expenses.count()}")
        
        if all_expenses.exists():
            print("\nΤελευταίες 10 δαπάνες:")
            for i, expense in enumerate(all_expenses[:10]):
                print(f"  {i+1}. {expense.date}: {expense.title} - {expense.amount}€")
        else:
            print("❌ ΔΕΝ ΥΠΑΡΧΟΥΝ δαπάνες στη βάση!")
        
        print()
        
        # 6. SUMMARY AND RECOMMENDATIONS
        print("📋 ΣΥΝΟΨΗ ΚΑΙ ΣΥΜΒΟΥΛΕΣ:")
        print("=" * 60)
        
        print("🔍 ΤΙ ΒΡΗΚΑΜΕ:")
        print(f"  ✅ Δαπάνες με 'ΔΕΗ': {dee_expenses.count()}")
        print(f"  ✅ Δαπάνες Μαρτίου 2025: {march_expenses.count()}")
        print(f"  ✅ Δαπάνες ~5.000€: {expenses_5000.count()}")
        print(f"  ✅ Συνολικές δαπάνες: {all_expenses.count()}")
        
        print("\n💡 ΓΙΑΤΙ ΔΕΝ ΒΡΙΣΚΟΥΜΕ ΤΗ ΔΑΠΑΝΗ 5.000€:")
        print("  1. Μπορεί να είναι σε άλλο μοντέλο (Transaction, Obligation, κλπ.)")
        print("  2. Μπορεί να έχει διαφορετική περιγραφή")
        print("  3. Μπορεί να έχει διαφορετική ημερομηνία")
        print("  4. Μπορεί να είναι σε άλλο tenant schema")
        
        print("\n🚀 ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ:")
        print("  1. Ελέγξουμε άλλα μοντέλα (Transaction, Obligation)")
        print("  2. Ελέγξουμε άλλα tenant schemas")
        print("  3. Ελέγξουμε αν η δαπάνη καταγράφεται διαφορετικά")
        print("  4. Δημιουργήσουμε τη δαπάνη αν δεν υπάρχει")

if __name__ == "__main__":
    investigate_dee_expense()
