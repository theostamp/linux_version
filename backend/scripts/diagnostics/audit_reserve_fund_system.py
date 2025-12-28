#!/usr/bin/env python3
"""
🔍 Audit Reserve Fund System

Αυτό το script ελέγχει και διορθώνει το σύστημα αποθεματικού
για να διασφαλίσει ότι το αποθεματικό είναι αυτόνομο ποσό
που δεν μπλέκεται με τα κοινοχρήστων.
"""

import os
import django
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import tenant_context
from tenants.models import Client
from buildings.models import Building
from financial.models import Payment, Expense
from apartments.models import Apartment

def audit_reserve_fund_system():
    """Ελέγχει και διορθώνει το σύστημα αποθεματικού"""
    
    print("🔍 AUDIT RESERVE FUND SYSTEM")
    print("=" * 50)
    
    try:
        # Get demo tenant
        client = Client.objects.get(schema_name='demo')
        print(f"🏢 Tenant: {client.name}")
        
        # Check in tenant context
        with tenant_context(client):
            buildings = Building.objects.all()
            print(f"📊 Βρέθηκαν {buildings.count()} κτίρια")
            
            for building in buildings:
                print(f"\n🏢 Κτίριο: {building.name}")
                print(f"   ID: {building.id}")
                
                # Check reserve fund settings
                print("\n🎯 Ρυθμίσεις Αποθεματικού:")
                print(f"   - Στόχος: {building.reserve_fund_goal or 0}€")
                print(f"   - Διάρκεια: {building.reserve_fund_duration_months or 0} μήνες")
                print(f"   - Ημερομηνία έναρξης: {building.reserve_fund_start_date or 'Δεν έχει οριστεί'}")
                print(f"   - Εισφορά ανά διαμέρισμα: {building.reserve_contribution_per_apartment or 0}€")
                
                # Calculate monthly target
                monthly_target = 0
                if building.reserve_fund_goal and building.reserve_fund_duration_months:
                    monthly_target = float(building.reserve_fund_goal) / float(building.reserve_fund_duration_months)
                print(f"   - Μηνιαίος στόχος: {monthly_target:.2f}€")
                
                # Check current reserve (this includes all transactions)
                print("\n💰 Τρέχον Αποθεματικό (συνολικό):")
                print(f"   - Στη βάση: {building.current_reserve or 0}€")
                
                # Calculate from transactions
                total_payments = Payment.objects.filter(
                    apartment__building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                total_expenses = Expense.objects.filter(
                    building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                calculated_reserve = total_payments - total_expenses
                print(f"   - Υπολογισμένο: {calculated_reserve}€")
                print(f"   - Συνολικές εισπράξεις: {total_payments}€")
                print(f"   - Συνολικές δαπάνες: {total_expenses}€")
                
                # Check if reserve fund collection has started
                if building.reserve_fund_start_date:
                    start_date = building.reserve_fund_start_date
                    current_date = timezone.now().date()
                    
                    # Calculate months passed
                    months_passed = max(0, 
                        (current_date.year - start_date.year) * 12 + 
                        (current_date.month - start_date.month)
                    )
                    
                    expected_reserve_contributions = months_passed * monthly_target
                    
                    print("\n📅 Συλλογή Αποθεματικού:")
                    print(f"   - Ημερομηνία έναρξης: {start_date}")
                    print(f"   - Μήνες που πέρασαν: {months_passed}")
                    print(f"   - Αναμενόμενες εισφορές: {expected_reserve_contributions:.2f}€")
                    
                    # Calculate reserve fund progress
                    if building.reserve_fund_goal and building.reserve_fund_goal > 0:
                        progress = (expected_reserve_contributions / float(building.reserve_fund_goal)) * 100
                        print(f"   - Πρόοδος αποθεματικού: {progress:.1f}%")
                        
                        # Check if there are pending obligations
                        apartments = Apartment.objects.filter(building_id=building.id)
                        total_obligations = sum(abs(apt.current_balance or 0) for apt in apartments)
                        
                        print("\n⚠️  Εκκρεμότητες:")
                        print(f"   - Συνολικές εκκρεμότητες διαμερισμάτων: {total_obligations}€")
                        
                        if total_obligations > 0:
                            print("   - ⚠️  Η συλλογή αποθεματικού είναι σε παύση λόγω εκκρεμοτήτων")
                        else:
                            print("   - ✅ Η συλλογή αποθεματικού είναι ενεργή")
                
                # Check apartments
                apartments = Apartment.objects.filter(building_id=building.id)
                print(f"\n🏠 Διαμερίσματα ({apartments.count()}):")
                
                for apt in apartments:
                    print(f"   - {apt.number}: {apt.current_balance or 0}€")
                
                print(f"\n{'='*50}")
        
        print("\n🎉 Το audit ολοκληρώθηκε!")
        
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

def fix_reserve_fund_calculations():
    """Διορθώνει τους υπολογισμούς αποθεματικού"""
    
    print("\n🔧 FIX RESERVE FUND CALCULATIONS")
    print("=" * 50)
    
    try:
        client = Client.objects.get(schema_name='demo')
        
        with tenant_context(client):
            buildings = Building.objects.all()
            
            for building in buildings:
                print(f"\n🏢 Διόρθωση κτιρίου: {building.name}")
                
                # Calculate correct reserve from transactions
                total_payments = Payment.objects.filter(
                    apartment__building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                total_expenses = Expense.objects.filter(
                    building_id=building.id
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                correct_reserve = total_payments - total_expenses
                
                # Update if different
                if building.current_reserve != correct_reserve:
                    old_reserve = building.current_reserve or Decimal('0.00')
                    building.current_reserve = correct_reserve
                    building.save()
                    
                    print("   ✅ Ενημερώθηκε αποθεματικό:")
                    print(f"      Παλιό: {old_reserve}€")
                    print(f"      Νέο: {correct_reserve}€")
                    print(f"      Διαφορά: {correct_reserve - old_reserve}€")
                else:
                    print("   ✅ Το αποθεματικό είναι σωστό!")
        
        print("\n🎉 Η διόρθωση ολοκληρώθηκε!")
        
    except Client.DoesNotExist:
        print("❌ Δεν βρέθηκε το demo tenant!")
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting Reserve Fund System Audit...")
    
    # Run audit
    audit_reserve_fund_system()
    
    # Ask if user wants to fix calculations
    response = input("\n🔧 Θέλετε να διορθώσετε τους υπολογισμούς; (y/n): ")
    if response.lower() in ['y', 'yes', 'ναι']:
        fix_reserve_fund_calculations()
    
    print("\n✅ Audit completed!")
