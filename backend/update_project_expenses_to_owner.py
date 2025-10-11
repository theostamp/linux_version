#!/usr/bin/env python3
"""
Retroactive update: Ορίζει payer_responsibility='owner' σε όλες τις δαπάνες που 
προέρχονται από Projects/Maintenance (μεγάλα έργα).

Κριτήρια αναγνώρισης:
1. Έχουν project field
2. Έχουν title που περιέχει "Συντήρηση:", "Έργο:", "Δόση", "Προκαταβολή"
3. Έχουν συνδεδεμένα PaymentReceipts με maintenance
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
from django.db.models import Q

def update_project_expenses():
    """Ενημερώνει δαπάνες από projects/maintenance σε payer_responsibility='owner'"""
    
    with schema_context('demo'):
        print("\n" + "="*80)
        print("ΕΝΗΜΕΡΩΣΗ ΔΑΠΑΝΩΝ PROJECTS/MAINTENANCE → ΙΔΙΟΚΤΗΤΗΣ")
        print("="*80 + "\n")
        
        # Βρίσκουμε δαπάνες που προέρχονται από projects/maintenance
        project_expenses = Expense.objects.filter(
            Q(project__isnull=False) |  # Έχουν project field
            Q(title__icontains='Συντήρηση:') |
            Q(title__icontains='Έργο:') |
            Q(title__icontains='Δόση') |
            Q(title__icontains='Προκαταβολή')
        ).exclude(
            payer_responsibility='owner'  # Εξαιρούμε όσες ήδη είναι owner
        )
        
        total_count = project_expenses.count()
        
        if total_count == 0:
            print("✅ Δεν βρέθηκαν δαπάνες από projects που χρειάζονται ενημέρωση!\n")
            return
        
        print(f"📊 Βρέθηκαν {total_count} δαπάνες από projects/maintenance:\n")
        
        # Ανάλυση πριν την ενημέρωση
        print("ΑΝΑΛΥΣΗ ΠΡΙΝ:")
        print("-" * 80)
        
        by_payer = {
            'resident': [],
            'owner': [],
            'shared': [],
            'not_set': []
        }
        
        for exp in project_expenses:
            payer = exp.payer_responsibility or 'not_set'
            by_payer[payer].append(exp)
        
        print(f"  Ένοικος (resident):  {len(by_payer['resident'])}")
        print(f"  Ιδιοκτήτης (owner):  {len(by_payer['owner'])}")
        print(f"  Κοινή (shared):      {len(by_payer['shared'])}")
        print(f"  Μη ορισμένο:         {len(by_payer['not_set'])}\n")
        
        # Εμφάνιση δειγμάτων
        print("ΔΕΙΓΜΑ ΔΑΠΑΝΩΝ (πρώτες 10):")
        print("-" * 80)
        
        for i, exp in enumerate(list(project_expenses)[:10], 1):
            current_payer = exp.payer_responsibility or 'not_set'
            print(f"{i}. ID:{exp.id} | {exp.date} | €{exp.amount}")
            print(f"   Τίτλος: {exp.title}")
            print(f"   Category: {exp.get_category_display()}")
            print(f"   Current payer: {current_payer} → Will be: owner")
            if exp.project:
                print(f"   Project ID: {exp.project_id}")
            print()
        
        # Ενημέρωση
        print("=" * 80)
        print("ΕΝΗΜΕΡΩΣΗ...")
        print("=" * 80 + "\n")
        
        updated_count = project_expenses.update(payer_responsibility='owner')
        
        print(f"✅ Ενημερώθηκαν {updated_count} δαπάνες σε payer_responsibility='owner'\n")
        
        # Επαλήθευση
        print("=" * 80)
        print("ΕΠΑΛΗΘΕΥΣΗ:")
        print("=" * 80 + "\n")
        
        # Ελέγχουμε ότι δεν υπάρχουν πια τέτοιες δαπάνες
        remaining = Expense.objects.filter(
            Q(project__isnull=False) |
            Q(title__icontains='Συντήρηση:') |
            Q(title__icontains='Έργο:') |
            Q(title__icontains='Δόση') |
            Q(title__icontains='Προκαταβολή')
        ).exclude(payer_responsibility='owner').count()
        
        if remaining == 0:
            print("✅ ΕΠΙΤΥΧΙΑ! Όλες οι δαπάνες από projects/maintenance είναι τώρα 'owner'!\n")
        else:
            print(f"⚠️ Υπάρχουν ακόμα {remaining} δαπάνες που δεν ενημερώθηκαν.\n")
        
        print("="*80 + "\n")

if __name__ == '__main__':
    update_project_expenses()

