import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.services import CommonExpenseCalculator
from buildings.models import Building
from datetime import datetime, date

# All database operations must be within schema_context
with schema_context('demo'):
    print("🧪 Τεστ διόρθωσης φιλτραρίσματος δαπανών")
    print("=" * 60)
    
    building = Building.objects.get(id=1)
    print(f"📍 Κτίριο: {building.name}")
    print()
    
    # Test different months
    test_months = [
        ('2025-01', 'Ιανουάριος'),
        ('2025-02', 'Φεβρουάριος'),
        ('2025-06', 'Ιούνιος'),
        ('2025-08', 'Αύγουστος')
    ]
    
    for month_str, month_name in test_months:
        print(f"📅 Τεστ για {month_name} ({month_str}):")
        
        # Test with month parameter
        calculator = CommonExpenseCalculator(building.id, month=month_str)
        
        print(f"   📋 Calculator expenses: {calculator.expenses.count()}")
        for exp in calculator.expenses:
            print(f"     • {exp.title}: {exp.amount}€ ({exp.date})")
        
        total_expenses = calculator.get_total_expenses()
        print(f"   💰 Συνολικές δαπάνες: {total_expenses}€")
        
        # Expected results
        if month_str == '2025-08':
            expected = 300.00
            print(f"   ✅ Αναμενόμενο: {expected}€ (ΔΕΗ)")
        else:
            expected = 0.00
            print(f"   ✅ Αναμενόμενο: {expected}€ (καμία δαπάνη)")
        
        if abs(float(total_expenses) - expected) < 0.01:
            print(f"   ✅ ΣΩΣΤΟ!")
        else:
            print(f"   ❌ ΛΑΘΟΣ! Αναμενόταν {expected}€, βρέθηκαν {total_expenses}€")
        
        print()
    
    # Test without month parameter (should include all expenses)
    print("📅 Τεστ χωρίς παράμετρο μήνα:")
    calculator_all = CommonExpenseCalculator(building.id)
    print(f"   📋 Calculator expenses: {calculator_all.expenses.count()}")
    total_all = calculator_all.get_total_expenses()
    print(f"   💰 Συνολικές δαπάνες: {total_all}€")
    print(f"   ✅ Αναμενόμενο: 300€ (όλες οι δαπάνες)")
    
    if abs(float(total_all) - 300.00) < 0.01:
        print(f"   ✅ ΣΩΣΤΟ!")
    else:
        print(f"   ❌ ΛΑΘΟΣ! Αναμενόταν 300€, βρέθηκαν {total_all}€")
    
    print("\n" + "=" * 60)
    print("✅ Τεστ ολοκληρώθηκε!")
