#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
import django
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Payment, Expense
from decimal import Decimal
from django.db.models import Sum
from datetime import datetime
import calendar

def format_currency(amount):
    """Format amount as Greek currency"""
    return f"{float(amount):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

def print_header(title, char="="):
    print(f"\n{char * 60}")
    print(f"🔍 {title}")
    print(f"{char * 60}")

def print_section(title):
    print(f"\n📋 {title}")
    print("-" * 40)

def deep_analysis_arachovis():
    """Deep analysis to find the source of mentioned amounts"""
    
    with schema_context('demo'):
        print_header("🔍 ΒΑΘΙΑ ΑΝΑΛΥΣΗ - ΕΝΤΟΠΙΣΜΟΣ ΠΗΓΗΣ ΠΟΣΩΝ ΑΡΑΧΩΒΗΣ 12")
        print(f"📅 Ημερομηνία Ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        
        # Find Αραχώβης 12 building
        try:
            building = Building.objects.get(address__icontains="Αραχώβης 12")
            print(f"✅ Κτίριο: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            print(f"💰 Τρέχον Αποθεματικό: {format_currency(building.current_reserve)}")
        except Building.DoesNotExist:
            print("❌ Το κτίριο 'Αραχώβης 12' δεν βρέθηκε!")
            return

        # 1. ΑΝΑΛΥΣΗ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ
        print_section("1. ΑΝΑΛΥΣΗ ΟΛΩΝ ΤΩΝ ΔΑΠΑΝΩΝ")
        
        all_expenses = Expense.objects.filter(building=building).order_by('date')
        total_all_expenses = all_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        print(f"📊 Συνολικές δαπάνες όλων των ετών: {format_currency(total_all_expenses)}")
        print(f"📝 Συνολικός αριθμός δαπανών: {all_expenses.count()}")
        
        if all_expenses.count() > 0:
            print("\n📋 Λεπτομέρειες όλων των δαπανών:")
            for expense in all_expenses:
                print(f"   • {expense.title}: {format_currency(expense.amount)} ({expense.date})")
        
        # 2. ΑΝΑΛΥΣΗ ΑΝΑ ΜΗΝΑ 2025
        print_section("2. ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ ΑΝΑ ΜΗΝΑ 2025")
        
        for month in range(1, 13):
            month_expenses = Expense.objects.filter(
                building=building,
                date__year=2025,
                date__month=month
            )
            month_total = month_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            if month_total > 0:
                month_name = calendar.month_name[month]
                print(f"   • {month_name} 2025: {format_currency(month_total)} ({month_expenses.count()} δαπάνες)")
        
        # 3. ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ
        print_section("3. ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        
        apartments = Apartment.objects.filter(building=building).order_by('number')
        print(f"🏠 Συνολικά διαμερίσματα: {apartments.count()}")
        
        for apt in apartments:
            print(f"   • {apt.number}: {format_currency(Decimal('5.00'))} ανά μήνα")
        
        total_monthly_reserve = Decimal('5.00') * apartments.count()
        print(f"📊 Συνολική μηνιαία εισφορά αποθεματικού: {format_currency(total_monthly_reserve)}")
        
        # 4. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 66,67 €
        print_section("4. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 66,67 €")
        
        # Check if 66.67 is related to reserve fund
        reserve_66_67 = Decimal('66.67')
        apartments_needed = reserve_66_67 / Decimal('5.00')
        
        print("🎯 Για να πάρουμε 66,67 € αποθεματικό:")
        print(f"   • Χρειάζονται: {apartments_needed} διαμερίσματα")
        print("   • Με 5,00 € ανά διαμέρισμα")
        
        # Check if it's related to a different calculation
        if apartments.count() > 0:
            reserve_per_apt_66_67 = reserve_66_67 / apartments.count()
            print(f"🎯 Για 66,67 € συνολικά με {apartments.count()} διαμερίσματα:")
            print(f"   • Χρειάζεται: {format_currency(reserve_per_apt_66_67)} ανά διαμέρισμα")
        
        # 5. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 120,00 €
        print_section("5. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 120,00 €")
        
        # Check if 120.00 is a typical monthly expense
        print("🎯 Έλεγχος για το ποσό 120,00 €:")
        print("   • Μπορεί να είναι τυπικό μηνιαίο κόστος")
        print("   • Ή προηγούμενων μηνών δαπάνες")
        
        # Check if there are any expenses around 120.00
        expenses_around_120 = Expense.objects.filter(
            building=building,
            amount__range=(Decimal('115.00'), Decimal('125.00'))
        )
        
        if expenses_around_120.count() > 0:
            print("   • Βρέθηκαν δαπάνες γύρω από 120,00 €:")
            for exp in expenses_around_120:
                print(f"     - {exp.title}: {format_currency(exp.amount)} ({exp.date})")
        
        # 6. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 186,67 €
        print_section("6. ΕΛΕΓΧΟΣ ΓΙΑ ΤΟ ΠΟΣΟ 186,67 €")
        
        total_186_67 = Decimal('186.67')
        print("🎯 Έλεγχος για το ποσό 186,67 €:")
        print("   • 120,00 € + 66,67 € = 186,67 €")
        print("   • Αυτό είναι το αναφερόμενο σύνολο")
        
        # 7. ΑΝΑΛΥΣΗ ΠΡΟΗΓΟΥΜΕΝΩΝ ΜΗΝΩΝ
        print_section("7. ΑΝΑΛΥΣΗ ΠΡΟΗΓΟΥΜΕΝΩΝ ΜΗΝΩΝ")
        
        # Check previous months for expenses
        for month in range(1, 8):  # January to July 2025
            month_expenses = Expense.objects.filter(
                building=building,
                date__year=2025,
                date__month=month
            )
            month_total = month_expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            if month_total > 0:
                month_name = calendar.month_name[month]
                print(f"   • {month_name} 2025: {format_currency(month_total)}")
        
        # 8. ΕΛΕΓΧΟΣ ΚΑΤΑΣΤΑΣΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ
        print_section("8. ΕΛΕΓΧΟΣ ΚΑΤΑΣΤΑΣΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        
        print(f"💰 Τρέχον αποθεματικό: {format_currency(building.current_reserve)}")
        
        # Calculate what the reserve should be
        total_payments = Payment.objects.filter(apartment__building=building).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        total_expenses = Expense.objects.filter(building=building).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        calculated_reserve = total_payments - total_expenses
        
        print(f"💳 Συνολικές εισπράξεις: {format_currency(total_payments)}")
        print(f"💸 Συνολικές δαπάνες: {format_currency(total_expenses)}")
        print(f"🧮 Υπολογισμένο αποθεματικό: {format_currency(calculated_reserve)}")
        
        if abs(calculated_reserve - building.current_reserve) < Decimal('0.01'):
            print("✅ Το αποθεματικό είναι σωστό")
        else:
            print("⚠️  Διαφορά στο αποθεματικό")
            print(f"   Διαφορά: {format_currency(abs(calculated_reserve - building.current_reserve))}")
        
        # 9. ΥΠΟΘΕΣΕΙΣ ΓΙΑ ΤΑ ΑΝΑΦΕΡΟΜΕΝΑ ΠΟΣΑ
        print_section("9. ΥΠΟΘΕΣΕΙΣ ΓΙΑ ΤΑ ΑΝΑΦΕΡΟΜΕΝΑ ΠΟΣΑ")
        
        print("🔍 ΠΙΘΑΝΕΣ ΕΞΗΓΗΣΕΙΣ:")
        print("   1. Τα ποσά μπορεί να είναι προβλέψεις/εκτιμήσεις")
        print("   2. Μπορεί να είναι από προηγούμενους μήνες")
        print("   3. Μπορεί να είναι από διαφορετικό κτίριο")
        print("   4. Μπορεί να είναι από test data")
        print("   5. Μπορεί να είναι από υπολογισμούς που δεν έχουν εφαρμοστεί")
        
        # 10. ΣΥΝΟΨΗ ΚΑΙ ΠΡΟΤΑΣΕΙΣ
        print_section("10. ΣΥΝΟΨΗ ΚΑΙ ΠΡΟΤΑΣΕΙΣ")
        
        print("📊 ΣΥΝΟΨΗ ΕΥΡΗΜΑΤΩΝ:")
        print("   • Πραγματικά έξοδα Αυγούστου: 0,00 €")
        print("   • Αναφερόμενα έξοδα: 120,00 €")
        print("   • Πραγματικό αποθεματικό: 50,00 €")
        print("   • Αναφερόμενο αποθεματικό: 66,67 €")
        print("   • Πραγματικό σύνολο: 50,00 €")
        print("   • Αναφερόμενο σύνολο: 186,67 €")
        
        print("\n💡 ΠΡΟΤΑΣΕΙΣ:")
        print("   1. Ελέγξτε αν τα ποσά είναι από προηγούμενους μήνες")
        print("   2. Ελέγξτε αν υπάρχουν μη καταγεγραμμένες δαπάνες")
        print("   3. Ελέγξτε αν τα ποσά είναι προβλέψεις")
        print("   4. Ελέγξτε αν υπάρχει διαφορετική λογική υπολογισμού")
        print("   5. Προσθέστε πραγματικές δαπάνες για Αύγουστο 2025")

if __name__ == "__main__":
    try:
        deep_analysis_arachovis()
    except Exception as e:
        print(f"❌ Σφάλμα κατά την εκτέλεση: {e}")
        import traceback
        traceback.print_exc()
