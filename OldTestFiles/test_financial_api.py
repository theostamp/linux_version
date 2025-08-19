#!/usr/bin/env python3
"""
Script για έλεγχο του financial API μετά τη διόρθωση του αποθεματικού
"""

import requests
import json
from decimal import Decimal

def test_financial_api():
    """Έλεγχος του financial API"""
    
    # URL για το financial dashboard
    base_url = "http://demo.localhost:8000"
    api_url = f"{base_url}/api/financial/dashboard/summary/"
    
    # Παράμετροι για το κτίριο Αλκμάνος 22
    params = {
        'building_id': '4',  # ID του κτιρίου Αλκμάνος 22
        'month': '2025-08'   # Αύγουστος 2025
    }
    
    print("🔍 Έλεγχος Financial API...")
    print(f"   URL: {api_url}")
    print(f"   Παράμετροι: {params}")
    
    try:
        # Κλήση του API
        response = requests.get(api_url, params=params)
        
        print(f"\n📊 Απόκριση API:")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n💰 Δεδομένα Αποθεματικού:")
            print(f"   Τρέχον Αποθεματικό: {data.get('current_reserve', 'N/A')}€")
            print(f"   Εισφορά Αποθεματικού: {data.get('reserve_fund_contribution', 'N/A')}€")
            print(f"   Στόχος Αποθεματικού: {data.get('reserve_fund_goal', 'N/A')}€")
            
            print(f"\n📈 Γενικά Οικονομικά:")
            print(f"   Συνολικό Υπόλοιπο: {data.get('total_balance', 'N/A')}€")
            print(f"   Τρέχουσες Υποχρεώσεις: {data.get('current_obligations', 'N/A')}€")
            print(f"   Δαπάνες Μήνα: {data.get('total_expenses_month', 'N/A')}€")
            print(f"   Πληρωμές Μήνα: {data.get('total_payments_month', 'N/A')}€")
            
            # Έλεγχος αν το αποθεματικό είναι σωστό
            current_reserve = data.get('current_reserve', 0)
            if current_reserve == 0:
                print(f"\n✅ ΣΩΣΤΟ! Το αποθεματικό είναι 0€ όπως πρέπει για νέο κτίριο χωρίς συναλλαγές.")
            else:
                print(f"\n❌ ΛΑΘΟΣ! Το αποθεματικό είναι {current_reserve}€ αντί για 0€.")
            
            # Εμφάνιση πλήρων δεδομένων για debugging
            print(f"\n📋 Πλήρη Απόκριση API:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
        else:
            print(f"   ❌ Σφάλμα API: {response.status_code}")
            print(f"   Απόκριση: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Σφάλμα σύνδεσης: {e}")

if __name__ == "__main__":
    test_financial_api() 