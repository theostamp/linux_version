#!/usr/bin/env python3
"""
🚨 ΔΙΟΡΘΩΣΗ: Υπερβολικοί Αριθμοί Δόσεων

Πρόβλημα: Υπάρχουν projects με 2000 δόσεις που δημιουργούν:
- Χιλιάδες expense records μέχρι το 2190
- Εκατοντάδες CommonExpensePeriod records
- Κατάρρευση performance

Λύση:
1. Εντοπισμός projects με υπερβολικές δόσεις
2. Διαγραφή μελλοντικών δαπανών (μετά από 2026)
3. Ενημέρωση project installments σε λογικό αριθμό
4. Προσθήκη validation στο model
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Django setup
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from projects.models import Project
from financial.models import Expense
from django.db.models import Count, Q

# Λογικό max δόσεων: 60 (5 χρόνια) ή 120 (10 χρόνια)
MAX_REASONABLE_INSTALLMENTS = 60  # 5 χρόνια
CUTOFF_YEAR = 2026  # Διαγραφή δαπανών μετά το 2026

def analyze_excessive_installments():
    """Εύρεση projects με υπερβολικές δόσεις"""
    print("=" * 80)
    print("🔍 ΑΝΑΛΥΣΗ ΥΠΕΡΒΟΛΙΚΩΝ ΔΟΣΕΩΝ")
    print("=" * 80 + "\n")
    
    # Βρες projects με πολλές δόσεις
    excessive_projects = Project.objects.filter(
        installments__gt=MAX_REASONABLE_INSTALLMENTS
    ).annotate(
        expense_count=Count('expense')
    )
    
    if not excessive_projects.exists():
        print("✅ Δεν βρέθηκαν projects με υπερβολικές δόσεις")
        return []
    
    print(f"⚠️ Βρέθηκαν {excessive_projects.count()} projects με >{ MAX_REASONABLE_INSTALLMENTS} δόσεις:\n")
    
    for project in excessive_projects:
        print(f"📋 Project: {project.title}")
        print(f"   ID: {project.id}")
        print(f"   Δόσεις: {project.installments}")
        print(f"   Expenses: {project.expense_count}")
        print(f"   Building: {project.building.name}")
        print(f"   Status: {project.status}")
        
        # Βρες τις δαπάνες του project
        expenses = Expense.objects.filter(project=project).order_by('date')
        if expenses.exists():
            first_expense = expenses.first()
            last_expense = expenses.last()
            print(f"   Πρώτη δαπάνη: {first_expense.date}")
            print(f"   Τελευταία δαπάνη: {last_expense.date}")
            
            # Μέτρα δαπάνες μετά το CUTOFF_YEAR
            future_expenses = expenses.filter(date__year__gt=CUTOFF_YEAR)
            print(f"   ⚠️ Δαπάνες μετά το {CUTOFF_YEAR}: {future_expenses.count()}")
        
        print()
    
    return list(excessive_projects)

def clean_future_expenses(project, dry_run=True):
    """Διαγραφή μελλοντικών δαπανών για ένα project"""
    expenses = Expense.objects.filter(
        project=project,
        date__year__gt=CUTOFF_YEAR
    )
    
    count = expenses.count()
    
    if count == 0:
        return 0
    
    print(f"   🗑️ Διαγραφή {count} δαπανών μετά το {CUTOFF_YEAR}")
    
    if not dry_run:
        expenses.delete()
        print(f"   ✅ Διαγράφηκαν {count} δαπάνες")
    else:
        print(f"   📝 DRY RUN: Θα διαγραφούν {count} δαπάνες")
    
    return count

def fix_project_installments(project, new_installments, dry_run=True):
    """Ενημέρωση του αριθμού δόσεων για ένα project"""
    old_installments = project.installments
    
    print(f"   📝 Ενημέρωση δόσεων: {old_installments} → {new_installments}")
    
    if not dry_run:
        project.installments = new_installments
        project.save()
        print(f"   ✅ Ενημερώθηκε project.installments")
    else:
        print(f"   📝 DRY RUN: Θα ενημερωθεί σε {new_installments}")

def main(dry_run=True):
    """Κύρια συνάρτηση"""
    print("\n" + "=" * 80)
    print("🚀 ΕΝΑΡΞΗ ΔΙΟΡΘΩΣΗΣ")
    print("=" * 80)
    
    if dry_run:
        print("\n⚠️ DRY RUN MODE - Δεν θα γίνουν αλλαγές\n")
    else:
        print("\n🔥 LIVE MODE - Θα γίνουν αλλαγές!\n")
    
    # 1. Ανάλυση
    excessive_projects = analyze_excessive_installments()
    
    if not excessive_projects:
        return
    
    # 2. Διόρθωση
    print("\n" + "=" * 80)
    print("🔧 ΔΙΟΡΘΩΣΗ")
    print("=" * 80 + "\n")
    
    total_deleted = 0
    
    for project in excessive_projects:
        print(f"📋 Project: {project.title} (ID: {project.id})")
        
        # Καθαρισμός μελλοντικών δαπανών
        deleted = clean_future_expenses(project, dry_run)
        total_deleted += deleted
        
        # Υπολογισμός λογικού αριθμού δόσεων
        # Μέτρα πόσες δαπάνες έχουν ήδη δημιουργηθεί ως το 2026
        remaining_expenses = Expense.objects.filter(
            project=project,
            date__year__lte=CUTOFF_YEAR
        ).count()
        
        new_installments = min(remaining_expenses, MAX_REASONABLE_INSTALLMENTS)
        
        # Ενημέρωση project
        fix_project_installments(project, new_installments, dry_run)
        
        print()
    
    # 3. Σύνοψη
    print("=" * 80)
    print("📊 ΣΥΝΟΨΗ")
    print("=" * 80)
    print(f"Projects με υπερβολικές δόσεις: {len(excessive_projects)}")
    print(f"Δαπάνες προς διαγραφή: {total_deleted}")
    print(f"Cutoff year: {CUTOFF_YEAR}")
    print(f"Max δόσεις: {MAX_REASONABLE_INSTALLMENTS}")
    
    if dry_run:
        print("\n⚠️ Αυτό ήταν DRY RUN. Τρέξε με --live για να εφαρμόσεις τις αλλαγές.")
    else:
        print("\n✅ Διορθώσεις εφαρμόστηκαν!")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix excessive installments')
    parser.add_argument('--live', action='store_true', help='Apply changes (default is dry-run)')
    
    args = parser.parse_args()
    
    main(dry_run=not args.live)

