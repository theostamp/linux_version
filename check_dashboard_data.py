#!/usr/bin/env python3
"""
Script to check dashboard data for September (August usage) to verify amounts
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

def check_dashboard_data():
    """Check dashboard data for September (August usage)"""
    
    with schema_context('demo'):
        # Get building data
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        print()
        
        # Check September 2025 data (August usage)
        selected_month = "2025-09"
        print(f"📅 Ελέγχος δεδομένων για: {selected_month} (χρήση Αυγούστου)")
        print("=" * 50)
        
        # Get all apartments
        apartments = Apartment.objects.filter(building=building)
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments.count()}")
        print()
        
        # Check Payment model fields
        print("🔍 Διαθέσιμα πεδία στο Payment model:")
        if Payment.objects.exists():
            sample_payment = Payment.objects.first()
            print(f"Πεδία: {[field.name for field in sample_payment._meta.fields]}")
        print()
        
        # Check Apartment model fields
        print("🔍 Διαθέσιμα πεδία στο Apartment model:")
        if apartments.exists():
            sample_apt = apartments.first()
            print(f"Πεδία: {[field.name for field in sample_apt._meta.fields]}")
        print()
        
        # Calculate totals from apartments
        total_amount = 0
        total_previous_balance = 0
        total_current_balance = 0
        
        print("📊 Λεπτομέρειες διαμερισμάτων:")
        print("-" * 30)
        
        for apt in apartments:
            # Get latest payment for this apartment
            latest_payment = Payment.objects.filter(
                apartment=apt,
                date__startswith=selected_month
            ).order_by('-date').first()
            
            if latest_payment:
                amount = latest_payment.amount or 0
                # Check what balance fields exist
                balance_fields = [field.name for field in latest_payment._meta.fields if 'balance' in field.name.lower()]
                
                print(f"Διαμ. {apt.number}: amount={amount}€, balance_fields={balance_fields}")
                
                total_amount += amount
                
                # Try to get balance info if available
                for field_name in balance_fields:
                    field_value = getattr(latest_payment, field_name, 0) or 0
                    if 'previous' in field_name.lower():
                        total_previous_balance += abs(field_value)
                    elif 'current' in field_name.lower():
                        total_current_balance += field_value
            else:
                print(f"Διαμ. {apt.number}: Δεν βρέθηκε πληρωμή για {selected_month}")
        
        print()
        print("💰 ΣΥΝΟΛΑ:")
        print(f"Συνολικό amount: {total_amount}€")
        print(f"Συνολικό previous_balance: {total_previous_balance}€")
        print(f"Συνολικό current_balance: {total_current_balance}€")
        print()
        
        # Calculate breakdown based on suggested amounts
        suggested_breakdown = {
            'common': 200.00,
            'management': 80.00,
            'reserve': 1083.33,
            'previous_balance': 5000.00,
            'total': 6363.33
        }
        
        print("📋 ΠΡΟΤΕΙΝΟΜΕΝΗ ΑΝΑΛΥΣΗ:")
        print(f"1. Λειτουργικές Δαπάνες: {suggested_breakdown['common']}€")
        print(f"2. Κόστος διαχείρισης: {suggested_breakdown['management']}€")
        print(f"3. Αποθεματικό Ταμείο: {suggested_breakdown['reserve']}€")
        print(f"4. Παλαιότερες οφειλές: {suggested_breakdown['previous_balance']}€")
        print(f"ΣΥΝΟΛΟ: {suggested_breakdown['total']}€")
        print()
        
        # Check if our data matches
        print("🔍 ΕΠΙΒΕΒΑΙΩΣΗ:")
        total_amount_float = float(total_amount)
        total_previous_balance_float = float(total_previous_balance)
        
        if abs(total_amount_float - suggested_breakdown['total']) < 1:
            print("✅ ΣΥΝΟΛΟ ΤΑΙΡΙΑΖΕΙ!")
        else:
            print(f"❌ Διαφορά στο σύνολο: {total_amount_float}€ vs {suggested_breakdown['total']}€")
        
        if abs(total_previous_balance_float - suggested_breakdown['previous_balance']) < 1:
            print("✅ ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ ΤΑΙΡΙΑΖΟΥΝ!")
        else:
            print(f"❌ Διαφορά στις παλαιότερες οφειλές: {total_previous_balance_float}€ vs {suggested_breakdown['previous_balance']}€")
        
        print()
        print("📊 ΑΝΑΛΥΣΗ ΔΕΔΟΜΕΝΩΝ:")
        print(f"Πραγματικό σύνολο από βάση: {total_amount_float}€")
        print(f"Προτεινόμενο σύνολο: {suggested_breakdown['total']}€")
        print(f"Διαφορά: {abs(total_amount_float - suggested_breakdown['total'])}€")
        print()
        
        # Check if we need to look for more data
        print("🔍 ΕΡΕΥΝΑ ΓΙΑ ΠΕΡΙΣΣΟΤΕΡΑ ΔΕΔΟΜΕΝΑ:")
        print("Μπορεί να χρειαστεί να ελέγξουμε:")
        print("1. Expenses για τον Σεπτέμβριο")
        print("2. Previous obligations από άλλες πηγές")
        print("3. Reserve fund contributions")
        print("4. Management fees")

if __name__ == "__main__":
    check_dashboard_data()
