#!/usr/bin/env python
"""
Cleanup orphan transactions script

Διαγράφει τα "ορφανά" transactions που παρέμειναν μετά τη διαγραφή έργων
και επανυπολογίζει τα balances των επηρεαζόμενων διαμερισμάτων.

Usage:
    python manage.py shell < cleanup_orphan_transactions.py
    # ή
    python cleanup_orphan_transactions.py  (αν τρέχει μέσα από το Django environment)
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Add backend to path
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

django.setup()

from decimal import Decimal
from financial.models import Transaction
from apartments.models import Apartment
from financial.balance_service import BalanceCalculationService


def find_orphan_transactions():
    """
    Βρίσκει transactions που αναφέρονται σε διαγραμμένα έργα
    (περιέχουν "Στεγανοποίηση" ή "Δόση" στην περιγραφή)
    """
    # Transactions από το διαγραμμένο έργο "Στεγανοποίηση Ταράτσας"
    orphan_transactions = Transaction.objects.filter(
        description__icontains='Στεγανοποίηση'
    )
    
    return orphan_transactions


def cleanup_orphan_transactions(dry_run=True):
    """
    Διαγράφει τα ορφανά transactions και επανυπολογίζει τα balances
    
    Args:
        dry_run: Αν True, δείχνει τι θα γίνει χωρίς να κάνει αλλαγές
    """
    print("=" * 60)
    print("🧹 CLEANUP ORPHAN TRANSACTIONS")
    print("=" * 60)
    print(f"Mode: {'DRY RUN (preview only)' if dry_run else '⚠️ LIVE - WILL DELETE'}")
    print()
    
    # 1. Βρες τα ορφανά transactions
    orphan_transactions = find_orphan_transactions()
    
    if not orphan_transactions.exists():
        print("✅ Δεν βρέθηκαν ορφανά transactions!")
        return
    
    print(f"📋 Βρέθηκαν {orphan_transactions.count()} ορφανά transactions:\n")
    
    # Collect affected apartments
    affected_apartments = set()
    total_amount = Decimal('0.00')
    
    for t in orphan_transactions:
        print(f"  📌 ID: {t.id}")
        print(f"     Ημ/νία: {t.date}")
        print(f"     Περιγραφή: {t.description}")
        print(f"     Ποσό: {t.amount}€")
        print(f"     Διαμέρισμα: {t.apartment_number or 'N/A'}")
        print(f"     Building: {t.building}")
        print()
        
        total_amount += t.amount
        
        if t.apartment:
            affected_apartments.add(t.apartment)
    
    print(f"💰 Συνολικό ποσό προς διαγραφή: {total_amount}€")
    print(f"🏠 Επηρεαζόμενα διαμερίσματα: {len(affected_apartments)}")
    print()
    
    # Show affected apartments
    for apt in affected_apartments:
        print(f"  🏠 Δ.{apt.number} ({apt.building.name})")
        print(f"     Τρέχον υπόλοιπο: {apt.current_balance}€")
    print()
    
    if dry_run:
        print("=" * 60)
        print("🔍 DRY RUN COMPLETE - Καμία αλλαγή δεν έγινε")
        print("   Τρέξε με dry_run=False για να εφαρμοστούν οι αλλαγές")
        print("=" * 60)
        return
    
    # 2. Διαγραφή transactions
    print("🗑️ Διαγραφή transactions...")
    deleted_count = orphan_transactions.delete()[0]
    print(f"   ✅ Διαγράφηκαν {deleted_count} transactions")
    print()
    
    # 3. Επανυπολογισμός balances
    print("🔄 Επανυπολογισμός balances...")
    for apt in affected_apartments:
        old_balance = apt.current_balance
        BalanceCalculationService.update_apartment_balance(apt, use_locking=False)
        apt.refresh_from_db()
        new_balance = apt.current_balance
        print(f"   🏠 Δ.{apt.number}: {old_balance}€ → {new_balance}€")
    
    print()
    print("=" * 60)
    print("✅ CLEANUP COMPLETE!")
    print("=" * 60)


if __name__ == '__main__':
    # Parse arguments
    import argparse
    parser = argparse.ArgumentParser(description='Cleanup orphan transactions')
    parser.add_argument('--execute', action='store_true', 
                        help='Actually delete (default is dry-run)')
    args = parser.parse_args()
    
    cleanup_orphan_transactions(dry_run=not args.execute)

