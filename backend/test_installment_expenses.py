#!/usr/bin/env python
"""
Test για επιμερισμό δαπανών σε δόσεις ανά μήνα
"""

import os
import sys
import django
from datetime import datetime

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from projects.models import Project
from financial.models import Expense
from maintenance.models import ScheduledMaintenance, PaymentSchedule

def test_installment_expenses():
    """Test installment expense distribution"""

    with schema_context('demo'):
        print("\n🧪 TEST: Επιμερισμός δαπανών σε δόσεις ανά μήνα")
        print("=" * 60)

        # Find approved project with installments
        project = Project.objects.filter(
            status='approved',
            selected_contractor__isnull=False,
            installments__gt=1
        ).first()

        if project:
            print(f"\n✅ Βρέθηκε έργο με δόσεις: {project.title}")
            print(f"   - Total Cost: €{project.final_cost}")
            print(f"   - Installments: {project.installments}")
            print(f"   - Advance Payment: €{project.advance_payment}")
            print(f"   - Payment Method: {project.payment_method}")

            # Check related expenses
            expenses = Expense.objects.filter(
                building=project.building,
                title__icontains=project.title
            ).order_by('date')

            if expenses.exists():
                print(f"\n📋 Βρέθηκαν {expenses.count()} δαπάνες:")

                total_expense_amount = 0
                for i, expense in enumerate(expenses, 1):
                    print(f"\n   {i}. {expense.title}")
                    print(f"      - Ποσό: €{expense.amount}")
                    print(f"      - Ημερομηνία: {expense.date}")
                    print(f"      - Μήνας: {expense.date.strftime('%B %Y')}")
                    print(f"      - Κατηγορία: {expense.category}")
                    total_expense_amount += expense.amount

                print(f"\n   📊 Σύνολο δαπανών: €{total_expense_amount}")
                print(f"   📊 Σύνολο έργου: €{project.final_cost}")

                if abs(total_expense_amount - project.final_cost) < 0.01:
                    print("   ✅ Τα ποσά ταιριάζουν!")
                else:
                    print(f"   ❌ Διαφορά: €{abs(total_expense_amount - project.final_cost)}")

                # Check if expenses are distributed across months
                months = set()
                for expense in expenses:
                    months.add(expense.date.strftime('%Y-%m'))

                print(f"\n   📅 Κατανομή σε {len(months)} διαφορετικούς μήνες:")
                for month in sorted(months):
                    month_expenses = [e for e in expenses if e.date.strftime('%Y-%m') == month]
                    month_total = sum(e.amount for e in month_expenses)
                    print(f"      - {month}: €{month_total:.2f} ({len(month_expenses)} δαπάν{'η' if len(month_expenses) == 1 else 'ες'})")

                # Check advance payment
                advance_expenses = [e for e in expenses if 'Προκαταβολή' in e.title]
                if advance_expenses:
                    advance_total = sum(e.amount for e in advance_expenses)
                    print(f"\n   💰 Προκαταβολή: €{advance_total:.2f}")
                    if project.advance_payment:
                        if abs(advance_total - project.advance_payment) < 0.01:
                            print("      ✅ Το ποσό προκαταβολής ταιριάζει")
                        else:
                            print(f"      ❌ Διαφορά: €{abs(advance_total - project.advance_payment)}")

                # Check installments
                installment_expenses = [e for e in expenses if 'Δόση' in e.title]
                if installment_expenses:
                    print(f"\n   📦 Δόσεις: {len(installment_expenses)} δόσεις")
                    for installment in installment_expenses:
                        print(f"      - {installment.title}: €{installment.amount:.2f} ({installment.date.strftime('%B %Y')})")

            else:
                print("\n❌ Δεν βρέθηκαν δαπάνες για το έργο")

            # Check PaymentSchedule
            scheduled_maintenance = ScheduledMaintenance.objects.filter(
                title=project.title,
                building=project.building
            ).first()

            if scheduled_maintenance:
                try:
                    payment_schedule = scheduled_maintenance.payment_schedule
                    print(f"\n💳 PaymentSchedule:")
                    print(f"   - Type: {payment_schedule.payment_type}")
                    print(f"   - Total Amount: €{payment_schedule.total_amount}")
                    print(f"   - Advance %: {payment_schedule.advance_percentage}%")
                    print(f"   - Advance Amount: €{payment_schedule.advance_amount}")
                    print(f"   - Installment Count: {payment_schedule.installment_count}")
                    print(f"   - Status: {payment_schedule.status}")
                except:
                    print("\n⚠️ Δεν βρέθηκε PaymentSchedule")

        else:
            print("\n⚠️ Δεν βρέθηκε έργο με δόσεις")
            print("\n📁 Διαθέσιμα έργα:")
            projects = Project.objects.filter(status='approved').order_by('-created_at')[:5]
            for p in projects:
                print(f"   - {p.title} (installments: {p.installments or 1})")

if __name__ == '__main__':
    test_installment_expenses()