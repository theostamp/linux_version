#!/usr/bin/env python3
"""
Script to verify the correctness of financial overview data
Ελέγχει την ορθότητα των οικονομικών δεδομένων στο τμημα Οικονομική Επισκόπηση
"""

import requests
import json
from datetime import datetime, timedelta
from decimal import Decimal
import sys
import os

# Add backend to path
sys.path.append('backend')

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django.db.models import Sum, Q
from financial.models import Expense, Payment, Transaction
from buildings.models import Building
from apartments.models import Apartment
from tenants.models import Client
from django_tenants.utils import tenant_context

def check_financial_overview(building_id=1):
    """Ελέγχει την ορθότητα των οικονομικών δεδομένων"""
    
    print("🔍 ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΗΣ ΕΠΙΣΚΟΠΗΣΗΣ")
    print("=" * 50)
    
    # 1. Λήψη δεδομένων από API (SKIP - requires authentication)
    print("\n📊 Λήψη δεδομένων από API...")
    print("⚠️  Παραλείπεται λόγω απαιτούμενης πιστοποίησης")
    
    # 2. Υπολογισμός από βάση δεδομένων με tenant context
    print("\n🧮 Υπολογισμός από βάση δεδομένων...")
    
    # Get demo tenant
    try:
        demo_tenant = Client.objects.get(schema_name='demo')
        print(f"📋 Χρήση tenant: {demo_tenant.name} (Schema: {demo_tenant.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Use tenant context
    with tenant_context(demo_tenant):
        # Debug: Show all buildings
        print(f"\n🏢 Διαθέσιμα κτίρια:")
        buildings = Building.objects.all()
        for b in buildings:
            print(f"   ID: {b.id}, Όνομα: {b.name}, Αποθεματικό: {b.current_reserve or 0:.2f}€")
        
        # Debug: Show all expenses
        print(f"\n📝 Όλες οι δαπάνες:")
        all_expenses = Expense.objects.all()
        for e in all_expenses:
            print(f"   {e.title}: {e.amount}€ ({e.date}) - Εκδοθεί: {e.is_issued}")
        
        # Debug: Show all payments
        print(f"\n💳 Όλες οι πληρωμές:")
        all_payments = Payment.objects.all()
        for p in all_payments:
            print(f"   {p.apartment.number}: {p.amount}€ ({p.date}) - Μέθοδος: {p.method}")
        
        # Τρέχον αποθεματικό (υπολογισμός: εισπράξεις - δαπάνες μήνα)
        # Δαπάνες μήνα (January 2024 for demo data)
        demo_month = datetime(2024, 1, 1)
        total_expenses_month_db = Expense.objects.filter(
            building_id=building_id,
            date__gte=demo_month,
            date__lt=datetime(2024, 2, 1)  # Before February 2024
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Εισπράξεις μήνα (January 2024 for demo data)
        total_payments_month_db = Payment.objects.filter(
            apartment__building_id=building_id,
            date__gte=demo_month,
            date__lt=datetime(2024, 2, 1)  # Before February 2024
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός τρέχοντος αποθεματικού: Εισπράξεις - Δαπάνες
        current_reserve_db = total_payments_month_db - total_expenses_month_db
        
        # Ανέκδοτες δαπάνες
        pending_expenses_db = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Συνολικές οφειλές
        apartments = Apartment.objects.filter(building_id=building_id)
        total_obligations_db = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        
        # 3. Εμφάνιση αποτελεσμάτων
        print("\n📋 ΑΠΟΤΕΛΕΣΜΑΤΑ ΑΠΟ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        # Τρέχον Αποθεματικό
        print(f"\n💰 Τρέχον Αποθεματικό:")
        print(f"   Database: {current_reserve_db:.2f}€")
        
        # Ανέκδοτες Δαπάνες
        print(f"\n📝 Ανέκδοτες Δαπάνες:")
        print(f"   Database: {pending_expenses_db:.2f}€")
        
        # Δαπάνες Μήνα
        print(f"\n💸 Δαπάνες Μήνα:")
        print(f"   Database: {total_expenses_month_db:.2f}€")
        
        # Εισπράξεις Μήνα
        print(f"\n💳 Εισπράξεις Μήνα:")
        print(f"   Database: {total_payments_month_db:.2f}€")
        
        # Συνολικές Οφειλές
        print(f"\n🏠 Συνολικές Οφειλές:")
        print(f"   Database: {total_obligations_db:.2f}€")
        
        # 4. Λεπτομερής ανάλυση
        print("\n🔍 ΛΕΠΤΟΜΕΡΗΣ ΑΝΑΛΥΣΗ")
        print("-" * 50)
        
        # Ανέκδοτες δαπάνες ανά κατηγορία
        print(f"\n📊 Ανέκδοτες δαπάνες ανά κατηγορία:")
        pending_by_category = Expense.objects.filter(
            building_id=building_id,
            is_issued=False
        ).values('category').annotate(total=Sum('amount')).order_by('-total')
        
        for item in pending_by_category:
            print(f"   {item['category']}: {item['total']:.2f}€")
        
        # Δαπάνες μήνα ανά κατηγορία
        print(f"\n📊 Δαπάνες μήνα ανά κατηγορία:")
        expenses_by_category = Expense.objects.filter(
            building_id=building_id,
            date__gte=demo_month,
            date__lt=datetime(2024, 2, 1)
        ).values('category').annotate(total=Sum('amount')).order_by('-total')
        
        for item in expenses_by_category:
            print(f"   {item['category']}: {item['total']:.2f}€")
        
        # Εισπράξεις μήνα ανά τρόπο πληρωμής
        print(f"\n📊 Εισπράξεις μήνα ανά τρόπο πληρωμής:")
        payments_by_method = Payment.objects.filter(
            apartment__building_id=building_id,
            date__gte=demo_month,
            date__lt=datetime(2024, 2, 1)
        ).values('method').annotate(total=Sum('amount')).order_by('-total')
        
        for item in payments_by_method:
            print(f"   {item['method']}: {item['total']:.2f}€")
        
        # 5. Σύνοψη
        print("\n📈 ΣΥΝΟΨΗ")
        print("-" * 50)
        
        total_income = total_payments_month_db
        total_expenses = total_expenses_month_db
        net_flow = total_income - total_expenses
        
        print(f"💰 Συνολικές Εισπράξεις Μήνα: {total_income:.2f}€")
        print(f"💸 Συνολικές Δαπάνες Μήνα: {total_expenses:.2f}€")
        print(f"📊 Καθαρή Ροή: {net_flow:.2f}€")
        
        if net_flow > 0:
            print("✅ Θετική καθαρή ροή - Καλό σημάδι")
        elif net_flow < 0:
            print("⚠️  Αρνητική καθαρή ροή - Προσοχή")
        else:
            print("⚖️  Ισορροπία εσόδων-εξόδων")
        
        # 6. Επιβεβαίωση με τα δεδομένα που δόθηκαν
        print("\n🎯 ΕΠΙΒΕΒΑΙΩΣΗ ΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΤΗΣ ΕΡΩΤΗΣΗΣ")
        print("-" * 50)
        
        expected_data = {
            'current_reserve': 0.00,
            'pending_expenses': 5988.00,
            'total_expenses_month': 5988.00,
            'total_payments_month': 25000.00
        }
        
        print(f"💰 Τρέχον Αποθεματικό:")
        print(f"   Αναμενόμενο: {expected_data['current_reserve']:.2f}€")
        print(f"   Πραγματικό:  {current_reserve_db:.2f}€")
        if abs(current_reserve_db - Decimal(str(expected_data['current_reserve']))) < Decimal('0.01'):
            print("   ✅ ΤΑΙΡΙΑΖΕΙ")
        else:
            print("   ❌ ΔΙΑΦΟΡΕΤΙΚΟ")
        
        print(f"\n📝 Ανέκδοτες Δαπάνες:")
        print(f"   Αναμενόμενο: {expected_data['pending_expenses']:.2f}€")
        print(f"   Πραγματικό:  {pending_expenses_db:.2f}€")
        if abs(pending_expenses_db - Decimal(str(expected_data['pending_expenses']))) < Decimal('0.01'):
            print("   ✅ ΤΑΙΡΙΑΖΕΙ")
        else:
            print("   ❌ ΔΙΑΦΟΡΕΤΙΚΟ")
        
        print(f"\n💸 Δαπάνες Μήνα:")
        print(f"   Αναμενόμενο: {expected_data['total_expenses_month']:.2f}€")
        print(f"   Πραγματικό:  {total_expenses_month_db:.2f}€")
        if abs(total_expenses_month_db - Decimal(str(expected_data['total_expenses_month']))) < Decimal('0.01'):
            print("   ✅ ΤΑΙΡΙΑΖΕΙ")
        else:
            print("   ❌ ΔΙΑΦΟΡΕΤΙΚΟ")
        
        print(f"\n💳 Εισπράξεις Μήνα:")
        print(f"   Αναμενόμενο: {expected_data['total_payments_month']:.2f}€")
        print(f"   Πραγματικό:  {total_payments_month_db:.2f}€")
        if abs(total_payments_month_db - Decimal(str(expected_data['total_payments_month']))) < Decimal('0.01'):
            print("   ✅ ΤΑΙΡΙΑΖΕΙ")
        else:
            print("   ❌ ΔΙΑΦΟΡΕΤΙΚΟ")

if __name__ == "__main__":
    # Επιλογή building_id (προεπιλογή: 1)
    building_id = 1
    if len(sys.argv) > 1:
        building_id = int(sys.argv[1])
    
    check_financial_overview(building_id)
