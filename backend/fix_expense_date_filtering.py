import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from datetime import date

# All database operations must be within schema_context
with schema_context('demo'):
    print("🔧 Διόρθωση φιλτραρίσματος δαπανών ανά μήνα")
    print("=" * 60)
    
    # Get building (should be Αλκμάνος 22 based on previous output)
    building = Building.objects.get(id=1)
    print(f"📍 Κτίριο: {building.name}")
    
    # Check the ΔΕΗ expense
    deh_expense = Expense.objects.filter(
        building_id=1,
        title__icontains='ΔΕΗ'
    ).first()
    
    if deh_expense:
        print("⚡ Δαπάνη ΔΕΗ:")
        print(f"   ID: {deh_expense.id}")
        print(f"   Τίτλος: {deh_expense.title}")
        print(f"   Ποσό: {deh_expense.amount}€")
        print(f"   Ημερομηνία: {deh_expense.date}")
        print(f"   Κατηγορία: {deh_expense.category}")
        print()
        
        # Test month filtering
        test_months = [
            ('2025-01', 'Ιανουάριος'),
            ('2025-02', 'Φεβρουάριος'),
            ('2025-06', 'Ιούνιος'),
            ('2025-08', 'Αύγουστος')
        ]
        
        for month_str, month_name in test_months:
            print(f"📅 Τεστ για {month_name} ({month_str}):")
            
            year, month_num = month_str.split('-')
            year = int(year)
            month_num = int(month_num)
            
            # Create date range for the month
            start_date = date(year, month_num, 1)
            if month_num == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month_num + 1, 1)
            
            # Manual filtering (correct way)
            expenses_manual = Expense.objects.filter(
                building_id=1,
                date__gte=start_date,
                date__lt=end_date
            )
            
            print(f"   📋 Σωστό φιλτράρισμα: {expenses_manual.count()} δαπάνες")
            for exp in expenses_manual:
                print(f"     • {exp.title}: {exp.amount}€")
            
            # Test CommonExpenseCalculator
            try:
                calculator = CommonExpenseCalculator(building.id)
                
                # Check if calculator is filtering by month correctly
                # We need to see what expenses it's using
                calculator_expenses = calculator.expenses
                print(f"   🧮 Calculator expenses: {calculator_expenses.count()} δαπάνες")
                
                # This shows the problem - calculator is not filtering by month!
                if calculator_expenses.count() > expenses_manual.count():
                    print("   ⚠️  ΠΡΟΒΛΗΜΑ: Calculator χρησιμοποιεί όλες τις δαπάνες αντί για μόνο του μήνα!")
                    print(f"       Calculator: {calculator_expenses.count()} vs Σωστό: {expenses_manual.count()}")
                
                total_calc = calculator.get_total_expenses()
                total_manual = sum(exp.amount for exp in expenses_manual)
                
                print(f"   💰 Calculator total: {total_calc}€")
                print(f"   💰 Manual total: {total_manual}€")
                
                if total_calc != total_manual:
                    print(f"   ❌ ΔΙΑΦΟΡΑ: {total_calc - total_manual}€")
                else:
                    print("   ✅ Σωστό ποσό")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα calculator: {str(e)}")
            
            print()
        
        print("=" * 60)
        print("🔍 ΔΙΑΓΝΩΣΗ:")
        print("Το πρόβλημα είναι ότι ο CommonExpenseCalculator δεν φιλτράρει")
        print("τις δαπάνες ανά μήνα. Χρησιμοποιεί όλες τις δαπάνες του κτιρίου")
        print("ανεξάρτητα από την ημερομηνία.")
        print()
        print("ΛΥΣΗ: Πρέπει να τροποποιηθεί ο CommonExpenseCalculator")
        print("να δέχεται παράμετρο μήνα και να φιλτράρει τις δαπάνες αναλόγως.")
        
    else:
        print("❌ Δεν βρέθηκε δαπάνη ΔΕΗ")
    
    print("\n✅ Ανάλυση ολοκληρώθηκε!")
