#!/usr/bin/env python3
"""
Script για έλεγχο όλων των στοιχείων του οικονομικού dashboard
"""

import os
import sys
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building
from decimal import Decimal
from django.db.models import Sum, Count

def check_dashboard_all():
    """Έλεγχος όλων των στοιχείων του dashboard"""
    print("🔍 ΕΠΙΣΤΗΜΟΝΙΚΟΣ ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΟΥ DASHBOARD")
    print("=" * 60)
    
    # Get demo client
    try:
        client = Client.objects.get(schema_name='demo')
        print(f"📋 Tenant: {client.name} (Schema: {client.schema_name})")
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
        return
    
    # Check in demo tenant
    with tenant_context(client):
        print("\n" + "="*60)
        print("📊 1. ΤΡΕΧΟΝ ΑΠΟΘΕΜΑΤΙΚΟ")
        print("="*60)
        
        # Get building
        building = Building.objects.first()
        if building:
            current_reserve = building.current_reserve or Decimal('0.00')
            print(f"💰 Τρέχον Αποθεματικό: {current_reserve:10.2f}€")
            print(f"🏢 Κτίριο: {building.name}")
        else:
            print("❌ Δεν βρέθηκε κτίριο")
        
        print("\n" + "="*60)
        print("💸 2. ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ")
        print("="*60)
        
        # Unissued expenses
        unissued_expenses = Expense.objects.filter(is_issued=False)
        total_unissued = unissued_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        print(f"📋 Αριθμός ανέκδοτων δαπανών: {unissued_expenses.count()}")
        print(f"💰 Συνολικό ποσό ανέκδοτων: {total_unissued:10.2f}€")
        
        if unissued_expenses.count() > 0:
            print("\n📋 Λίστα ανέκδοτων δαπανών:")
            for i, expense in enumerate(unissued_expenses[:5], 1):
                print(f"  {i}. {expense.title}: {expense.amount:8.2f}€ ({expense.date})")
            if unissued_expenses.count() > 5:
                print(f"  ... και {unissued_expenses.count() - 5} ακόμα")
        
        print("\n" + "="*60)
        print("🔄 3. ΤΕΛΕΥΤΑΙΕΣ ΚΙΝΗΣΕΙΣ")
        print("="*60)
        
        # Recent transactions
        recent_transactions = Transaction.objects.all().order_by('-date')[:10]
        print(f"📋 Αριθμός κινήσεων: {Transaction.objects.count()}")
        print(f"📋 Πρόσφατες κινήσεις (10 τελευταίες): {recent_transactions.count()}")
        
        if recent_transactions.count() > 0:
            print("\n📋 Λίστα πρόσφατων κινήσεων:")
            for i, transaction in enumerate(recent_transactions, 1):
                print(f"  {i}. {transaction.get_type_display()}: {transaction.amount:8.2f}€ ({transaction.date.strftime('%d/%m/%Y')})")
        else:
            print("⚠️  Δεν βρέθηκαν κινήσεις")
        
        print("\n" + "="*60)
        print("💰 4. ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ")
        print("="*60)
        
        # Total obligations (negative balances)
        apartments = Apartment.objects.all()
        total_obligations = sum(
            abs(apt.current_balance) for apt in apartments 
            if apt.current_balance and apt.current_balance < 0
        )
        apartments_with_debt = [apt for apt in apartments if apt.current_balance and apt.current_balance < 0]
        
        print(f"📋 Διαμερίσματα με οφειλές: {len(apartments_with_debt)}")
        print(f"💰 Συνολικές οφειλές: {total_obligations:10.2f}€")
        
        if apartments_with_debt:
            print("\n📋 Λίστα διαμερισμάτων με οφειλές:")
            for apt in apartments_with_debt:
                print(f"  - Διαμέρισμα {apt.number}: {apt.current_balance:8.2f}€")
        
        print("\n" + "="*60)
        print("💳 5. ΕΙΣΠΡΑΞΕΙΣ (ΠΛΗΡΩΜΕΣ)")
        print("="*60)
        
        # All payments
        payments = Payment.objects.all().order_by('-date')
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📋 Συνολικές εισπράξεις: {payments.count()}")
        print(f"💰 Συνολικό ποσό εισπράξεων: {total_payments:10.2f}€")
        
        # Payments by method
        payment_methods = payments.values('method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        print("\n📊 Κατανομή ανά τρόπο πληρωμής:")
        for method_data in payment_methods:
            method_label = dict(Payment.PAYMENT_METHODS).get(method_data['method'], method_data['method'])
            print(f"  - {method_label}: {method_data['count']} πληρωμές, {method_data['total']:8.2f}€")
        
        print("\n" + "="*60)
        print("📊 6. ΣΥΝΟΠΤΙΚΗ ΕΠΙΚΥΡΩΣΗ")
        print("="*60)
        
        # Verify calculations
        print("🔍 Επιβεβαίωση υπολογισμών:")
        
        # Check if current_reserve matches payments - expenses
        all_expenses = Expense.objects.all()
        total_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        expected_reserve = total_payments - total_expenses
        print(f"  - Συνολικές εισπράξεις: {total_payments:10.2f}€")
        print(f"  - Συνολικές δαπάνες: {total_expenses:10.2f}€")
        print(f"  - Αναμενόμενο αποθεματικό: {expected_reserve:10.2f}€")
        print(f"  - Πραγματικό αποθεματικό: {current_reserve:10.2f}€")
        
        if abs(expected_reserve - current_reserve) > Decimal('0.01'):
            print(f"  ⚠️  ΔΙΑΦΟΡΑ: {abs(expected_reserve - current_reserve):10.2f}€")
        else:
            print("  ✅ Τα ποσά ταιριάζουν!")
        
        print("\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    check_dashboard_all() 