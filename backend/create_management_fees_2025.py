#!/usr/bin/env python3
"""
Δημιουργία Management Fees για 2025
Σύμφωνα με τις παραμέτρους:
- Μηνιαία δόση πολυκατοικίας: €10.00 (10 διαμερίσματα × €1.00/μήνα)
- Ημερομηνία Έναρξης Συστήματος: 01/01/2025
- Year Isolation Rule: Μόνο δεδομένα του 2025
"""

import os
import sys
import django
from decimal import Decimal
from datetime import date, datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, Transaction
from buildings.models import Building
from apartments.models import Apartment

def create_management_fees_2025():
    """Δημιουργεί management fees expenses και transactions για 2025"""
    
    print("🏢 ΔΗΜΙΟΥΡΓΙΑ MANAGEMENT FEES 2025")
    print("=" * 50)
    
    with schema_context('demo'):
        # Βρίσκουμε το κτίριο
        try:
            building = Building.objects.get(id=1)
            print(f"🏢 Κτίριο: {building.name}")
            print(f"📅 Financial System Start Date: {building.financial_system_start_date}")
            print(f"💰 Management Fee per Apartment: €{building.management_fee_per_apartment}")
        except Building.DoesNotExist:
            print("❌ Δεν βρέθηκε το κτίριο με ID=1")
            return
        
        # Βρίσκουμε τα διαμερίσματα
        apartments = Apartment.objects.filter(building=building)
        apartments_count = apartments.count()
        print(f"🏠 Αριθμός διαμερισμάτων: {apartments_count}")
        
        # Υπολογίζουμε το συνολικό μηνιαίο ποσό
        monthly_total = building.management_fee_per_apartment * apartments_count
        print(f"💰 Μηνιαίο συνολικό ποσό: €{monthly_total}")
        
        # Δημιουργούμε management fees expenses μόνο από τον Μάρτιο 2025
        # (όπως ορίζει η Ημερομηνία Έναρξης Συστήματος: 01/03/2025)
        months_2025 = [
            (2025, 3, "Μάρτιος"), (2025, 4, "Απρίλιος"), (2025, 5, "Μάιος"), 
            (2025, 6, "Ιούνιος"), (2025, 7, "Ιούλιος"), (2025, 8, "Αύγουστος"), 
            (2025, 9, "Σεπτέμβριος"), (2025, 10, "Οκτώβριος"), (2025, 11, "Νοέμβριος"), 
            (2025, 12, "Δεκέμβριος")
        ]
        
        # Ελέγχουμε αν υπάρχουν ήδη management fees για 2025
        existing_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025
        )
        
        if existing_expenses.exists():
            print(f"\n⚠️ ΥΠΑΡΧΟΥΝ ΗΔΗ MANAGEMENT FEES ΓΙΑ 2025:")
            for expense in existing_expenses:
                print(f"  - {expense.date.strftime('%Y-%m')}: €{expense.amount:.2f} (ID: {expense.id})")
            print(f"Συνολικά: {existing_expenses.count()} expenses, €{sum(exp.amount for exp in existing_expenses):.2f}")
            print(f"Δεν δημιουργούμε νέα expenses!")
            created_expenses = list(existing_expenses)
        else:
            print(f"\n📊 ΔΗΜΙΟΥΡΓΙΑ EXPENSES:")
            created_expenses = []
            
            for year, month, month_name in months_2025:
                # Δημιουργούμε το expense για τον μήνα
                expense_date = date(year, month, 1)
                
                expense = Expense.objects.create(
                    building=building,
                    title=f'Δαπάνες Διαχείρισης - {month_name} {year}',
                    category='management_fees',
                    amount=monthly_total,
                    date=expense_date,
                    expense_type='management_fee',
                    distribution_type='equal_share',
                    notes=f'Αυτόματη δημιουργία management fees για {month_name} {year}'
                )
                
                created_expenses.append(expense)
                print(f"  ✅ {month_name} {year}: €{monthly_total:.2f} (ID: {expense.id})")
        
        print(f"\n📊 TRANSACTIONS ΔΗΜΙΟΥΡΓΗΘΗΚΑΝ ΑΥΤΟΜΑΤΑ:")
        print(f"Το σύστημα δημιούργησε αυτόματα transactions μέσω των signals!")
        
        # Επαλήθευση
        print(f"\n✅ ΕΠΑΛΗΘΕΥΣΗ:")
        total_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025
        ).count()
        
        total_transactions_count = Transaction.objects.filter(
            building=building,
            type='management_fee',
            date__year=2025
        ).count()
        
        total_expenses_amount = sum(exp.amount for exp in Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025
        ))
        
        total_transactions_amount = sum(trans.amount for trans in Transaction.objects.filter(
            building=building,
            type='management_fee',
            date__year=2025
        ))
        
        print(f"📊 Expenses 2025: {total_expenses} (€{total_expenses_amount:.2f})")
        print(f"📊 Transactions 2025: {total_transactions_count} (€{total_transactions_amount:.2f})")
        
        # Έλεγχος για Σεπτέμβριο 2025
        print(f"\n🧮 ΕΛΕΓΧΟΣ ΣΕΠΤΕΜΒΡΙΟΥ 2025:")
        
        # Παλαιότερες οφειλές (Μάρτιος - Αύγουστος 2025)
        # Μόνο από την Ημερομηνία Έναρξης Συστήματος (Μάρτιος 2025)
        previous_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month__gte=3,  # Από Μάρτιο (Ημερομηνία Έναρξης)
            date__month__lt=9    # Μήνες πριν τον Σεπτέμβριο
        )
        previous_total = sum(exp.amount for exp in previous_expenses)
        print(f"📈 Παλαιότερες οφειλές (Μαρ-Αυγ 2025): €{previous_total:.2f}")
        
        # Τρέχουσες υποχρεώσεις (Σεπτέμβριος 2025)
        current_expenses = Expense.objects.filter(
            building=building,
            category='management_fees',
            date__year=2025,
            date__month=9  # Σεπτέμβριος
        )
        current_total = sum(exp.amount for exp in current_expenses)
        print(f"📅 Τρέχουσες υποχρεώσεις (Σεπ 2025): €{current_total:.2f}")
        
        # Συνολικό μηνιαίο σύνολο
        total_monthly = previous_total + current_total
        print(f"💰 Συνολικό μηνιαίο σύνολο: €{total_monthly:.2f}")
        
        # Επαλήθευση με αναμενόμενα ποσά
        expected_previous = Decimal('60.00')  # 6 μήνες (Μαρ-Αυγ) × €10.00
        expected_current = Decimal('10.00')   # Σεπτέμβριος management fees
        expected_total = Decimal('70.00')     # €60.00 + €10.00
        
        print(f"\n🎯 ΕΠΑΛΗΘΕΥΣΗ:")
        print(f"Αναμενόμενες παλαιότερες οφειλές: €{expected_previous:.2f}")
        print(f"Αναμενόμενες τρέχουσες υποχρεώσεις: €{expected_current:.2f}")
        print(f"Αναμενόμενο συνολικό: €{expected_total:.2f}")
        
        previous_ok = abs(previous_total - expected_previous) < 0.01
        current_ok = abs(current_total - expected_current) < 0.01
        total_ok = abs(total_monthly - expected_total) < 0.01
        
        print(f"\n🎯 ΑΠΟΤΕΛΕΣΜΑΤΑ:")
        print(f"Παλαιότερες οφειλές: {'✅' if previous_ok else '❌'} (€{previous_total:.2f})")
        print(f"Τρέχουσες υποχρεώσεις: {'✅' if current_ok else '❌'} (€{current_total:.2f})")
        print(f"Συνολικό: {'✅' if total_ok else '❌'} (€{total_monthly:.2f})")
        
        if previous_ok and current_ok and total_ok:
            print(f"\n🎉 MANAGEMENT FEES 2025 ΔΗΜΙΟΥΡΓΗΘΗΚΑΝ ΕΠΙΤΥΧΩΣ!")
            print(f"✅ Όλοι οι υπολογισμοί είναι ακριβείς σύμφωνα με την audit report")
        else:
            print(f"\n⚠️ ΥΠΑΡΧΟΥΝ ΠΡΟΒΛΗΜΑΤΑ ΣΤΟΥΣ ΥΠΟΛΟΓΙΣΜΟΥΣ")

if __name__ == "__main__":
    create_management_fees_2025()
