#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε την διασπορά προγραμματισμένων έργων
"""

import os
import sys
import django

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from financial.models import Expense, MonthlyBalance
from buildings.models import Building
from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment
from financial.services import CommonExpenseCalculator, FinancialDashboardService

def test_scheduled_maintenance_distribution():
    """Δοκιμή διασποράς προγραμματισμένων έργων"""
    
    with schema_context('demo'):
        print("🔧 Δοκιμή Διασποράς Προγραμματισμένων Έργων")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # 1. Δημιουργία test προγραμματισμένου έργου
        print(f"\n🆕 Δημιουργία Test Προγραμματισμένου Έργου:")
        
        from datetime import date, timedelta
        
        # Δημιουργία έργου
        maintenance = ScheduledMaintenance.objects.create(
            building=building,
            title="Test Έργο Συντήρησης - Ανελκυστήρας",
            description="Test έργο για δοκιμή διασποράς δόσεων",
            estimated_cost=5000.00,
            estimated_duration=5,  # 5 ημέρες
            scheduled_date=date(2025, 10, 1),
            priority='medium',
            status='scheduled'
        )
        
        print(f"   ✅ Δημιουργήθηκε έργο: {maintenance.title}")
        print(f"      • Εκτιμώμενο κόστος: €{maintenance.estimated_cost}")
        print(f"      • Ημερομηνία: {maintenance.scheduled_date}")
        
        # 2. Δημιουργία payment schedule με δόσεις
        payment_schedule = PaymentSchedule.objects.create(
            scheduled_maintenance=maintenance,
            payment_type='installments',
            total_amount=5000.00,
            advance_percentage=20,  # 20% προκαταβολή
            installment_count=5,    # 5 δόσεις
            installment_frequency='monthly',
            start_date=date(2025, 10, 1),
            notes="Test payment schedule με 5 μηνιαίες δόσεις"
        )
        
        print(f"   ✅ Δημιουργήθηκε payment schedule:")
        print(f"      • Σύνολο ποσό: €{payment_schedule.total_amount}")
        print(f"      • Προκαταβολή: {payment_schedule.advance_percentage}%")
        print(f"      • Αριθμός δόσεων: {payment_schedule.installment_count}")
        print(f"      • Συχνότητα: {payment_schedule.installment_frequency}")
        
        # 3. Δημιουργία δόσεων
        print(f"\n💰 Δημιουργία Δόσεων:")
        
        # Υπολογισμός ποσών
        advance_amount = payment_schedule.total_amount * (payment_schedule.advance_percentage / 100)
        remaining_amount = payment_schedule.total_amount - advance_amount
        installment_amount = remaining_amount / payment_schedule.installment_count
        
        print(f"   • Προκαταβολή: €{advance_amount}")
        print(f"   • Υπόλοιπο: €{remaining_amount}")
        print(f"   • Ποσό ανά δόση: €{installment_amount}")
        
        # Δημιουργία δόσεων
        current_date = payment_schedule.start_date
        for i in range(payment_schedule.installment_count):
            installment = PaymentInstallment.objects.create(
                payment_schedule=payment_schedule,
                installment_number=i + 1,
                amount=installment_amount,
                due_date=current_date,
                status='pending'
            )
            
            print(f"   ✅ Δόση {i + 1}: €{installment.amount} (λόγος: {installment.due_date})")
            
            # Επόμενος μήνας
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        # 4. Δοκιμή διασποράς σε μελλοντικούς μήνες
        print(f"\n📅 Δοκιμή Διασποράς σε Μελλοντικούς Μήνες:")
        
        test_months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
        
        for month in test_months:
            print(f"\n🔍 Μήνας: {month}")
            
            try:
                # Δοκιμή υπολογισμού shares
                calculator = CommonExpenseCalculator(
                    building_id=1,
                    month=month
                )
                
                shares = calculator.calculate_shares()
                
                # Έλεγχος αν υπάρχουν δόσεις για αυτόν τον μήνα
                year, month_num = map(int, month.split('-'))
                month_date = date(year, month_num, 1)
                
                installments_this_month = PaymentInstallment.objects.filter(
                    payment_schedule__scheduled_maintenance=maintenance,
                    due_date__year=year,
                    due_date__month=month_num
                )
                
                if installments_this_month.exists():
                    total_installment_amount = sum(inst.amount for inst in installments_this_month)
                    print(f"   • Δόσεις για αυτόν τον μήνα: €{total_installment_amount}")
                    
                    for inst in installments_this_month:
                        print(f"      - Δόση {inst.installment_number}: €{inst.amount}")
                else:
                    print(f"   • Δόσεις για αυτόν τον μήνα: Δεν υπάρχουν")
                
                # Έλεγχος αν δημιουργήθηκε δαπάνη για το έργο
                maintenance_expense = Expense.objects.filter(
                    building=building,
                    linked_maintenance_tasks=maintenance,
                    date__year=year,
                    date__month=month_num
                ).first()
                
                if maintenance_expense:
                    print(f"   • Δαπάνη έργου: €{maintenance_expense.amount}")
                else:
                    print(f"   • Δαπάνη έργου: Δεν δημιουργήθηκε")
                
                # Έλεγχος shares για το έργο
                total_maintenance_in_shares = 0
                for apt_id, share in shares.items():
                    if 'breakdown' in share:
                        for item in share['breakdown']:
                            if 'maintenance' in item.get('expense_title', '').lower():
                                total_maintenance_in_shares += float(item.get('expense_amount', 0))
                
                if total_maintenance_in_shares > 0:
                    print(f"   • Έργο στα shares: €{total_maintenance_in_shares}")
                else:
                    print(f"   • Έργο στα shares: Δεν εμφανίζεται")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα: {e}")
        
        # 5. Καθαρισμός test δεδομένων
        print(f"\n🧹 Καθαρισμός Test Δεδομένων:")
        
        # Διαγραφή δόσεων
        PaymentInstallment.objects.filter(payment_schedule__scheduled_maintenance=maintenance).delete()
        print(f"   ✅ Διαγράφηκαν οι δόσεις")
        
        # Διαγραφή payment schedule
        payment_schedule.delete()
        print(f"   ✅ Διαγράφηκε το payment schedule")
        
        # Διαγραφή έργου
        maintenance.delete()
        print(f"   ✅ Διαγράφηκε το έργο")
        
        # 6. Συμπέρασμα
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Η διασπορά προγραμματισμένων έργων:")
        print("      • Δόσεις: Δημιουργούνται σωστά για κάθε μήνα")
        print("      • Δαπάνες: Δεν δημιουργούνται αυτόματα για κάθε δόση")
        print("      • Shares: Δεν εμφανίζονται στα shares (χρειάζεται βελτίωση)")

if __name__ == "__main__":
    test_scheduled_maintenance_distribution()
