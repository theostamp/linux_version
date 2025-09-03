#!/usr/bin/env python3
"""
Simple Check για το πρόβλημα με τις πληρωμές
"""

import requests

def check_payment_api():
    """Έλεγχος του API για πληρωμές"""
    
    print("🔍 ΕΛΕΓΧΟΣ API ΠΛΗΡΩΜΩΝ")
    print("=" * 40)
    
    base_url = "http://demo.localhost:8000/api"
    
    # 1. Έλεγχος για πληρωμές
    try:
        print("1. Έλεγχος για πληρωμές...")
        response = requests.get(f"{base_url}/financial/payments/")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            payments = data.get('results', [])
            print(f"✅ Βρέθηκαν {len(payments)} πληρωμές")
            
            if payments:
                print("📋 Τελευταίες πληρωμές:")
                for payment in payments[:3]:
                    print(f"   - {payment.get('apartment_number', 'N/A')}: {payment.get('amount')}€ ({payment.get('date')})")
            else:
                print("⚠️ Δεν βρέθηκαν πληρωμές")
        else:
            print(f"❌ Σφάλμα: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο πληρωμών: {e}")
    
    # 2. Έλεγχος για transactions
    try:
        print("\n2. Έλεγχος για transactions...")
        response = requests.get(f"{base_url}/financial/transactions/")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            transactions = data.get('results', [])
            print(f"✅ Βρέθηκαν {len(transactions)} transactions")
            
            if transactions:
                print("📋 Τελευταίες transactions:")
                for transaction in transactions[:3]:
                    print(f"   - {transaction.get('type')}: {transaction.get('amount')}€ ({transaction.get('date')})")
            else:
                print("⚠️ Δεν βρέθηκαν transactions")
        else:
            print(f"❌ Σφάλμα: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο transactions: {e}")
    
    # 3. Έλεγχος για dashboard summary
    try:
        print("\n3. Έλεγχος για dashboard summary...")
        response = requests.get(f"{base_url}/financial/dashboard/summary/?building_id=1")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Dashboard summary:")
            print(f"   - Current reserve: {data.get('current_reserve', 'N/A')}€")
            print(f"   - Total obligations: {data.get('total_obligations', 'N/A')}€")
            print(f"   - Total expenses this month: {data.get('total_expenses_this_month', 'N/A')}€")
            print(f"   - Total payments this month: {data.get('total_payments_this_month', 'N/A')}€")
        else:
            print(f"❌ Σφάλμα: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Σφάλμα κατά τον έλεγχο dashboard: {e}")

def create_test_payment():
    """Δημιουργία test πληρωμής μέσω API"""
    
    print("\n🧪 ΔΗΜΙΟΥΡΓΙΑ TEST ΠΛΗΡΩΜΗΣ ΜΕΣΩ API")
    print("=" * 50)
    
    base_url = "http://demo.localhost:8000/api"
    
    # Πρώτα χρειαζόμαστε ένα διαμέρισμα
    try:
        print("1. Εύρεση διαμερίσματος...")
        response = requests.get(f"{base_url}/apartments/")
        
        if response.status_code == 200:
            data = response.json()
            apartments = data.get('results', [])
            
            if apartments:
                apartment = apartments[0]
                apartment_id = apartment['id']
                print(f"✅ Βρέθηκε διαμέρισμα: {apartment.get('number')} (ID: {apartment_id})")
                
                # Δημιουργία test πληρωμής
                payment_data = {
                    "apartment": apartment_id,
                    "amount": "150.00",
                    "date": "2025-01-05",
                    "method": "bank_transfer",
                    "payment_type": "common_expense",
                    "reference_number": "TEST-API-001",
                    "notes": "Test πληρωμή φυσικού αερίου μέσω API"
                }
                
                print("2. Δημιουργία πληρωμής...")
                response = requests.post(f"{base_url}/financial/payments/", json=payment_data)
                print(f"Status: {response.status_code}")
                
                if response.status_code == 201:
                    payment = response.json()
                    print("✅ Test πληρωμή δημιουργήθηκε!")
                    print(f"   - ID: {payment.get('id')}")
                    print(f"   - Ποσό: {payment.get('amount')}€")
                    print(f"   - Ημερομηνία: {payment.get('date')}")
                    print(f"   - Τύπος: {payment.get('payment_type')}")
                    print(f"   - Αναφορά: {payment.get('reference_number')}")
                else:
                    print(f"❌ Σφάλμα κατά τη δημιουργία: {response.status_code}")
                    print(f"Response: {response.text}")
            else:
                print("❌ Δεν βρέθηκαν διαμερίσματα")
        else:
            print(f"❌ Σφάλμα κατά την εύρεση διαμερισμάτων: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Σφάλμα: {e}")

def main():
    """Main function"""
    
    print("🚀 ΕΚΚΙΝΗΣΗ SIMPLE CHECK ΠΡΟΒΛΗΜΑΤΟΣ ΠΛΗΡΩΜΩΝ")
    print("Έλεγχος γιατί δεν εμφανίζονται οι πληρωμές στο dashboard")
    print()
    
    # Έλεγχος API
    check_payment_api()
    
    # Ερώτηση για δημιουργία test πληρωμής
    print("\n🧪 Θέλετε να δημιουργήσω μια test πληρωμή μέσω API; (y/n)")
    response = input().lower().strip()
    
    if response in ['y', 'yes', 'ναι']:
        create_test_payment()
        print("\n✅ Test πληρωμή δημιουργήθηκε!")
        print("💡 Ελέγξτε τώρα το dashboard για να δείτε αν εμφανίζεται")
    else:
        print("\nℹ️ Test πληρωμή παραλείφθηκε")

if __name__ == "__main__":
    main() 