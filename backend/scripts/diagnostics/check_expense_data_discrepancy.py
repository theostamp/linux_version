import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense
from buildings.models import Building
from datetime import date

# All database operations must be within schema_context
with schema_context('demo'):
    print("🔍 Ανάλυση δεδομένων δαπανών για εντοπισμό σφάλματος")
    print("=" * 60)
    
    # Get building 1 (Αραχώβης 12)
    building = Building.objects.get(id=1)
    print(f"📍 Κτίριο: {building.name} - {building.address}")
    print()
    
    # Check expenses by month for 2025
    months = [
        ('2025-01', 'Ιανουάριος'),
        ('2025-02', 'Φεβρουάριος'), 
        ('2025-03', 'Μάρτιος'),
        ('2025-04', 'Απρίλιος'),
        ('2025-05', 'Μάιος'),
        ('2025-06', 'Ιούνιος'),
        ('2025-07', 'Ιούλιος'),
        ('2025-08', 'Αύγουστος'),
        ('2025-09', 'Σεπτέμβριος'),
        ('2025-10', 'Οκτώβριος'),
        ('2025-11', 'Νοέμβριος'),
        ('2025-12', 'Δεκέμβριος')
    ]
    
    total_incorrect_expenses = 0
    
    for month_str, month_name in months:
        year, month_num = month_str.split('-')
        year = int(year)
        month_num = int(month_num)
        
        # Create date range for the month
        start_date = date(year, month_num, 1)
        if month_num == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month_num + 1, 1)
        
        # Get expenses for this month
        expenses = Expense.objects.filter(
            building_id=1,
            date__gte=start_date,
            date__lt=end_date
        ).order_by('date')
        
        total_amount = sum(exp.amount for exp in expenses)
        
        print(f"📅 {month_name} {year} ({month_str}):")
        print(f"   Συνολικές δαπάνες: {total_amount}€")
        print(f"   Αριθμός δαπανών: {expenses.count()}")
        
        if expenses.exists():
            print("   Λεπτομέρειες δαπανών:")
            for expense in expenses:
                print(f"     • {expense.title}: {expense.amount}€ ({expense.category}) - {expense.date}")
                if expense.amount > 10 and month_str != '2025-08':
                    total_incorrect_expenses += 1
                    print(f"       ⚠️  ΠΡΟΒΛΗΜΑ: Δαπάνη {expense.amount}€ σε μήνα που θα έπρεπε να έχει μόνο 10€!")
        else:
            print("   Καμία δαπάνη")
            if month_str != '2025-08':
                print("   ⚠️  ΠΡΟΒΛΗΜΑ: Θα έπρεπε να υπάρχουν 10€ διαχειριστικά έξοδα!")
        
        print()
    
    print("=" * 60)
    print("📊 ΣΥΝΟΨΗ ΠΡΟΒΛΗΜΑΤΩΝ:")
    print(f"Συνολικές εσφαλμένες δαπάνες: {total_incorrect_expenses}")
    
    # Check for management fees specifically
    print("\n🔍 Έλεγχος διαχειριστικών εξόδων:")
    management_expenses = Expense.objects.filter(
        building_id=1,
        category='management_fees'
    ).order_by('date')
    
    print(f"Συνολικά διαχειριστικά έξοδα: {management_expenses.count()}")
    for exp in management_expenses:
        print(f"  • {exp.date}: {exp.amount}€ - {exp.title}")
    
    # Check for any auto-generated expenses
    print("\n🔍 Έλεγχος αυτόματων δαπανών:")
    auto_expenses = Expense.objects.filter(
        building_id=1,
        expense_type='auto_generated'
    ).order_by('date')
    
    print(f"Συνολικές αυτόματες δαπάνες: {auto_expenses.count()}")
    for exp in auto_expenses:
        print(f"  • {exp.date}: {exp.amount}€ - {exp.title} ({exp.category})")
    
    # Check for duplicate or incorrect entries
    print("\n🔍 Έλεγχος για διπλότυπες ή εσφαλμένες εγγραφές:")
    all_expenses = Expense.objects.filter(building_id=1).order_by('date', 'amount')
    
    # Group by date and amount to find potential duplicates
    from collections import defaultdict
    expense_groups = defaultdict(list)
    
    for exp in all_expenses:
        key = f"{exp.date}_{exp.amount}_{exp.category}"
        expense_groups[key].append(exp)
    
    duplicates_found = 0
    for key, expenses_list in expense_groups.items():
        if len(expenses_list) > 1:
            duplicates_found += 1
            print(f"  ⚠️  Πιθανά διπλότυπα: {key}")
            for exp in expenses_list:
                print(f"     ID: {exp.id} - {exp.title}")
    
    if duplicates_found == 0:
        print("  ✅ Δεν βρέθηκαν διπλότυπες εγγραφές")
    
    print("\n" + "=" * 60)
    print("✅ Ανάλυση ολοκληρώθηκε!")
