#!/usr/bin/env python3
"""
Test script to check API endpoint for duplicates
"""

import os
import sys
import django
import requests

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

def test_api_fix():
    """Test if API returns data without duplicates"""
    
    print("🔍 ΕΛΕΓΧΟΣ API ENDPOINT ΓΙΑ ΔΙΠΛΟΤΥΠΙΕΣ")
    print("=" * 50)
    
    try:
        # Test the apartment_transaction_history endpoint
        url = "http://localhost:8000/api/financial/dashboard/apartment_transaction_history/"
        params = {
            'building_id': 1,
            'apartment_id': 10,
            'months_back': 6
        }
        
        print(f"🌐 Testing API endpoint: {url}")
        print(f"📋 Parameters: {params}")
        print()
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response successful!")
            print()
            
            # Display apartment info
            apartment = data.get('apartment', {})
            print(f"🏠 Διαμέρισμα: {apartment.get('number', 'N/A')} - {apartment.get('owner_name', 'N/A')}")
            print(f"💰 Τρέχον Υπόλοιπο: {apartment.get('current_balance', 0)}€")
            print()
            
            # Display summary
            summary = data.get('summary', {})
            print("📈 ΣΥΝΟΨΗ:")
            print(f"   • Συνολικές χρεώσεις: {summary.get('total_charges', 0)}€")
            print(f"   • Συνολικές πληρωμές: {summary.get('total_payments', 0)}€")
            print(f"   • Καθαρό ποσό: {summary.get('net_amount', 0)}€")
            print(f"   • Μήνες με δραστηριότητα: {summary.get('months_with_activity', 0)}")
            print()
            
            # Display monthly data
            months = data.get('months', [])
            print(f"📅 ΙΣΤΟΡΙΚΟ ΑΝΑ ΜΗΝΑ:")
            for month_data in months:
                month_display = month_data.get('month_display', 'N/A')
                charges = month_data.get('charges', [])
                payments = month_data.get('payments', [])
                total_charges = month_data.get('total_charges', 0)
                total_payments = month_data.get('total_payments', 0)
                net_amount = month_data.get('net_amount', 0)
                
                if charges or payments:
                    print(f"📅 {month_display}:")
                    print(f"   💸 Χρεώσεις: {total_charges}€ ({len(charges)} κινήσεις)")
                    print(f"   💰 Πληρωμές: {total_payments}€ ({len(payments)} κινήσεις)")
                    print(f"   📊 Καθαρό: {net_amount}€")
                    
                    if payments:
                        print(f"   💳 Πληρωμές:")
                        for payment in payments:
                            print(f"      • {payment.get('description', 'N/A')}: {payment.get('amount', 0)}€ ({payment.get('type_display', 'N/A')})")
                    
                    print()
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")
    
    print("✅ Έλεγχος ολοκληρώθηκε!")

if __name__ == "__main__":
    test_api_fix()
