#!/usr/bin/env python3
"""
Script για διόρθωση υπολογισμού management fees
Διορθώνει το start_date από 2025 σε 2024
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Transaction
from django.utils import timezone
from django.db.models import Sum

def fix_management_fees_calculation():
    """Διόρθωση υπολογισμού management fees"""
    
    with schema_context('demo'):
        print("🔧 Διόρθωση Υπολογισμού Management Fees")
        print("=" * 60)
        
        # Βρίσκουμε το κτίριο Αλκμάνος 22
        building = Building.objects.filter(name__icontains='Αλκμάνος').first()
        if not building:
            print("❌ Δεν βρέθηκε κτίριο Αλκμάνος")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"💰 Πακέτο διαχείρισης ανά διαμέρισμα: €{building.management_fee_per_apartment}")
        
        # Ελέγχος transactions
        print(f"\n🔍 Έλεγχος transactions:")
        transactions = Transaction.objects.filter(
            apartment__building=building,
            type='management_fee'
        ).order_by('date')
        
        print(f"   - Συνολικές management_fee transactions: {transactions.count()}")
        
        if transactions.exists():
            print(f"   - Πρώτη transaction: {transactions.first().date}")
            print(f"   - Τελευταία transaction: {transactions.last().date}")
            
            # Έλεγχος συνολικού ποσού
            total_amount = transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - Συνολικό ποσό: €{total_amount}")
            
            # Έλεγχος ανά μήνα
            print(f"\n📅 Transactions ανά μήνα:")
            for year in [2024, 2025]:
                for month in range(1, 13):
                    month_transactions = transactions.filter(
                        date__year=year,
                        date__month=month
                    )
                    if month_transactions.exists():
                        month_amount = month_transactions.aggregate(total=Sum('amount'))['total'] or 0
                        print(f"   - {year}-{month:02d}: {month_transactions.count()} transactions, €{month_amount}")
        
        # Έλεγχος διαμερισμάτων
        apartments = Apartment.objects.filter(building=building)
        print(f"\n🏠 Έλεγχος διαμερισμάτων:")
        
        for apartment in apartments:
            apt_transactions = transactions.filter(apartment=apartment)
            apt_amount = apt_transactions.aggregate(total=Sum('amount'))['total'] or 0
            print(f"   - {apartment.number}: {apt_transactions.count()} transactions, €{apt_amount}")
        
        print("\n" + "=" * 60)
        print("✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    fix_management_fees_calculation()
