#!/usr/bin/env python3
"""
Test script για το βελτιωμένο Financial Dashboard
Τεστάρει το νέο API endpoint και την ορολογία
"""

import os
import sys
import django
import requests

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context

def test_improved_financial_api():
    """Τεστάρει το νέο improved-summary API endpoint"""
    
    print("🧪 Testing Improved Financial Dashboard API")
    print("=" * 50)
    
    # Test parameters
    building_id = 2  # Αλκμάνος 22
    month = "2025-08"  # Αύγουστος 2025
    
    # API endpoint
    url = "http://localhost:8000/api/financial/dashboard/improved-summary/"
    params = {
        'building_id': building_id,
        'month': month
    }
    
    try:
        print(f"📡 Making API request to: {url}")
        print(f"📋 Parameters: {params}")
        
        response = requests.get(url, params=params)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ API Response Success!")
            print("📋 Improved Financial Data Structure:")
            print("-" * 40)
            
            # Display improved structure
            print(f"🏢 Building: {building_id}")
            print(f"📅 Current Month: {data.get('current_month_name', 'N/A')}")
            print(f"📅 Previous Month: {data.get('previous_month_name', 'N/A')}")
            print()
            
            print("💰 ΤΙΜΟΛΟΓΙΟ ΜΗΝΑ:")
            print(f"  • Λειτουργικές δαπάνες {data.get('previous_month_name', 'N/A')}: €{data.get('previous_month_expenses', 0):,.2f}")
            print(f"  • Αμοιβή διαχείρισης: €{data.get('management_fees', 0):,.2f}")
            print(f"  • Εισφορά αποθεματικού: €{data.get('reserve_fund_contribution', 0):,.2f}")
            print(f"  • Σύνολο τιμολογίου: €{data.get('invoice_total', 0):,.2f}")
            print()
            
            print("📈 ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ:")
            print(f"  • Τιμολόγιο {data.get('current_month_name', 'N/A')}: €{data.get('current_invoice', 0):,.2f}")
            print(f"  • Προηγούμενα υπόλοιπα: €{data.get('previous_balances', 0):,.2f}")
            print(f"  • Συνολικές οφειλές: €{data.get('grand_total', 0):,.2f}")
            print()
            
            print("📊 ΚΑΛΥΨΗ ΥΠΟΧΡΕΩΣΕΩΝ:")
            print(f"  • Κάλυψη τιμολογίου: {data.get('current_invoice_coverage_percentage', 0):.1f}%")
            print(f"  • Κάλυψη συνολικών οφειλών: {data.get('total_coverage_percentage', 0):.1f}%")
            print()
            
            print("🎯 ΑΠΟΘΕΜΑΤΙΚΟ:")
            print(f"  • Τρέχον: €{data.get('current_reserve', 0):,.2f}")
            print(f"  • Στόχος: €{data.get('reserve_target', 0):,.2f}")
            print(f"  • Πρόοδος: {data.get('reserve_progress_percentage', 0):.1f}%")
            print()
            
            print("🏢 ΚΤΙΡΙΟ:")
            print(f"  • Διαμερίσματα: {data.get('apartment_count', 0)}")
            print(f"  • Μηνιαία δραστηριότητα: {'Ναι' if data.get('has_monthly_activity', False) else 'Όχι'}")
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")

def compare_old_vs_new_terminology():
    """Συγκρίνει την παλιά με τη νέα ορολογία"""
    
    print("\n🔄 Terminology Comparison")
    print("=" * 50)
    
    terminology_mapping = {
        'Πραγματικά έξοδα': 'Λειτουργικές δαπάνες',
        'Οικονομικές Υποχρεώσεις Περιόδου': 'Τιμολόγιο Μήνα',
        'Παλαιότερες οφειλές': 'Προηγούμενα υπόλοιπα',
        'Μηνιαίες υποχρεώσεις': 'Σύνολο τιμολογίου',
        'Κόστος διαχείρισης': 'Αμοιβή διαχείρισης',
        'Εισφορά αποθεματικού': 'Μηνιαία εισφορά αποθεματικού'
    }
    
    print("📋 Βελτιωμένη Ορολογία:")
    print("-" * 30)
    
    for old_term, new_term in terminology_mapping.items():
        print(f"❌ {old_term}")
        print(f"✅ {new_term}")
        print()

def test_data_flow():
    """Τεστάρει τη ροή δεδομένων Ιούλιος → Αύγουστος"""
    
    print("\n🔄 Data Flow Test: Ιούλιος → Αύγουστος")
    print("=" * 50)
    
    with schema_context('demo'):
        from financial.models import Expense, Payment
        from buildings.models import Building
        
        building = Building.objects.get(id=2)  # Αλκμάνος 22
        
        print(f"🏢 Building: {building.name}")
        print(f"📍 Address: {building.address}")
        
        # Check July expenses
        july_expenses = Expense.objects.filter(
            building=building,
            date__year=2025,
            date__month=7
        )
        
        print("\n📊 Ιούλιος 2025 - Έξοδα που θα τιμολογηθούν Αύγουστο:")
        total_july = 0
        for expense in july_expenses:
            print(f"  • {expense.description}: €{expense.amount:,.2f}")
            total_july += float(expense.amount)
        
        print(f"  📋 Σύνολο λειτουργικών δαπανών Ιουλίου: €{total_july:,.2f}")
        
        # Check August payments
        august_payments = Payment.objects.filter(
            apartment__building=building,
            date__year=2025,
            date__month=8
        )
        
        print("\n💰 Αύγουστος 2025 - Πληρωμές:")
        total_august_payments = 0
        for payment in august_payments:
            print(f"  • Διαμ. {payment.apartment.number}: €{payment.amount:,.2f}")
            total_august_payments += float(payment.amount)
        
        print(f"  📋 Σύνολο πληρωμών Αυγούστου: €{total_august_payments:,.2f}")
        
        # Calculate coverage
        if total_july > 0:
            coverage = (total_august_payments / total_july) * 100
            print(f"\n📊 Κάλυψη λειτουργικών δαπανών: {coverage:.1f}%")
            
            if coverage >= 100:
                print("✅ Εξαιρετική κάλυψη!")
            elif coverage >= 50:
                print("⚠️ Μέτρια κάλυψη")
            else:
                print("❌ Χαμηλή κάλυψη - χρειάζονται περισσότερες εισπράξεις")

if __name__ == "__main__":
    print("🚀 Starting Improved Financial Dashboard Tests")
    print("=" * 60)
    
    # Test 1: API Endpoint
    test_improved_financial_api()
    
    # Test 2: Terminology Comparison
    compare_old_vs_new_terminology()
    
    # Test 3: Data Flow
    test_data_flow()
    
    print("\n✅ All tests completed!")
    print("=" * 60)
