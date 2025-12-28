import django
import os
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from django.utils import timezone
import traceback

def create_test_expense():
    try:
        with schema_context('demo'):
            building = Building.objects.first()
            if not building:
                print('❌ No building found')
                return
                
            # Create a test expense
            expense = Expense.objects.create(
                building=building,
                title='Test Expense για Διαγραφή',
                amount=100.00,
                date=timezone.now().date(),
                category='maintenance',
                expense_type='regular',
                distribution_type='equal_share',
                notes='Test expense for deletion testing'
            )
            
            print(f'✅ Created test expense: {expense.title}')
            print(f'   ID: {expense.id}')
            print(f'   Amount: €{expense.amount}')
            print(f'\\n🔗 URL for deletion test: DELETE /api/financial/expenses/{expense.id}/')
            
    except Exception as e:
        print(f'❌ Error occurred: {str(e)}')
        print(f'Error type: {type(e).__name__}')
        traceback.print_exc()

if __name__ == "__main__":
    create_test_expense()