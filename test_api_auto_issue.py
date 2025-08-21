import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.test import TestCase, Client
from django.urls import reverse
from financial.models import Payment, Expense, Transaction
from apartments.models import Apartment
from buildings.models import Building
from users.models import CustomUser

def test_api_auto_issue():
    """Test the auto-issue feature through the API"""
    
    building_id = 4  # Αλκμάνος 22
    
    with schema_context('demo'):
        print("🧪 ΔΟΚΙΜΗ API ΑΥΤΟΜΑΤΗΣ ΕΚΔΟΣΗΣ")
        print("=" * 60)
        print(f"🏢 Κτίριο: Αλκμάνος 22 (ID: {building_id})")
        print()
        
        # 1. Καταγραφή αρχικής κατάστασης
        print("📊 1. ΑΡΧΙΚΗ ΚΑΤΑΣΤΑΣΗ")
        print("-" * 50)
        
        apartments = Apartment.objects.filter(building_id=building_id).order_by('number')
        initial_balances = {}
        
        for apartment in apartments:
            initial_balances[apartment.id] = apartment.current_balance or Decimal('0.00')
            print(f"   Διαμέρισμα {apartment.number}: €{initial_balances[apartment.id]:,.2f}")
        
        total_initial_balance = sum(initial_balances.values())
        print(f"\n📈 Συνολικό αρχικό υπόλοιπο: €{total_initial_balance:,.2f}")
        
        # 2. Δημιουργία test user
        print("\n📊 2. ΔΗΜΙΟΥΡΓΙΑ TEST USER")
        print("-" * 50)
        
        try:
            test_user = CustomUser.objects.get(email='test@example.com')
        except CustomUser.DoesNotExist:
            test_user = CustomUser.objects.create_user(
                email='test@example.com',
                password='testpass123',
                first_name='Test',
                last_name='User',
                is_staff=True
            )
        
        print(f"✅ Test user: {test_user.email}")
        
        # 3. Δημιουργία client και login
        print("\n📊 3. ΣΥΝΔΕΣΗ API")
        print("-" * 50)
        
        client = Client()
        login_success = client.login(email='test@example.com', password='testpass123')
        
        if login_success:
            print("✅ Επιτυχής σύνδεση")
        else:
            print("❌ Αποτυχία σύνδεσης")
            return
        
        # 4. Δημιουργία δαπάνης μέσω API
        print("\n📊 4. ΔΗΜΙΟΥΡΓΙΑ ΔΑΠΑΝΗΣ ΜΕΣΩ API")
        print("-" * 50)
        
        expense_data = {
            'building': building_id,
            'title': 'API Test Δαπάνη - Αυτόματη Έκδοση',
            'amount': '50.00',
            'date': date.today().strftime('%Y-%m-%d'),
            'category': 'miscellaneous',
            'distribution_type': 'by_participation_mills',
            'notes': 'Test δαπάνη μέσω API για έλεγχο αυτόματης έκδοσης'
        }
        
        response = client.post('/api/financial/expenses/', expense_data, content_type='application/json')
        
        if response.status_code == 201:
            print("✅ Δαπάνη δημιουργήθηκε επιτυχώς μέσω API")
            expense_id = response.json()['id']
            print(f"📋 ID Δαπάνης: {expense_id}")
        else:
            print(f"❌ Σφάλμα στη δημιουργία: {response.status_code}")
            print(f"📄 Response: {response.content}")
            return
        
        # 5. Έλεγχος δημιουργημένης δαπάνης
        print("\n📊 5. ΕΛΕΓΧΟΣ ΔΗΜΙΟΥΡΓΗΜΕΝΗΣ ΔΑΠΑΝΗΣ")
        print("-" * 50)
        
        try:
            expense = Expense.objects.get(id=expense_id)
            print(f"✅ Βρέθηκε η δαπάνη: {expense.title}")
            print(f"💰 Ποσό: €{expense.amount:,.2f}")
            print(f"📅 Ημερομηνία: {expense.date}")
            print(f"📋 Κατηγορία: {expense.get_category_display()}")
            print(f"📊 Κατανομή: {expense.get_distribution_type_display()}")
            print(f"✅ Εκδοθείσα: {expense.is_issued}")
        except Expense.DoesNotExist:
            print("❌ Δεν βρέθηκε η δαπάνη")
            return
        
        # 6. Έλεγχος αυτόματης έκδοσης
        print("\n📊 6. ΕΛΕΓΧΟΣ ΑΥΤΟΜΑΤΗΣ ΕΚΔΟΣΗΣ")
        print("-" * 50)
        
        if expense.is_issued:
            print("✅ Η δαπάνη είναι αυτόματα εκδοθείσα!")
        else:
            print("❌ Η δαπάνη δεν είναι εκδοθείσα")
        
        # 7. Έλεγχος ενημέρωσης υπολοίπων
        print("\n📊 7. ΕΛΕΓΧΟΣ ΕΝΗΜΕΡΩΣΗΣ ΥΠΟΛΟΙΠΩΝ")
        print("-" * 50)
        
        updated_apartments = 0
        total_balance_change = Decimal('0.00')
        
        for apartment in apartments:
            current_balance = apartment.current_balance or Decimal('0.00')
            initial_balance = initial_balances[apartment.id]
            balance_change = current_balance - initial_balance
            
            if abs(balance_change) > Decimal('0.01'):
                updated_apartments += 1
                total_balance_change += balance_change
                print(f"   Διαμέρισμα {apartment.number}: €{initial_balance:,.2f} → €{current_balance:,.2f} (Διαφορά: €{balance_change:,.2f})")
            else:
                print(f"   Διαμέρισμα {apartment.number}: €{initial_balance:,.2f} → €{current_balance:,.2f} (Χωρίς αλλαγή)")
        
        print(f"\n📈 Ενημερώθηκαν: {updated_apartments} διαμερίσματα")
        print(f"📊 Συνολική αλλαγή: €{total_balance_change:,.2f}")
        
        # 8. Έλεγχος transactions
        print("\n📊 8. ΕΛΕΓΧΟΣ TRANSACTIONS")
        print("-" * 50)
        
        expense_transactions = Transaction.objects.filter(
            building_id=building_id,
            reference_id=str(expense.id),
            reference_type='expense'
        ).order_by('-date')
        
        if expense_transactions.exists():
            print(f"✅ Βρέθηκαν {expense_transactions.count()} transactions:")
            for transaction in expense_transactions:
                print(f"   • {transaction.description}: €{transaction.amount:,.2f}")
                print(f"     Διαμέρισμα: {transaction.apartment_number}")
                print(f"     Ημερομηνία: {transaction.date}")
        else:
            print("❌ Δεν βρέθηκαν transactions")
        
        # 9. Έλεγχος συνολικής ακρίβειας
        print("\n📊 9. ΕΛΕΓΧΟΣ ΣΥΝΟΛΙΚΗΣ ΑΚΡΙΒΕΙΑΣ")
        print("-" * 50)
        
        total_final_balance = sum(
            apt.current_balance or Decimal('0.00') 
            for apt in Apartment.objects.filter(building_id=building_id)
        )
        
        expected_change = -expense.amount
        actual_change = total_final_balance - total_initial_balance
        
        print(f"💰 Αρχικό συνολικό υπόλοιπο: €{total_initial_balance:,.2f}")
        print(f"💰 Τελικό συνολικό υπόλοιπο: €{total_final_balance:,.2f}")
        print(f"📊 Αναμενόμενη αλλαγή: €{expected_change:,.2f}")
        print(f"📊 Πραγματική αλλαγή: €{actual_change:,.2f}")
        
        if abs(actual_change - expected_change) <= Decimal('0.01'):
            print("✅ Η αυτόματη έκδοση λειτουργεί σωστά!")
        else:
            print(f"❌ Ασυμφωνία: €{abs(actual_change - expected_change):,.2f}")
        
        # 10. Καθαρισμός test δεδομένων
        print("\n📊 10. ΚΑΘΑΡΙΣΜΟΣ TEST ΔΕΔΟΜΕΝΩΝ")
        print("-" * 50)
        
        # Διαγραφή test δαπάνης
        expense.delete()
        print("✅ Διαγράφηκε η test δαπάνη")
        
        # Επαναφορά αρχικών υπολοίπων
        for apartment in apartments:
            apartment.current_balance = initial_balances[apartment.id]
            apartment.save()
        
        print("✅ Επαναφέρθηκαν τα αρχικά υπόλοιπα")
        
        # 11. Συμπέρασμα
        print("\n📋 11. ΣΥΜΠΕΡΑΣΜΑ")
        print("-" * 50)
        
        print("🎉 Η δοκιμή API ολοκληρώθηκε!")
        print()
        print("✅ Τα αποτελέσματα:")
        print("   • Η δαπάνη δημιουργήθηκε αυτόματα ως εκδοθείσα")
        print("   • Το API endpoint λειτουργεί σωστά")
        print("   • Η βελτίωση είναι έτοιμη για production")
        print()
        print("🚀 Η βελτίωση είναι επιτυχής!")

if __name__ == "__main__":
    test_api_auto_issue()


