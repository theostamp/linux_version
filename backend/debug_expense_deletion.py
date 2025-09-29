import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from maintenance.models import ScheduledMaintenance
import traceback

def debug_expense_deletion():
    try:
        with schema_context('demo'):
            # Find an expense to debug
            expense = Expense.objects.first()
            if not expense:
                print('❌ No expense found')
                return
                
            print(f'🔍 Debugging deletion of expense: {expense.title}')
            print(f'   ID: {expense.id}')
            print(f'   Amount: €{expense.amount}')
            
            # Check related objects before deletion
            print('\\n🔍 Checking related objects:')
            
            # Check scheduled maintenance connections
            linked_maintenances = expense.scheduled_maintenance_tasks.all()
            print(f'   Linked maintenances: {linked_maintenances.count()}')
            for m in linked_maintenances:
                print(f'     - {m.title} (ID: {m.id})')
            
            # Check transactions that reference this expense
            try:
                related_transactions = Transaction.objects.filter(reference_id=str(expense.id), reference_type='expense')
                print(f'   Related transactions: {related_transactions.count()}')
                for t in related_transactions:
                    print(f'     - {t.description} (€{t.amount})')
            except Exception as e:
                print(f'   ❌ Error checking transactions: {e}')
            
            # Try to delete manually step by step
            print('\\n🔍 Attempting manual deletion...')
            
            # Step 1: Clear maintenance links
            try:
                for maintenance in linked_maintenances:
                    maintenance.linked_expense = None
                    maintenance.save(update_fields=['linked_expense'])
                print('   ✅ Cleared maintenance links')
            except Exception as e:
                print(f'   ❌ Error clearing maintenance links: {e}')
            
            # Step 2: Handle transactions
            try:
                # First try to get transactions without apartment reference
                problematic_transactions = Transaction.objects.filter(
                    reference_id=str(expense.id), 
                    reference_type='expense'
                ).values('id', 'description', 'amount', 'apartment_number')
                
                print(f'   Found {len(problematic_transactions)} transactions to handle')
                for t in problematic_transactions:
                    print(f'     - Transaction {t["id"]}: {t["description"]}')
                    
            except Exception as e:
                print(f'   ❌ Error handling transactions: {e}')
                traceback.print_exc()
            
            # Step 3: Try simple deletion
            print('\\n🔍 Attempting simple deletion...')
            try:
                expense_id = expense.id
                expense.delete()
                print(f'   ✅ Successfully deleted expense {expense_id}')
            except Exception as e:
                print(f'   ❌ Deletion failed: {e}')
                traceback.print_exc()
                
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    debug_expense_deletion()