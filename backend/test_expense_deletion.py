import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from django.test import RequestFactory
from financial.views import ExpenseViewSet
import traceback

def test_expense_deletion():
    try:
        with schema_context('demo'):
            # Find test expense
            expense = Expense.objects.filter(title__icontains='Test Expense').first()
            if not expense:
                print('❌ No test expense found')
                return
                
            print(f'🔍 Testing deletion of expense: {expense.title}')
            print(f'   ID: {expense.id}')
            
            # Create mock request
            factory = RequestFactory()
            request = factory.delete(f'/api/financial/expenses/{expense.id}/')
            request.user = None  # Mock user
            
            # Create viewset instance
            viewset = ExpenseViewSet()
            viewset.request = request
            viewset.kwargs = {'pk': expense.id}
            
            # Try deletion
            try:
                viewset.perform_destroy(expense)
                print('   ✅ perform_destroy completed successfully')
                
                # Check if expense was actually deleted
                if Expense.objects.filter(id=expense.id).exists():
                    print('   ❌ Expense still exists after deletion')
                else:
                    print('   ✅ Expense successfully deleted')
                    
            except Exception as e:
                print(f'   ❌ perform_destroy failed: {e}')
                traceback.print_exc()
                
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    test_expense_deletion()