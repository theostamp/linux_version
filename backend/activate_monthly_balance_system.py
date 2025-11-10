#!/usr/bin/env python3
"""
Script για την ενεργοποίηση του συστήματος μηνιαίων υπολοίπων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import MonthlyBalance, Expense, Payment
from buildings.models import Building
from django.db.models import Sum
from decimal import Decimal
from datetime import date

def activate_monthly_balance_system():
    """Ενεργοποιεί το σύστημα μηνιαίων υπολοίπων"""
    
    with schema_context('demo'):
        print("=== Ενεργοποίηση Συστήματος Μηνιαίων Υπολοίπων ===")
        
        building = Building.objects.get(id=1)
        print(f"\n📋 Ενεργοποίηση για κτίριο: {building.name}")
        
        # Βρίσκουμε όλους τους μήνες που έχουν δαπάνες ή πληρωμές
        print(f"\n🔍 Αναζήτηση μηνών με δραστηριότητα...")
        
        # Δαπάνες ανά μήνα
        expense_months = Expense.objects.filter(
            building=building
        ).extra(
            select={'year': 'EXTRACT(year FROM date)', 'month': 'EXTRACT(month FROM date)'}
        ).values('year', 'month').distinct().order_by('year', 'month')
        
        # Πληρωμές ανά μήνα
        payment_months = Payment.objects.filter(
            apartment__building=building
        ).extra(
            select={'year': 'EXTRACT(year FROM date)', 'month': 'EXTRACT(month FROM date)'}
        ).values('year', 'month').distinct().order_by('year', 'month')
        
        # Συνδυάζουμε όλους τους μήνες
        all_months = set()
        for month in expense_months:
            all_months.add((int(month['year']), int(month['month'])))
        for month in payment_months:
            all_months.add((int(month['year']), int(month['month'])))
        
        months_list = sorted(list(all_months))
        print(f"   ✅ Βρέθηκαν {len(months_list)} μήνες με δραστηριότητα")
        
        if not months_list:
            print("   ⚠️  Δεν βρέθηκαν μήνες με δραστηριότητα")
            return
        
        # Δημιουργούμε μηνιαία υπολοιπα για κάθε μήνα
        print(f"\n📊 Δημιουργία μηνιαίων υπολοίπων...")
        
        created_balances = []
        
        for year, month in months_list:
            print(f"\n   📅 {month:02d}/{year}:")
            
            # Υπολογίζουμε δαπάνες
            expenses = Expense.objects.filter(
                building=building,
                date__year=year,
                date__month=month
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογίζουμε πληρωμές
            payments = Payment.objects.filter(
                apartment__building=building,
                date__year=year,
                date__month=month
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # Υπολογίζουμε previous_obligations από τον προηγούμενο μήνα
            previous_obligations = Decimal('0.00')
            if len(created_balances) > 0:
                # Βρίσκουμε τον προηγούμενο μήνα
                prev_month = month - 1
                prev_year = year
                if prev_month == 0:
                    prev_month = 12
                    prev_year = year - 1
                
                # Ψάχνουμε για υπάρχον balance του προηγούμενου μήνα
                prev_balance = None
                for balance in created_balances:
                    if balance.year == prev_year and balance.month == prev_month:
                        prev_balance = balance
                        break
                
                if prev_balance:
                    previous_obligations = prev_balance.carry_forward
            
            # Δημιουργούμε το μηνιαίο υπόλοιπο
            balance, created = MonthlyBalance.objects.get_or_create(
                building=building,
                year=year,
                month=month,
                defaults={
                    'total_expenses': expenses,
                    'total_payments': payments,
                    'previous_obligations': previous_obligations,
                    'reserve_fund_amount': Decimal('0.00'),  # Θα υπολογιστεί αργότερα
                    'management_fees': Decimal('0.00'),     # Θα υπολογιστεί αργότερα
                    'carry_forward': Decimal('0.00'),
                }
            )
            
            if created:
                print(f"      ✅ Δημιουργήθηκε")
                created_balances.append(balance)
            else:
                print(f"      📋 Υπήρχε ήδη")
                # Ενημερώνουμε τα δεδομένα
                balance.total_expenses = expenses
                balance.total_payments = payments
                balance.previous_obligations = previous_obligations
                balance.save()
                created_balances.append(balance)
            
            # Υπολογίζουμε το carry_forward
            net_result = balance.net_result
            carry_forward = -net_result if net_result < 0 else Decimal('0.00')
            balance.carry_forward = carry_forward
            balance.save()
            
            print(f"      💸 Δαπάνες: €{expenses}")
            print(f"      💰 Εισπράξεις: €{payments}")
            print(f"      📊 Παλαιότερες οφειλές: €{previous_obligations}")
            print(f"      📈 Καθαρό αποτέλεσμα: €{net_result}")
            print(f"      🔄 Μεταφορά: €{carry_forward}")
        
        # Κλείνουμε τους μήνες που έχουν ολοκληρωθεί
        print(f"\n🔒 Κλείσιμο ολοκληρωμένων μηνών...")
        
        current_date = date.today()
        current_year = current_date.year
        current_month = current_date.month
        
        for balance in created_balances:
            # Κλείνουμε μήνες που είναι πριν από τον τρέχοντα
            if balance.year < current_year or (balance.year == current_year and balance.month < current_month):
                if not balance.is_closed:
                    balance.close_month()
                    print(f"   ✅ Κλείστηκε {balance.month_display}")
                else:
                    print(f"   📋 Ήδη κλειστός {balance.month_display}")
        
        print(f"\n🎯 Σύνοψη:")
        print(f"   📊 Δημιουργήθηκαν/ενημερώθηκαν {len(created_balances)} μηνιαία υπολοιπα")
        print(f"   🔄 Το σύστημα μεταφοράς οφειλών είναι ενεργό")
        print(f"   📈 Τα previous_obligations υπολογίζονται από τα carry_forward")
        
        # Δοκιμή του συστήματος
        print(f"\n🧪 Δοκιμή συστήματος:")
        
        # Βρίσκουμε τον πιο πρόσφατο μήνα με carry_forward
        latest_balance = None
        for balance in sorted(created_balances, key=lambda x: (x.year, x.month), reverse=True):
            if balance.carry_forward != 0:
                latest_balance = balance
                break
        
        if latest_balance:
            print(f"   📅 Πιο πρόσφατος μήνας με μεταφορά: {latest_balance.month_display}")
            print(f"   💰 Ποσό μεταφοράς: €{latest_balance.carry_forward}")
            
            # Βρίσκουμε τον επόμενο μήνα
            next_month = latest_balance.month + 1
            next_year = latest_balance.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            
            next_balance = MonthlyBalance.objects.filter(
                building=building,
                year=next_year,
                month=next_month
            ).first()
            
            if next_balance:
                print(f"   📅 Επόμενος μήνας: {next_balance.month_display}")
                print(f"   📊 Previous obligations: €{next_balance.previous_obligations}")
                
                if next_balance.previous_obligations == latest_balance.carry_forward:
                    print(f"   ✅ Η μεταφορά λειτουργεί σωστά!")
                else:
                    print(f"   ⚠️  Πρόβλημα στη μεταφορά - ελέγξτε τα δεδομένα")
            else:
                print(f"   ⚠️  Δεν βρέθηκε επόμενος μήνας")
        else:
            print(f"   ℹ️  Δεν υπάρχουν μήνες με μεταφορά οφειλών")
        
        print(f"\n✅ Το σύστημα μηνιαίων υπολοίπων είναι ενεργό!")
        print(f"   🌐 Μπορείτε να το χρησιμοποιήσετε στο frontend στο tab 'Μηνιαία Υπόλοιπα'")

if __name__ == '__main__':
    activate_monthly_balance_system()


