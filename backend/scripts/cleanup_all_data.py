#!/usr/bin/env python
"""
🧹 Καθαρισμός Ολων των Δεδομένων από την Υπάρχουσα Βάση
========================================================
Αυτό το script διαγράφει όλους τους χρηστές και τα εξαρτώμενα δεδομένα
χωρίς να χρειάζεται να δημιουργήσετε νέο database.

Χρήση:
    python scripts/cleanup_all_data.py [--schema=SCHEMA_NAME] [--force]
    
Παραδείγματα:
    # Cleanup demo schema (default)
    python scripts/cleanup_all_data.py
    
    # Cleanup specific schema
    python scripts/cleanup_all_data.py --schema=public
    
    # Force cleanup without confirmation
    python scripts/cleanup_all_data.py --force
"""

import os
import sys
import django
import argparse
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "new_concierge_backend.settings")
django.setup()

from django.db import connection, transaction
from django_tenants.utils import schema_context
from django.contrib.auth.models import Group


def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def cleanup_data(schema_name='demo', force=False):
    """
    Clean all data from the specified schema
    
    Args:
        schema_name: Schema name to clean (default: 'demo')
        force: Skip confirmation prompt (default: False)
    """
    
    print_header("🧹 ΚΑΘΑΡΙΣΜΟΣ ΒΑΣΗΣ ΔΕΔΟΜΕΝΩΝ")
    print(f"📅 Ημερομηνία: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🏷️  Schema: {schema_name}")
    print()
    
    # Import models inside schema context
    try:
        from users.models import CustomUser
        from buildings.models import Building, BuildingMembership
        from apartments.models import Apartment
        from financial.models import (
            Transaction, Payment, Expense, CommonExpensePeriod,
            ApartmentShare, FinancialReceipt, ExpenseApartment
        )
        from announcements.models import Announcement
        from user_requests.models import UserRequest
        from votes.models import Vote
    except ImportError as e:
        print(f"❌ Σφάλμα εισαγωγής models: {e}")
        return False
    
    with schema_context(schema_name):
        # 1. Show current statistics
        print_header("📊 ΤΡΕΧΟΝΤΕΣ ΚΑΤΑΣΤΑΣΗ")
        
        try:
            user_count = CustomUser.objects.count()
            transaction_count = Transaction.objects.count()
            payment_count = Payment.objects.count()
            expense_count = Expense.objects.count()
            building_count = Building.objects.count()
            
            print(f"   👥 Χρήστες: {user_count}")
            print(f"   💰 Συναλλαγές: {transaction_count}")
            print(f"   💳 Πληρωμές: {payment_count}")
            print(f"   💸 Δαπάνες: {expense_count}")
            print(f"   🏢 Κτίρια: {building_count}")
            
            if (user_count + transaction_count + payment_count + expense_count == 0):
                print("\n✅ Η βάση δεδομένων είναι ήδη καθαρή!")
                return True
            
        except Exception as e:
            print(f"⚠️  Σφάλμα ανάγνωσης στατιστικών: {e}")
        
        # 2. Confirmation
        if not force:
            print_header("⚠️  ΕΠΙΒΕΒΑΙΩΣΗ")
            print("⚠️  ΠΡΟΣΟΧΗ: Αυτή η λειτουργία θα διαγράψει ΑΝΕΠΑΝΑΦΟΡΑ:")
            print("   • Όλους τους χρηστές (εκτός superuser)")
            print("   • Όλα τα οικονομικά δεδομένα")
            print("   • Όλα τα κτίρια και διαμερίσματα")
            print("   • Όλες τις ανακοινώσεις, αιτήματα, ψηφοφορίες")
            print()
            response = input("❓ Είστε σίγουροι; (yes/no): ")
            if response.lower() not in ['yes', 'y']:
                print("❌ Ακυρώθηκε")
                return False
        
        print_header("🗑️  ΑΡΧΙΚΗ ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ")
        
        try:
            with transaction.atomic():
                deleted_counts = {}
                
                # 1. Delete financial data (in correct order to avoid foreign key errors)
                print("\n💰 Καθαρισμός οικονομικών δεδομένων...")
                
                # FinancialReceipt
                deleted_counts['receipts'] = FinancialReceipt.objects.count()
                FinancialReceipt.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['receipts']} αποδείξεις")
                
                # ApartmentShare
                deleted_counts['shares'] = ApartmentShare.objects.count()
                ApartmentShare.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['shares']} μερίδια διαμερισμάτων")
                
                # ExpenseApartment
                deleted_counts['expense_apartments'] = ExpenseApartment.objects.count()
                ExpenseApartment.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['expense_apartments']} σχέσεις δαπανών-διαμερισμάτων")
                
                # CommonExpensePeriod
                deleted_counts['periods'] = CommonExpensePeriod.objects.count()
                CommonExpensePeriod.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['periods']} περιόδους κοινών δαπανών")
                
                # Transaction
                deleted_counts['transactions'] = Transaction.objects.count()
                Transaction.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['transactions']} συναλλαγές")
                
                # Payment
                deleted_counts['payments'] = Payment.objects.count()
                Payment.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['payments']} πληρωμές")
                
                # Expense
                deleted_counts['expenses'] = Expense.objects.count()
                Expense.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['expenses']} δαπάνες")
                
                # 2. Reset apartment balances
                print("\n🏠 Επαναφορά υπολοίπων διαμερισμάτων...")
                apartments = Apartment.objects.all()
                reset_count = 0
                for apt in apartments:
                    if apt.current_balance != 0 or apt.previous_balance != 0:
                        apt.current_balance = 0
                        apt.previous_balance = 0
                        apt.save()
                        reset_count += 1
                deleted_counts['apartments_reset'] = reset_count
                print(f"   ✅ Επαναφέρθηκαν {reset_count} διαμερίσματα")
                
                # 3. Delete other data
                print("\n📋 Καθαρισμός υπόλοιπων δεδομένων...")
                
                deleted_counts['announcements'] = Announcement.objects.count()
                Announcement.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['announcements']} ανακοινώσεις")
                
                deleted_counts['requests'] = UserRequest.objects.count()
                UserRequest.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['requests']} αιτήματα")
                
                deleted_counts['votes'] = Vote.objects.count()
                Vote.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['votes']} ψηφοφορίες")
                
                # 4. Delete building memberships
                print("\n🏢 Καθαρισμός σχέσεων κτιρίων...")
                deleted_counts['memberships'] = BuildingMembership.objects.count()
                BuildingMembership.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['memberships']} σχέσεις κτιρίων")
                
                deleted_counts['buildings'] = Building.objects.count()
                Building.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['buildings']} κτίρια")
                
                # 5. Delete apartments
                print("\n🏠 Διαγραφή διαμερισμάτων...")
                deleted_counts['apartments'] = Apartment.objects.count()
                Apartment.objects.all().delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['apartments']} διαμερίσματα")
                
                # 6. Delete users (except superuser)
                print("\n👥 Διαγραφή χρηστών...")
                custom_users = CustomUser.objects.exclude(is_superuser=True)
                deleted_counts['users'] = custom_users.count()
                custom_users.delete()
                print(f"   ✅ Διαγράφηκαν {deleted_counts['users']} χρήστες")
                
                # 7. Reset superuser password if exists
                print("\n🔑 Επαναφορά superuser...")
                try:
                    admin = CustomUser.objects.get(username='admin')
                    admin.set_password('admin123456')
                    admin.email = 'admin@demo.localhost'
                    admin.save()
                    deleted_counts['superuser_reset'] = True
                    print(f"   ✅ Superuser password επαναφέρθηκε (admin / admin123456)")
                except CustomUser.DoesNotExist:
                    deleted_counts['superuser_reset'] = False
                    print(f"   ℹ️ Δεν υπάρχει superuser για επαναφορά")
                
                print_header("✅ ΟΛΟΚΛΗΡΩΘΗΚΕ Η ΔΙΑΓΡΑΦΗ!")
                
                # Summary
                print("\n📊 ΣΥΝΟΨΗ:")
                total_deleted = sum([
                    deleted_counts.get('users', 0),
                    deleted_counts.get('transactions', 0),
                    deleted_counts.get('payments', 0),
                    deleted_counts.get('expenses', 0),
                    deleted_counts.get('buildings', 0),
                ])
                print(f"   📝 Σύνολο εγγραφών που διαγράφηκαν: {total_deleted}")
                
                return True
                
        except Exception as e:
            print(f"\n❌ Σφάλμα κατά τη διαγραφή: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Καθαρισμός όλων των δεδομένων από την βάση'
    )
    parser.add_argument(
        '--schema',
        default='demo',
        help='Schema name to clean (default: demo)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Skip confirmation prompt'
    )
    
    args = parser.parse_args()
    
    success = cleanup_data(
        schema_name=args.schema,
        force=args.force
    )
    
    if success:
        print("\n" + "=" * 70)
        print("✅ Η διαδικασία ολοκληρώθηκε επιτυχώς!")
        print("=" * 70)
        print("\n💡 Τώρα μπορείτε να τρέξετε:")
        print("   python scripts/auto_initialization.py --force")
        print("\n🧹 Έτοιμοι για fresh start! 🚀\n")
        return 0
    else:
        print("\n" + "=" * 70)
        print("❌ Η διαδικασία απέτυχε!")
        print("=" * 70 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
