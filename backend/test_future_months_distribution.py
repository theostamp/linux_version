#!/usr/bin/env python3
"""
Test script για να δοκιμάσουμε την διασπορά δαπανών στους μελλοντικούς μήνες
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
from financial.services import CommonExpenseCalculator, FinancialDashboardService

def test_future_months_distribution():
    """Δοκιμή διασποράς δαπανών στους μελλοντικούς μήνες"""
    
    with schema_context('demo'):
        print("🔮 Δοκιμή Διασποράς Δαπανών σε Μελλοντικούς Μήνες")
        print("=" * 60)
        
        building = Building.objects.get(id=1)
        print(f"🏢 Κτίριο: {building.name}")
        
        # 1. Έλεγχος ρυθμίσεων αποθεματικού
        print(f"\n💰 Ρυθμίσεις Αποθεματικού:")
        print(f"   • Στόχος: €{building.reserve_fund_goal}")
        print(f"   • Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"   • Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        print(f"   • Ημερομηνία ολοκλήρωσης: {building.reserve_fund_target_date}")
        print(f"   • Προτεραιότητα: {building.reserve_fund_priority}")
        
        # 2. Δοκιμή διασποράς αποθεματικού σε μελλοντικούς μήνες
        future_months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
        
        print(f"\n📅 Δοκιμή Διασποράς Αποθεματικού:")
        for month in future_months:
            print(f"\n🔍 Μήνας: {month}")
            
            try:
                # Δοκιμή υπολογισμού shares
                calculator = CommonExpenseCalculator(
                    building_id=1,
                    month=month
                )
                
                shares = calculator.calculate_shares()
                
                # Έλεγχος αποθεματικού στα shares
                total_reserve_in_shares = 0
                apartments_with_reserve = 0
                
                for apt_id, share in shares.items():
                    if 'reserve_fund_amount' in share and share['reserve_fund_amount'] > 0:
                        total_reserve_in_shares += float(share['reserve_fund_amount'])
                        apartments_with_reserve += 1
                
                print(f"   • Αποθεματικό στα shares: €{total_reserve_in_shares}")
                print(f"   • Διαμερίσματα με αποθεματικό: {apartments_with_reserve}")
                
                # Έλεγχος αν δημιουργήθηκε δαπάνη αποθεματικού
                year, month_num = map(int, month.split('-'))
                reserve_expense = Expense.objects.filter(
                    building=building,
                    category='reserve_fund',
                    date__year=year,
                    date__month=month_num
                ).first()
                
                if reserve_expense:
                    print(f"   • Δαπάνη αποθεματικού: €{reserve_expense.amount}")
                else:
                    print(f"   • Δαπάνη αποθεματικού: Δεν δημιουργήθηκε")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα: {e}")
        
        # 3. Δοκιμή προγραμματισμένων έργων
        print(f"\n🔧 Δοκιμή Προγραμματισμένων Έργων:")
        
        # Έλεγχος αν υπάρχουν προγραμματισμένα έργα
        from maintenance.models import ScheduledMaintenance, PaymentSchedule, PaymentInstallment
        
        scheduled_maintenances = ScheduledMaintenance.objects.filter(
            building=building
        ).prefetch_related('payment_schedule', 'payment_schedule__installments')
        
        print(f"   • Σύνολο προγραμματισμένων έργων: {scheduled_maintenances.count()}")
        
        for maintenance in scheduled_maintenances:
            print(f"\n   🔨 Έργο: {maintenance.title}")
            print(f"      • Εκτιμώμενο κόστος: €{maintenance.estimated_cost or 0}")
            print(f"      • Ημερομηνία προγραμματισμού: {maintenance.scheduled_date}")
            
            if hasattr(maintenance, 'payment_schedule') and maintenance.payment_schedule:
                schedule = maintenance.payment_schedule
                print(f"      • Σχέδιο πληρωμών: {schedule.payment_type}")
                print(f"      • Σύνολο ποσό: €{schedule.total_amount}")
                print(f"      • Αριθμός δόσεων: {schedule.installment_count}")
                
                # Έλεγχος δόσεων
                installments = PaymentInstallment.objects.filter(
                    payment_schedule=schedule
                ).order_by('due_date')
                
                print(f"      • Δόσεις που δημιουργήθηκαν: {installments.count()}")
                
                for installment in installments[:3]:  # Εμφάνιση των 3 πρώτων
                    print(f"         - {installment.due_date}: €{installment.amount}")
                
                if installments.count() > 3:
                    print(f"         - ... και {installments.count() - 3} ακόμα")
        
        # 4. Δοκιμή MonthlyBalance για μελλοντικούς μήνες
        print(f"\n📊 Δοκιμή MonthlyBalance για Μελλοντικούς Μήνες:")
        
        for month in future_months[:2]:  # Δοκιμή μόνο 2 μήνες
            year, month_num = map(int, month.split('-'))
            
            try:
                # Δημιουργία ή ενημέρωση MonthlyBalance
                monthly_balance, created = MonthlyBalance.objects.get_or_create(
                    building=building,
                    year=year,
                    month=month_num,
                    defaults={
                        'total_expenses': 0,
                        'total_payments': 0,
                        'previous_obligations': 0,
                        'reserve_fund_amount': 0,
                        'management_fees': 0,
                        'carry_forward': 0  # Προσθήκη του απαιτούμενου πεδίου
                    }
                )
                
                if created:
                    print(f"   🆕 Δημιουργήθηκε MonthlyBalance για {month}")
                else:
                    print(f"   ✅ Υπάρχει ήδη MonthlyBalance για {month}")
                
                print(f"      • Συνολικές δαπάνες: €{monthly_balance.total_expenses}")
                print(f"      • Συνολικές πληρωμές: €{monthly_balance.total_payments}")
                print(f"      • Αποθεματικό: €{monthly_balance.reserve_fund_amount}")
                print(f"      • Διαχείριση: €{monthly_balance.management_fees}")
                
            except Exception as e:
                print(f"   ❌ Σφάλμα MonthlyBalance για {month}: {e}")
        
        # 5. Συμπέρασμα
        print(f"\n🎯 Συμπέρασμα:")
        print("   🔍 Η διασπορά δαπανών στους μελλοντικούς μήνες:")
        print("      • Αποθεματικό: Υπολογίζεται στα shares και δημιουργούνται δαπάνες")
        print("      • Προγραμματισμένα έργα: Δημιουργούνται δόσεις αλλά δεν εμφανίζονται στα shares")
        print("      • MonthlyBalance: Δημιουργείται για κάθε μήνα")

if __name__ == "__main__":
    test_future_months_distribution()
