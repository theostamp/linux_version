#!/usr/bin/env python3

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def fix_july_2025_distribution():
    """Fix distribution types for July 2025 expenses - only management fees should be equal_share"""
    
    with schema_context('demo'):
        from apartments.models import Building
        from financial.models import Expense
        
        print("🔧 Διόρθωση Κατανομής Δαπανών Ιουλίου 2025")
        print("=" * 55)
        
        # Get building 1
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.address}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε κτίριο με ID 1")
            return
        
        # Get July 2025 expenses
        july_expenses = Expense.objects.filter(
            building=building,
            date__month=7,
            date__year=2025
        )
        
        if not july_expenses.exists():
            print("❌ Δεν βρέθηκαν δαπάνες Ιουλίου 2025")
            return
        
        print(f"📋 Βρέθηκαν {july_expenses.count()} δαπάνες Ιουλίου 2025")
        print()
        
        # Define correct distribution types
        correct_distributions = {
            'management': 'equal_share',  # Only management fees are equal share
            'utilities': 'by_participation_mills',
            'maintenance': 'by_participation_mills', 
            'reserve_fund': 'by_participation_mills',
            'cleaning': 'by_participation_mills'
        }
        
        updated_count = 0
        
        for expense in july_expenses:
            current_distribution = expense.distribution_type
            correct_distribution = correct_distributions.get(expense.category, 'by_participation_mills')
            
            print(f"📊 {expense.title}:")
            print(f"   Κατηγορία: {expense.get_category_display()}")
            print(f"   Τρέχουσα κατανομή: {expense.get_distribution_type_display()}")
            
            if current_distribution != correct_distribution:
                expense.distribution_type = correct_distribution
                expense.save()
                updated_count += 1
                print(f"   ✅ Ενημερώθηκε σε: {expense.get_distribution_type_display()}")
            else:
                print("   ✓ Σωστή κατανομή")
            print()
        
        print("📊 ΣΥΓΚΕΝΤΡΩΤΙΚΑ:")
        print("-" * 20)
        print(f"✅ Ενημερώθηκαν: {updated_count} δαπάνες")
        
        if updated_count > 0:
            print()
            print("⚠️ ΣΗΜΑΝΤΙΚΟ:")
            print("Οι συναλλαγές των διαμερισμάτων έχουν ήδη δημιουργηθεί με την παλιά κατανομή.")
            print("Για να εφαρμοστούν οι νέες κατανομές, χρειάζεται:")
            print("1. Διαγραφή των υπαρχουσών συναλλαγών")
            print("2. Επαναδημιουργία με τη σωστή κατανομή")
        
        print()
        print("📋 ΤΕΛΙΚΗ ΚΑΤΑΝΟΜΗ:")
        print("-" * 25)
        
        equal_share_expenses = july_expenses.filter(distribution_type='equal_share')
        mills_expenses = july_expenses.filter(distribution_type='by_participation_mills')
        
        equal_total = sum(e.amount for e in equal_share_expenses)
        mills_total = sum(e.amount for e in mills_expenses)
        
        print(f"🏠 Ίσα μερίδια (διαχείριση): {equal_total}€")
        for expense in equal_share_expenses:
            print(f"   - {expense.title}: {expense.amount}€")
        
        print(f"📊 Κατά χιλιοστά (όλα τα υπόλοιπα): {mills_total}€")
        for expense in mills_expenses:
            print(f"   - {expense.title}: {expense.amount}€")
        
        print(f"💰 Συνολικό ποσό: {equal_total + mills_total}€")

if __name__ == "__main__":
    fix_july_2025_distribution()
