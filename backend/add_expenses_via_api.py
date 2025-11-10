#!/usr/bin/env python3
import requests

def add_expenses_via_api():
    base_url = "http://localhost:8000"
    headers = {"Host": "demo.localhost"}
    
    # Login first
    login_data = {
        "email": "admin@demo.localhost",
        "password": "admin123456"
    }
    
    print("Logging in...")
    login_response = requests.post(
        f"{base_url}/api/users/login/",
        headers=headers,
        json=login_data
    )
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    login_result = login_response.json()
    access_token = login_result['access']
    
    # Add authorization header
    headers['Authorization'] = f"Bearer {access_token}"
    
    print("Login successful!")
    
    # August 2025 expenses data
    august_expenses = [
        {
            'building': 1,
            'title': 'ΔΕΗ Κοινοχρήστων - Αύγουστος 2025',
            'amount': 280.00,
            'date': '2025-08-05',
            'category': 'electricity_common',
            'distribution_type': 'by_participation_mills',
            'notes': 'Ηλεκτρικό ρεύμα κοινοχρήστων χώρων'
        },
        {
            'building': 1,
            'title': 'Καθαρισμός Κοινοχρήστων - Αύγουστος 2025',
            'amount': 320.00,
            'date': '2025-08-10',
            'category': 'cleaning',
            'distribution_type': 'by_participation_mills',
            'notes': 'Καθαρισμός κοινοχρήστων χώρων'
        },
        {
            'building': 1,
            'title': 'Συντήρηση Ανελκυστήρα - Αύγουστος 2025',
            'amount': 180.00,
            'date': '2025-08-15',
            'category': 'elevator_maintenance',
            'distribution_type': 'by_participation_mills',
            'notes': 'Μηνιαία συντήρηση ανελκυστήρα'
        },
        {
            'building': 1,
            'title': 'Νερό Κοινοχρήστων - Αύγουστος 2025',
            'amount': 150.00,
            'date': '2025-08-20',
            'category': 'water_common',
            'distribution_type': 'by_participation_mills',
            'notes': 'Νερό κοινοχρήστων χώρων'
        },
        {
            'building': 1,
            'title': 'Ασφάλεια Κτιρίου - Αύγουστος 2025',
            'amount': 120.00,
            'date': '2025-08-25',
            'category': 'building_insurance',
            'distribution_type': 'by_participation_mills',
            'notes': 'Μηνιαία ασφάλεια κτιρίου'
        }
    ]
    
    created_expenses = []
    
    for expense_data in august_expenses:
        print(f"Creating expense: {expense_data['title']}")
        
        response = requests.post(
            f"{base_url}/api/financial/expenses/",
            headers=headers,
            json=expense_data
        )
        
        if response.status_code == 201:
            created_expense = response.json()
            created_expenses.append(created_expense)
            print(f"✅ Created: {created_expense['title']} - {created_expense['amount']}€")
        else:
            print(f"❌ Failed to create: {expense_data['title']}")
            print(f"Error: {response.text}")
    
    print(f"\nCreated {len(created_expenses)} expenses for August 2025")
    
    # Check unissued expenses
    print("\nChecking unissued expenses...")
    pending_response = requests.get(
        f"{base_url}/api/financial/expenses/pending/?building_id=1",
        headers=headers
    )
    
    if pending_response.status_code == 200:
        pending_expenses = pending_response.json()
        print(f"Total unissued expenses: {len(pending_expenses)}")
        total_amount = sum(exp['amount'] for exp in pending_expenses)
        print(f"Total unissued amount: {total_amount}€")
        
        for expense in pending_expenses:
            print(f"  - {expense['title']}: {expense['amount']}€")

if __name__ == "__main__":
    add_expenses_via_api()

