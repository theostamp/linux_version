#!/usr/bin/env python3
"""
Script για debugging του αποθεματικού στις οικονομικές υποχρεώσεις
"""

import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense, Payment

def debug_reserve_fund_obligations():
    """Debug γιατί το αποθεματικό δεν εμφανίζεται στις υποχρεώσεις"""
    
    print("🔍 DEBUG: ΑΠΟΘΕΜΑΤΙΚΟ ΣΤΙΣ ΟΙΚΟΝΟΜΙΚΕΣ ΥΠΟΧΡΕΩΣΕΙΣ")
    print("=" * 60)
    
    with schema_context('demo'):
        # Εύρεση κτιρίου Αραχώβης 12
        building = Building.objects.filter(name__icontains='Αραχώβης').first()
        
        if not building:
            print("❌ Δεν βρέθηκε το κτίριο Αραχώβης 12")
            return
        
        print(f"🏢 Κτίριο: {building.name}")
        print(f"📍 Διεύθυνση: {building.address}")
        
        # Έλεγχος ρυθμίσεων αποθεματικού
        print("\n📋 ΡΥΘΜΙΣΕΙΣ ΑΠΟΘΕΜΑΤΙΚΟΥ:")
        print(f"💰 Τρέχον αποθεματικό: {building.current_reserve:,.2f}€")
        print(f"🎯 Στόχος αποθεματικού: {building.reserve_fund_goal:,.2f}€")
        print(f"📅 Διάρκεια: {building.reserve_fund_duration_months} μήνες")
        print(f"📅 Ημερομηνία έναρξης: {building.reserve_fund_start_date}")
        
        # Υπολογισμός μηνιαίου στόχου
        if building.reserve_fund_duration_months > 0:
            monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
            print(f"📊 Μηνιαίος στόχος: {monthly_target:,.2f}€")
        
        # Έλεγχος τρέχοντος μήνα
        current_month = datetime.now().month
        current_year = datetime.now().year
        print(f"\n📅 ΤΡΕΧΩΝ ΜΗΝΑΣ: {current_year}-{current_month:02d}")
        
        # Έλεγχος αν είμαστε στην περίοδο εφαρμογής
        if building.reserve_fund_start_date:
            start_month = building.reserve_fund_start_date.month
            start_year = building.reserve_fund_start_date.year
            
            print(f"📅 ΜΗΝΑΣ ΕΝΑΡΞΗΣ: {start_year}-{start_month:02d}")
            
            # Έλεγχος αν είμαστε στην περίοδο εφαρμογής
            in_period = (current_year == start_year and current_month >= start_month) or current_year > start_year
            
            if in_period:
                print("✅ ΕΙΜΑΣΤΕ ΣΤΗΝ ΠΕΡΙΟΔΟ ΕΦΑΡΜΟΓΗΣ")
                print(f"💡 Η δόση των {monthly_target:,.2f}€ θα πρέπει να εμφανίζεται στις υποχρεώσεις")
            else:
                print("❌ ΔΕΝ ΕΙΜΑΣΤΕ ΣΤΗΝ ΠΕΡΙΟΔΟ ΕΦΑΡΜΟΓΗΣ")
        
        # Έλεγχος δαπανών τρέχοντος μήνα
        print("\n💸 ΔΑΠΑΝΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        expenses = Expense.objects.filter(
            building=building,
            date__year=current_year,
            date__month=current_month
        )
        
        total_expenses = sum(expense.amount for expense in expenses)
        print(f"📊 Αριθμός δαπανών: {expenses.count()}")
        print(f"💰 Συνολικό ποσό: {total_expenses:,.2f}€")
        
        # Έλεγχος πληρωμών τρέχοντος μήνα
        print("\n💳 ΠΛΗΡΩΜΕΣ ΤΡΕΧΟΝΤΟΣ ΜΗΝΑ:")
        payments = Payment.objects.filter(
            apartment__building=building,
            date__year=current_year,
            date__month=current_month
        )
        
        total_payments = sum(payment.amount for payment in payments)
        print(f"📊 Αριθμός πληρωμών: {payments.count()}")
        print(f"💰 Συνολικό ποσό: {total_payments:,.2f}€")
        
        # Υπολογισμός συνολικών υποχρεώσεων
        total_obligations = total_expenses + monthly_target
        print("\n💰 ΣΥΝΟΛΙΚΕΣ ΥΠΟΧΡΕΩΣΕΙΣ ΜΗΝΑ:")
        print(f"💸 Δαπάνες: {total_expenses:,.2f}€")
        print(f"🏦 Αποθεματικό: {monthly_target:,.2f}€")
        print(f"📊 ΣΥΝΟΛΟ: {total_obligations:,.2f}€")
        
        print("\n" + "=" * 60)
        print("🔍 ΕΛΕΓΧΟΣ ΟΛΟΚΛΗΡΩΘΗΚΕ!")
        print("💡 Αν το αποθεματικό δεν εμφανίζεται, μπορεί να είναι θέμα frontend logic")

if __name__ == "__main__":
    debug_reserve_fund_obligations()
