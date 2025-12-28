import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from django.db import transaction
from financial.models import (
    Expense, 
    Payment, 
    Transaction,
    CommonExpensePeriod,
    ApartmentShare,
    FinancialReceipt
)
from apartments.models import Apartment

def reset_all_financial_data():
    """
    Μηδενίζει όλα τα οικονομικά δεδομένα στη βάση δεδομένων
    """
    print("🚀 Ξεκινάω τη μηδενικοποίηση όλων των οικονομικών δεδομένων...")
    
    with schema_context('demo'):
        try:
            with transaction.atomic():
                # 1. Μηδενίζω όλα τα οικονομικά πεδία των διαμερισμάτων
                print("📊 Μηδενίζω τα οικονομικά πεδία των διαμερισμάτων...")
                apartments_updated = Apartment.objects.all().update(
                    current_balance=0.00,
                    previous_balance=0.00
                )
                print(f"✅ Μηδενίστηκαν τα οικονομικά πεδία για {apartments_updated} διαμερίσματα")
                
                # 2. Διαγράφω όλες τις δαπάνες
                print("💰 Διαγράφω όλες τις δαπάνες...")
                expenses_count = Expense.objects.count()
                Expense.objects.all().delete()
                print(f"✅ Διαγράφηκαν {expenses_count} δαπάνες")
                
                # 3. Διαγράφω όλες τις πληρωμές
                print("💳 Διαγράφω όλες τις πληρωμές...")
                payments_count = Payment.objects.count()
                Payment.objects.all().delete()
                print(f"✅ Διαγράφηκαν {payments_count} πληρωμές")
                
                # 4. Διαγράφω όλες τις συναλλαγές
                print("📝 Διαγράφω όλες τις συναλλαγές...")
                transactions_count = Transaction.objects.count()
                Transaction.objects.all().delete()
                print(f"✅ Διαγράφηκαν {transactions_count} συναλλαγές")
                
                # 5. Διαγράφω όλες τις περιόδους κοινών δαπανών
                print("📅 Διαγράφω όλες τις περιόδους κοινών δαπανών...")
                common_expense_periods_count = CommonExpensePeriod.objects.count()
                CommonExpensePeriod.objects.all().delete()
                print(f"✅ Διαγράφηκαν {common_expense_periods_count} περιόδοι κοινών δαπανών")
                
                # 6. Διαγράφω όλες τις κατανομές διαμερισμάτων
                print("🏢 Διαγράφω όλες τις κατανομές διαμερισμάτων...")
                apartment_shares_count = ApartmentShare.objects.count()
                ApartmentShare.objects.all().delete()
                print(f"✅ Διαγράφηκαν {apartment_shares_count} κατανομές διαμερισμάτων")
                
                # 7. Διαγράφω όλα τα οικονομικά αποδείγματα
                print("🧾 Διαγράφω όλα τα οικονομικά αποδείγματα...")
                financial_receipts_count = FinancialReceipt.objects.count()
                FinancialReceipt.objects.all().delete()
                print(f"✅ Διαγράφηκαν {financial_receipts_count} οικονομικά αποδείγματα")
                
                # 8. Επαναφέρω τα participation_mills στα αρχικά τους (αν χρειάζεται)
                print("🏢 Επαναφέρω τα participation_mills στα αρχικά τους...")
                apartments = Apartment.objects.all()
                for apartment in apartments:
                    # Εδώ μπορείτε να ορίσετε τα αρχικά participation_mills αν χρειάζεται
                    # apartment.participation_mills = 100  # ή όποια αρχική τιμή θέλετε
                    apartment.save()
                
                print("✅ Επαναφέρθηκαν τα participation_mills")
                
                print("\n🎉 Όλα τα οικονομικά δεδομένα μηδενίστηκαν επιτυχώς!")
                print("📊 Η βάση δεδομένων είναι τώρα καθαρή από όλα τα ποσά")
                print(f"🏠 Συνολικά διαμερίσματα που επηρεάστηκαν: {apartments_updated}")
                
        except Exception as e:
            print(f"❌ Σφάλμα κατά τη μηδενικοποίηση: {str(e)}")
            raise

if __name__ == "__main__":
    reset_all_financial_data()
