#!/usr/bin/env python3
"""
🔍 Script για ανάλυση πώς δημιουργήθηκαν οι δόσεις
"""

import os
import sys
from datetime import datetime

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')

import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from financial.models import Expense
from maintenance.models import ScheduledMaintenance, PaymentSchedule

def analyze_installment_creation():
    """Ανάλυση πώς δημιουργήθηκαν οι δόσεις"""
    
    print("🔍 ΑΝΑΛΥΣΗ ΔΗΜΙΟΥΡΓΙΑΣ ΔΟΣΕΩΝ")
    print("=" * 70)
    
    with schema_context('demo'):
        building = Building.objects.get(id=1)  # Αλκμάνος 22
        
        print(f"🏢 Κτίριο: {building.name}")
        print()
        
        # Εύρεση του έργου "Στεγανοποίηση Ταράτσας"
        maintenance = ScheduledMaintenance.objects.filter(
            building=building,
            title__icontains='Στεγανοποίηση Ταράτσας'
        ).first()
        
        if maintenance:
            print(f"🔧 Βρέθηκε προγραμματισμένο έργο:")
            print(f"   📝 Τίτλος: {maintenance.title}")
            print(f"   💰 Εκτιμώμενο κόστος: {maintenance.estimated_cost}€")
            print(f"   💰 Συνολικό κόστος: {maintenance.total_cost}€")
            print(f"   📅 Ημερομηνία προγραμματισμού: {maintenance.scheduled_date}")
            print(f"   🔗 Συνδεδεμένη δαπάνη: {maintenance.linked_expense}")
            print()
            
            # Έλεγχος PaymentSchedule
            if hasattr(maintenance, 'payment_schedule') and maintenance.payment_schedule:
                schedule = maintenance.payment_schedule
                print(f"💳 PaymentSchedule:")
                print(f"   📋 Τύπος πληρωμής: {schedule.payment_type}")
                print(f"   💰 Συνολικό ποσό: {schedule.total_amount}€")
                print(f"   💰 Προκαταβολή: {schedule.advance_amount}€")
                print(f"   📅 Ημερομηνία έναρξης: {schedule.start_date}")
                print(f"   📊 Αριθμός δόσεων: {schedule.installment_count}")
                print(f"   📊 Ποσοστό προκαταβολής: {schedule.advance_percentage}%")
                print()
                
                # Έλεγχος installments
                installments = schedule.installments.all().order_by('due_date')
                print(f"📦 Installments ({installments.count()}):")
                for i, installment in enumerate(installments, 1):
                    print(f"   {i}. Ημερομηνία: {installment.due_date} | Ποσό: {installment.amount}€ | Κατάσταση: {installment.status}")
                print()
            else:
                print("❌ Δεν υπάρχει PaymentSchedule")
                print()
        
        # Έλεγχος δαπανών
        project_expenses = Expense.objects.filter(
            building=building,
            title__icontains='Στεγανοποίηση Ταράτσας'
        ).order_by('date')
        
        print(f"💸 Δαπάνες έργου ({project_expenses.count()}):")
        for expense in project_expenses:
            print(f"   📅 {expense.date} | {expense.title} | €{expense.amount}")
            print(f"      📝 Σημειώσεις: {expense.notes}")
        print()
        
        # Ανάλυση ημερομηνιών
        print("📅 ΑΝΑΛΥΣΗ ΗΜΕΡΟΜΗΝΙΩΝ:")
        print("-" * 50)
        
        # Υπολογισμός αναμενόμενων ημερομηνιών
        if maintenance and maintenance.payment_schedule:
            schedule = maintenance.payment_schedule
            start_date = schedule.start_date
            
            print(f"📅 Ημερομηνία έναρξης: {start_date}")
            
            # Προκαταβολή
            if schedule.advance_amount > 0:
                print(f"📅 Προκαταβολή: {start_date}")
            
            # Δόσεις
            from dateutil.relativedelta import relativedelta
            current_date = start_date
            
            if schedule.advance_amount > 0:
                current_date = current_date + relativedelta(months=1)
            
            for i in range(schedule.installment_count):
                print(f"📅 Δόση {i+1}: {current_date}")
                current_date = current_date + relativedelta(months=1)
        
        print("\n" + "=" * 70)
        print("✅ Η ανάλυση ολοκληρώθηκε!")

if __name__ == "__main__":
    analyze_installment_creation()
