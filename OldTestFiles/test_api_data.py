#!/usr/bin/env python3
"""
Script για έλεγχο δεδομένων μέσω API
"""

import requests

def test_api_data():
    """Ελέγχος δεδομένων μέσω API"""
    
    base_url = "http://demo.localhost:8000/api"
    
    # Test payments for building 3
    print("🔍 ΕΛΕΓΧΟΣ API ΔΕΔΟΜΕΝΩΝ")
    print("=" * 50)
    
    # Test payments endpoint
    print("\n💰 ΕΛΕΓΧΟΣ ΕΙΣΠΡΑΞΕΩΝ ΚΤΙΡΙΟΥ 3:")
    try:
        response = requests.get(f"{base_url}/financial/payments/?building_id=3")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Επιστράφηκαν {len(data)} εισπράξεις")
            
            # Calculate total amount
            total_amount = sum(float(payment['amount']) for payment in data)
            print(f"💰 Συνολικό ποσό: {total_amount:.2f}€")
            
            # Group by apartment
            apartments = {}
            for payment in data:
                apartment_id = payment['apartment']
                if apartment_id not in apartments:
                    apartments[apartment_id] = {
                        'payments': [],
                        'total': 0,
                        'apartment_number': payment.get('apartment_number', f'ID:{apartment_id}'),
                        'owner_name': payment.get('owner_name', ''),
                        'current_balance': payment.get('current_balance', 0)
                    }
                apartments[apartment_id]['payments'].append(payment)
                apartments[apartment_id]['total'] += float(payment['amount'])
            
            print("\n📊 ΕΙΣΠΡΑΞΕΙΣ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ:")
            for apartment_id, apartment_data in apartments.items():
                print(f"  - {apartment_data['apartment_number']}: {apartment_data['total']:.2f}€ ({len(apartment_data['payments'])} πληρωμές)")
                print(f"    Ιδιοκτήτης: {apartment_data['owner_name']}")
                print(f"    Τρέχον υπόλοιπο: {apartment_data['current_balance']:.2f}€")
                
                # Show individual payments
                for payment in apartment_data['payments']:
                    print(f"      • {payment['amount']}€ ({payment['date']}) - {payment.get('method_display', payment['method'])}")
                print()
            
        else:
            print(f"❌ Σφάλμα: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test transactions for specific apartments
    print("\n💸 ΕΛΕΓΧΟΣ ΣΥΝΑΛΛΑΓΩΝ:")
    for apartment_id in [10, 11]:  # C2 and C3
        try:
            response = requests.get(f"{base_url}/financial/apartments/{apartment_id}/transactions/")
            print(f"\n🏠 Διαμέρισμα {apartment_id}:")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Επιστράφηκαν {len(data)} συναλλαγές")
                
                # Show transactions
                running_balance = 0
                for transaction in data:
                    amount = float(transaction['amount'])
                    running_balance += amount
                    print(f"  • {transaction['type']}: {amount:+.2f}€ - {transaction['description']}")
                    print(f"    Υπόλοιπο: {running_balance:.2f}€")
                
            else:
                print(f"❌ Σφάλμα: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {e}")
    
    print("\n✅ Έλεγχος ολοκληρώθηκε")

if __name__ == "__main__":
    test_api_data()
