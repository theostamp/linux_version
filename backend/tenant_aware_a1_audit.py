#!/usr/bin/env python3
"""
Tenant-aware λεπτομερής έλεγχος διαμερίσματος Α1 - Κτίριο 3
Using django-tenants to access tenant-specific data
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

# Import models and tenant utilities after Django setup
from django_tenants.utils import schema_context
from tenants.models import Client
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Transaction

def detailed_a1_audit_with_tenant():
    """Perform detailed audit of apartment A1 in building 3 using proper tenant context"""
    
    print("🏠 ΛΕΠΤΟΜΕΡΗΣ ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1 (TENANT-AWARE)")
    print("=" * 80)
    
    try:
        # Get the demo tenant
        demo_tenant = Client.objects.get(schema_name='demo')
        print(f"🏢 Χρησιμοποιούμε tenant: {demo_tenant.name} (schema: {demo_tenant.schema_name})")
        
        # Use tenant context for all queries
        with schema_context(demo_tenant.schema_name):
            
            # Find building 3
            buildings = Building.objects.all()
            print(f"🏗️ Διαθέσιμα κτίρια: {buildings.count()}")
            
            if buildings.count() > 0:
                print("📋 Λίστα κτιρίων:")
                for building in buildings:
                    print(f"  {building.id}: {building.name} - {building.address}")
            
            try:
                building = Building.objects.get(id=3)
                print(f"\n🏢 Κτίριο 3: {building.name}")
                print(f"📍 Διεύθυνση: {building.address}")
                
                # Find all apartments in building 3
                apartments = Apartment.objects.filter(building=building)
                print(f"\n🏠 Διαμερίσματα στο κτίριο 3: {apartments.count()}")
                
                print("📋 Λίστα διαμερισμάτων:")
                for apt in apartments:
                    print(f"  {apt.number}: {apt.owner_name} - Υπόλοιπο: {apt.current_balance:.2f}€")
                
                # Find apartment A1
                try:
                    apartment_a1 = Apartment.objects.get(building=building, number='Α1')
                    print(f"\n🎯 ΕΣΤΙΑΣΗ ΣΤΟ ΔΙΑΜΕΡΙΣΜΑ Α1")
                    print("-" * 50)
                    print(f"🏠 Διαμέρισμα: {apartment_a1.number}")
                    print(f"🆔 ID: {apartment_a1.id}")
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
                        print("-" * 80)
                        print(f"{'ID':<5} {'Ημερομηνία':<12} {'Ποσό':<12} {'Τρόπος':<18} {'Περιγραφή':<20}")
                        print("-" * 80)
                        
                        for payment in payments:
                            description = (payment.description or '')[:20] if hasattr(payment, 'description') else ''
                            print(f"{payment.id:<5} "
                                  f"{payment.date.strftime('%Y-%m-%d'):<12} "
                                  f"{payment.amount:>10.2f}€ "
                                  f"{payment.get_method_display():<18} "
                                  f"{description:<20}")
                        
                        # Group payments by month
                        print(f"\n📅 ΟΜΑΔΟΠΟΙΗΣΗ ΑΝΑ ΜΗΝΑ:")
                        print("-" * 60)
                        monthly_totals = {}
                        for payment in payments:
                            month_key = payment.date.strftime('%Y-%m')
                            if month_key not in monthly_totals:
                                monthly_totals[month_key] = {'count': 0, 'total': Decimal('0')}
                            monthly_totals[month_key]['count'] += 1
                            monthly_totals[month_key]['total'] += payment.amount
                        
                        for month, data in sorted(monthly_totals.items()):
                            print(f"{month}: {data['count']} πληρωμές - {data['total']:.2f}€")
                        
                        # Check for recent large payments
                        print(f"\n🔍 ΜΕΓΑΛΕΣ ΠΛΗΡΩΜΕΣ (>1000€):")
                        large_payments = payments.filter(amount__gt=1000)
                        if large_payments.exists():
                            for payment in large_payments:
                                print(f"💰 {payment.date}: {payment.amount:.2f}€ - {payment.get_method_display()}")
                                print(f"   📝 Περιγραφή: {payment.description or 'Χωρίς περιγραφή'}")
                        else:
                            print("ℹ️ Δεν βρέθηκαν μεγάλες πληρωμές")
                            
                    # Get all transactions for apartment A1
                    transactions = Transaction.objects.filter(apartment=apartment_a1).order_by('created_at')
                    print(f"\n💸 ΣΥΝΑΛΛΑΓΕΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
                    print(f"📊 Συνολικές συναλλαγές: {transactions.count()}")
                    
                    if transactions.exists():
                        print(f"\n📋 Τελευταίες 10 συναλλαγές:")
                        print("-" * 90)
                        print(f"{'ID':<5} {'Ημερομηνία':<20} {'Τύπος':<10} {'Ποσό':<12} {'Περιγραφή':<30}")
                        print("-" * 90)
                        
                        recent_transactions = transactions.order_by('-created_at')[:10]
                        for transaction in recent_transactions:
                            print(f"{transaction.id:<5} "
                                  f"{transaction.created_at.strftime('%Y-%m-%d %H:%M'):<20} "
                                  f"{transaction.type:<10} "
                                  f"{transaction.amount:>10.2f}€ "
                                  f"{transaction.description[:30]:<30}")
                        
                        # Calculate balance verification
                        print(f"\n💰 ΕΛΕΓΧΟΣ ΥΠΟΛΟΙΠΟΥ:")
                        running_balance = Decimal('0')
                        for transaction in transactions.order_by('created_at'):
                            if transaction.type == 'charge':
                                running_balance -= transaction.amount
                            elif transaction.type == 'payment':
                                running_balance += transaction.amount
                        
                        print(f"💰 Υπολογισμένο υπόλοιπο: {running_balance:.2f}€")
                        print(f"💰 Αποθηκευμένο υπόλοιπο: {apartment_a1.current_balance:.2f}€")
                        
                        if abs(running_balance - apartment_a1.current_balance) < 0.01:
                            print("✅ Τα υπόλοιπα συμφωνούν!")
                        else:
                            print("❌ ΠΡΟΣΟΧΗ: Ασυμφωνία στα υπόλοιπα!")
                            
                        # Check payment-transaction consistency
                        print(f"\n🔍 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ:")
                        payment_transactions = transactions.filter(type='payment')
                        print(f"📊 Πληρωμές: {payments.count()}")
                        print(f"📊 Payment συναλλαγές: {payment_transactions.count()}")
                        
                        if payments.count() == payment_transactions.count():
                            print("✅ Κάθε πληρωμή έχει αντίστοιχη συναλλαγή!")
                        else:
                            print("❌ ΠΡΟΣΟΧΗ: Ασυνέπεια μεταξύ πληρωμών και συναλλαγών!")
                        
                except Apartment.DoesNotExist:
                    print("❌ Διαμέρισμα Α1 δεν βρέθηκε στο κτίριο 3")
                    
            except Building.DoesNotExist:
                print("❌ Κτίριο 3 δεν βρέθηκε")
                
    except Client.DoesNotExist:
        print("❌ Demo tenant δεν βρέθηκε")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 TENANT-AWARE ΛΕΠΤΟΜΕΡΗΣ ΕΛΕΓΧΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ Α1")
    print(f"⏰ Ημερομηνία: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    detailed_a1_audit_with_tenant()
    print("\n" + "=" * 80)
    print("✅ ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ")
