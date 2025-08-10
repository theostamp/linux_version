#!/usr/bin/env python3
"""
Λεπτομερής έλεγχος διαμερίσματος Α1 - Κτίριο 3
Detailed audit for apartment A1 in building 3
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime

# Django setup
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(script_dir, 'backend')
sys.path.append(backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

# Import models after Django setup
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Transaction

def detailed_a1_audit():
    """Perform detailed audit of apartment A1 in building 3"""
    
    print("🏠 ΛΕΠΤΟΜΕΡΗΣ ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
    print("=" * 70)
    
    try:
        # Find building 3
        building = Building.objects.get(id=3)
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        
        # Find apartment A1
        apartment_a1 = Apartment.objects.get(building=building, number='Α1')
        print(f"\n🏠 Διαμέρισμα: {apartment_a1.number}")
        print(f"👤 Ιδιοκτήτης: {apartment_a1.owner_name}")
        print(f"🏠 Ενοικιαστής: {apartment_a1.tenant_name or 'Κανένας'}")
        print(f"💰 Τρέχον Υπόλοιπο: {apartment_a1.current_balance:.2f}€")
        print(f"📐 Τετραγωνικά μέτρα: {apartment_a1.square_meters}μ²")
        print(f"⚖️ Χιλιοστά συμμετοχής: {apartment_a1.participation_mills}")
        
        # Get all payments for apartment A1
        payments = Payment.objects.filter(apartment=apartment_a1).order_by('date')
        print(f"\n💰 ΠΛΗΡΩΜΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
        print(f"📊 Συνολικές πληρωμές: {payments.count()}")
        
        if payments.exists():
            total_payments = sum(payment.amount for payment in payments)
            print(f"💵 Συνολικό ποσό πληρωμών: {total_payments:.2f}€")
            
            print(f"\n📋 Λεπτομερής λίστα πληρωμών:")
            print("-" * 70)
            print(f"{'Ημερομηνία':<12} {'Ποσό':<10} {'Τρόπος':<18} {'Τύπος':<15} {'ID'}")
            print("-" * 70)
            
            for payment in payments:
                print(f"{payment.date.strftime('%Y-%m-%d'):<12} "
                      f"{payment.amount:>8.2f}€ "
                      f"{payment.get_method_display():<18} "
                      f"{payment.get_type_display():<15} "
                      f"{payment.id}")
            
            # Group payments by month
            print(f"\n📅 ΟΜΑΔΟΠΟΙΗΣΗ ΑΝΑ ΜΗΝΑ:")
            print("-" * 50)
            monthly_totals = {}
            for payment in payments:
                month_key = payment.date.strftime('%Y-%m')
                if month_key not in monthly_totals:
                    monthly_totals[month_key] = {'count': 0, 'total': Decimal('0')}
                monthly_totals[month_key]['count'] += 1
                monthly_totals[month_key]['total'] += payment.amount
            
            for month, data in sorted(monthly_totals.items()):
                print(f"{month}: {data['count']} πληρωμές - {data['total']:.2f}€")
                
        # Get all transactions for apartment A1
        transactions = Transaction.objects.filter(apartment=apartment_a1).order_by('created_at')
        print(f"\n💸 ΣΥΝΑΛΛΑΓΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
        print(f"📊 Συνολικές συναλλαγές: {transactions.count()}")
        
        if transactions.exists():
            print(f"\n📋 Λεπτομερής λίστα συναλλαγών:")
            print("-" * 80)
            print(f"{'Ημερομηνία':<20} {'Τύπος':<10} {'Ποσό':<12} {'Περιγραφή':<25} {'ID'}")
            print("-" * 80)
            
            running_balance = Decimal('0')
            for transaction in transactions:
                if transaction.type == 'charge':
                    running_balance -= transaction.amount
                elif transaction.type == 'payment':
                    running_balance += transaction.amount
                    
                print(f"{transaction.created_at.strftime('%Y-%m-%d %H:%M'):<20} "
                      f"{transaction.type:<10} "
                      f"{transaction.amount:>10.2f}€ "
                      f"{transaction.description[:25]:<25} "
                      f"{transaction.id}")
            
            print(f"\n💰 Υπολογισμένο τελικό υπόλοιπο: {running_balance:.2f}€")
            print(f"💰 Αποθηκευμένο υπόλοιπο: {apartment_a1.current_balance:.2f}€")
            
            if abs(running_balance - apartment_a1.current_balance) < 0.01:
                print("✅ Τα υπόλοιπα συμφωνούν!")
            else:
                print("❌ ΠΡΟΣΟΧΗ: Ασυμφωνία στα υπόλοιπα!")
                
        # Check payment-transaction consistency
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ ΠΛΗΡΩΜΩΝ-ΣΥΝΑΛΛΑΓΩΝ:")
        payment_transactions = transactions.filter(type='payment')
        print(f"📊 Πληρωμές: {payments.count()}")
        print(f"📊 Payment συναλλαγές: {payment_transactions.count()}")
        
        if payments.count() == payment_transactions.count():
            print("✅ Κάθε πληρωμή έχει αντίστοιχη συναλλαγή!")
        else:
            print("❌ ΠΡΟΣΟΧΗ: Ασυνέπεια μεταξύ πληρωμών και συναλλαγών!")
            
        # Check for recent large payments
        print(f"\n🔍 ΕΛΕΓΧΟΣ ΜΕΓΑΛΩΝ ΠΛΗΡΩΜΩΝ (>1000€):")
        large_payments = payments.filter(amount__gt=1000)
        if large_payments.exists():
            for payment in large_payments:
                print(f"💰 {payment.date}: {payment.amount}€ - {payment.get_method_display()}")
        else:
            print("ℹ️ Δεν βρέθηκαν μεγάλες πληρωμές")
            
        # Monthly due calculation (if available)
        if hasattr(apartment_a1, 'monthly_due') and apartment_a1.monthly_due:
            print(f"\n📅 ΑΝΑΛΥΣΗ ΜΗΝΙΑΙΩΝ ΟΦΕΙΛΩΝ:")
            print(f"💰 Μηνιαία οφειλή: {apartment_a1.monthly_due:.2f}€")
            
            # Calculate how many months the current balance covers
            if apartment_a1.monthly_due > 0:
                months_covered = apartment_a1.current_balance / apartment_a1.monthly_due
                print(f"📅 Κάλυψη μηνών με τρέχον υπόλοιπο: {months_covered:.1f} μήνες")
        
    except Building.DoesNotExist:
        print("❌ Κτίριο 3 δεν βρέθηκε")
    except Apartment.DoesNotExist:
        print("❌ Διαμέρισμα Α1 δεν βρέθηκε στο κτίριο 3")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 ΛΕΠΤΟΜΕΡΗΣ ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
    print(f"⏰ Ημερομηνία: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    detailed_a1_audit()
    print("\n" + "=" * 70)
    print("✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
