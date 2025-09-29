#!/usr/bin/env python3
"""
Comprehensive Financial Analysis for Αραχώβης 12
Analyzing the 334,85 € obligation coverage and overall financial status
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
import json

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building, ServicePackage
from apartments.models import Apartment
from financial.models import (
    Expense, Payment as Receipt, CommonExpensePeriod as CommonExpenseSheet, 
    Transaction
)
from django.db.models import Sum

def print_header(title, symbol="="):
    """Print formatted header"""
    print(f"\n{symbol * 60}")
    print(f" {title} ")
    print(f"{symbol * 60}")

def print_subheader(title, symbol="-"):
    """Print formatted subheader"""
    print(f"\n{symbol * 40}")
    print(f" {title} ")
    print(f"{symbol * 40}")

def format_currency(amount):
    """Format amount as EUR currency"""
    if amount is None:
        return "0,00 €"
    return f"{amount:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

def analyze_arachovis_building():
    """Main analysis function for Αραχώβης 12"""
    
    with schema_context('demo'):
        print_header("🏢 ΑΝΑΛΥΤΙΚΗ ΟΙΚΟΝΟΜΙΚΗ ΑΝΑΦΟΡΑ - ΑΡΑΧΩΒΗΣ 12", "=")
        print(f"📅 Ημερομηνία Ανάλυσης: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
        print("🔍 Περίοδος Ανάλυσης: Φεβρουάριος 2025")
        
        # Find Αραχώβης 12 building
        try:
            building = Building.objects.get(address__icontains="Αραχώβης 12")
            print(f"✅ Κτίριο Βρέθηκε: {building.name}")
            print(f"📍 Διεύθυνση: {building.address}")
            print(f"🏠 Συνολικά Διαμερίσματα: {building.total_apartments}")
        except Building.DoesNotExist:
            print("❌ Το κτίριο 'Αραχώβης 12' δεν βρέθηκε!")
            return
        except Exception as e:
            print(f"❌ Σφάλμα κατά την αναζήτηση του κτιρίου: {e}")
            return

        # 1. APARTMENT ANALYSIS
        print_header("🏠 ΑΝΑΛΥΣΗ ΔΙΑΜΕΡΙΣΜΑΤΩΝ")
        
        apartments = Apartment.objects.filter(building=building).order_by('apartment_number')
        print(f"Συνολικά Διαμερίσματα: {apartments.count()}")
        
        total_participation_mills = 0
        total_surface_area = 0
        
        for apt in apartments:
            print(f"\n🏠 Διαμέρισμα {apt.apartment_number}:")
            print(f"   👤 Ιδιοκτήτης: {apt.owner_name if apt.owner_name else 'Μη καθορισμένος'}")
            print(f"   📐 Τ.Μ.: {apt.surface_area if apt.surface_area else 'Μη καθορισμένο'}")
            print(f"   📊 Χιλιοστά: {apt.participation_mills if apt.participation_mills else 'Μη καθορισμένα'}")
            
            if apt.participation_mills:
                total_participation_mills += apt.participation_mills
            if apt.surface_area:
                total_surface_area += apt.surface_area

        print("\n📊 ΣΥΝΟΛΙΚΑ ΣΤΟΙΧΕΙΑ:")
        print(f"   • Συνολικά Χιλιοστά: {total_participation_mills}")
        print(f"   • Συνολικά Τ.Μ.: {total_surface_area}")
        print(f"   • Μέσα Χιλιοστά/Διαμέρισμα: {total_participation_mills/apartments.count():.1f}")

        # 2. EXPENSES ANALYSIS
        print_header("💸 ΑΝΑΛΥΣΗ ΔΑΠΑΝΩΝ")
        
        # Current month expenses
        current_month = date(2025, 2, 1)
        expenses = Expense.objects.filter(
            building=building,
            date__year=current_month.year,
            date__month=current_month.month
        ).order_by('-amount')
        
        print(f"📅 Δαπάνες Φεβρουαρίου 2025: {expenses.count()} δαπάνες")
        
        total_expenses = Decimal('0')
        for expense in expenses:
            print(f"   • {expense.description}: {format_currency(expense.amount)}")
            print(f"     📅 Ημερομηνία: {expense.date}")
            print(f"     🏷️ Κατηγορία: {expense.category}")
            print(f"     📋 Τύπος Κατανομής: {expense.allocation_type}")
            total_expenses += expense.amount

        print(f"\n💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ ΦΕΒΡΟΥΑΡΙΟΥ: {format_currency(total_expenses)}")

        # All unpaid expenses
        unpaid_expenses = Expense.objects.filter(
            building=building,
            is_paid=False
        ).order_by('-amount')
        
        print_subheader("🔄 ΑΝΕΚΔΟΤΕΣ ΔΑΠΑΝΕΣ")
        total_unpaid = Decimal('0')
        for expense in unpaid_expenses:
            print(f"   • {expense.description}: {format_currency(expense.amount)}")
            print(f"     📅 Ημερομηνία: {expense.date}")
            total_unpaid += expense.amount

        print(f"\n💰 ΣΥΝΟΛΟ ΑΝΕΚΔΟΤΩΝ ΔΑΠΑΝΩΝ: {format_currency(total_unpaid)}")

        # 3. RECEIPTS ANALYSIS
        print_header("💰 ΑΝΑΛΥΣΗ ΕΙΣΠΡΑΞΕΩΝ")
        
        receipts = Receipt.objects.filter(
            apartment__building=building,
            date__year=current_month.year,
            date__month=current_month.month
        ).order_by('-amount')
        
        total_receipts = Decimal('0')
        print(f"📅 Εισπράξεις Φεβρουαρίου 2025: {receipts.count()} εισπράξεις")
        
        for receipt in receipts:
            print(f"   • Διαμ. {receipt.apartment.apartment_number}: {format_currency(receipt.amount)}")
            print(f"     📅 Ημερομηνία: {receipt.date}")
            print(f"     ✅ Επιβεβαιωμένη: {'Ναι' if receipt.is_confirmed else 'ΟΧΙ'}")
            total_receipts += receipt.amount

        print(f"\n💰 ΣΥΝΟΛΟ ΕΙΣΠΡΑΞΕΩΝ: {format_currency(total_receipts)}")

        # Pending receipts
        pending_receipts = Receipt.objects.filter(
            apartment__building=building,
            is_confirmed=False
        ).order_by('-date')
        
        print_subheader("⏳ ΕΚΚΡΕΜΕΙΣ ΕΙΣΠΡΑΞΕΙΣ")
        pending_amount = Decimal('0')
        print(f"🔍 Εκκρεμείς Εισπράξεις: {pending_receipts.count()}")
        
        for receipt in pending_receipts:
            print(f"   • Διαμ. {receipt.apartment.apartment_number}: {format_currency(receipt.amount)}")
            print(f"     📅 Ημερομηνία: {receipt.date}")
            print(f"     📝 Περιγραφή: {receipt.description}")
            pending_amount += receipt.amount

        print(f"\n💰 ΣΥΝΟΛΟ ΕΚΚΡΕΜΩΝ ΕΙΣΠΡΑΞΕΩΝ: {format_currency(pending_amount)}")

        # 4. COMMON EXPENSE SHEETS ANALYSIS
        print_header("📊 ΑΝΑΛΥΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        
        common_sheets = CommonExpenseSheet.objects.filter(
            building=building
        ).order_by('-created_at')
        
        print(f"📋 Φύλλα Κοινοχρήστων: {common_sheets.count()}")
        
        latest_sheet = common_sheets.first() if common_sheets.exists() else None
        if latest_sheet:
            print("\n📄 ΤΕΛΕΥΤΑΙΟ ΦΥΛΛΟ ΚΟΙΝΟΧΡΗΣΤΩΝ:")
            print(f"   📅 Ημερομηνία: {latest_sheet.created_at.strftime('%d/%m/%Y')}")
            print(f"   💰 Συνολικό Ποσό: {format_currency(latest_sheet.total_amount)}")
            print(f"   🏠 Διαμερίσματα: {latest_sheet.apartment_count}")
            
            # Parse the calculation details if available
            if latest_sheet.calculation_details:
                try:
                    details = json.loads(latest_sheet.calculation_details)
                    print("\n🔍 ΛΕΠΤΟΜΕΡΕΙΕΣ ΥΠΟΛΟΓΙΣΜΟΥ:")
                    for key, value in details.items():
                        if isinstance(value, dict):
                            print(f"   {key}:")
                            for subkey, subvalue in value.items():
                                print(f"     • {subkey}: {subvalue}")
                        else:
                            print(f"   • {key}: {value}")
                except:
                    print(f"   📝 Λεπτομέρειες: {latest_sheet.calculation_details[:200]}...")

        # 5. RESERVE FUND ANALYSIS (if available)
        print_header("🏦 ΑΝΑΛΥΣΗ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        
        # Check if reserve funds exist in the system
        try:
            # Try to find any reserve-related transactions or obligations
            reserve_transactions = Transaction.objects.filter(
                apartment__building=building,
                description__icontains="αποθεματικό"
            )
            
            total_reserve = Decimal('0')
            print(f"💰 Συναλλαγές Αποθεματικού: {reserve_transactions.count()}")
            
            for trans in reserve_transactions:
                print(f"   • {trans.description}: {format_currency(trans.amount)}")
                print(f"     📅 Ημερομηνία: {trans.date}")
                total_reserve += trans.amount if trans.amount else Decimal('0')

            print(f"\n💰 ΣΥΝΟΛΟ ΑΠΟΘΕΜΑΤΙΚΟΥ: {format_currency(total_reserve)}")
            
        except Exception as e:
            print(f"⚠️ Δεν βρέθηκαν στοιχεία αποθεματικού: {e}")

        # 6. SERVICE PACKAGES ANALYSIS
        print_header("📦 ΑΝΑΛΥΣΗ ΠΑΚΕΤΩΝ ΥΠΗΡΕΣΙΩΝ")
        
        service_packages = ServicePackage.objects.filter(building=building)
        total_service_cost = Decimal('0')
        
        print(f"📦 Πακέτα Υπηρεσιών: {service_packages.count()}")
        for package in service_packages:
            print(f"   • {package.name}: {format_currency(package.monthly_cost)}")
            print(f"     📝 Περιγραφή: {package.description}")
            if package.services:
                print(f"     🛠️ Υπηρεσίες: {len(package.services)} υπηρεσίες")
            total_service_cost += package.monthly_cost if package.monthly_cost else Decimal('0')

        print(f"\n💰 ΣΥΝΟΛΙΚΟ ΚΟΣΤΟΣ ΥΠΗΡΕΣΙΩΝ: {format_currency(total_service_cost)}")

        # 7. TRANSACTIONS ANALYSIS
        print_header("💳 ΑΝΑΛΥΣΗ ΣΥΝΑΛΛΑΓΩΝ")
        
        transactions = Transaction.objects.filter(
            apartment__building=building
        ).order_by('-date')[:20]  # Last 20 transactions
        
        print(f"📊 Τελευταίες Συναλλαγές: {transactions.count()}")
        
        for trans in transactions:
            trans_type = "🟢 Πίστωση" if trans.amount > 0 else "🔴 Χρέωση"
            print(f"   • {trans_type}: {format_currency(abs(trans.amount))}")
            print(f"     🏠 Διαμ.: {trans.apartment.apartment_number}")
            print(f"     📅 Ημερομηνία: {trans.date}")
            print(f"     📝 Περιγραφή: {trans.description}")

        # 8. CALCULATION OF 334,85 € BREAKDOWN
        print_header("🔍 ΑΝΑΛΥΣΗ ΤΟΥ ΠΟΣΟΥ 334,85 €", "=")
        
        print("🎯 ΑΝΑΛΥΣΗ ΥΠΟΧΡΕΩΣΕΩΝ:")
        
        # Calculate current obligations
        monthly_common_expenses = total_expenses
        monthly_service_costs = total_service_cost
        monthly_reserve_contribution = total_reserve / 12 if total_reserve > 0 else Decimal('0')  # Estimated monthly
        
        print("\n💸 ΑΝΑΛΥΣΗ ΣΥΣΤΑΤΙΚΩΝ:")
        print(f"   • Δαπάνες Μήνα: {format_currency(monthly_common_expenses)}")
        print(f"   • Κόστος Υπηρεσιών: {format_currency(monthly_service_costs)}")
        print(f"   • Αποθεματικό: {format_currency(monthly_reserve_contribution)}")
        
        calculated_total = monthly_common_expenses + monthly_service_costs + monthly_reserve_contribution
        print(f"\n🧮 ΥΠΟΛΟΓΙΣΜΕΝΟ ΣΥΝΟΛΟ: {format_currency(calculated_total)}")
        print("🎯 ΣΤΟΧΟΣ (334,85 €): 334,85 €")
        print(f"📊 ΔΙΑΦΟΡΑ: {format_currency(calculated_total - Decimal('334.85'))}")

        # 9. BALANCE ANALYSIS PER APARTMENT
        print_header("⚖️ ΑΝΑΛΥΣΗ ΥΠΟΛΟΙΠΩΝ ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ")
        
        for apt in apartments:
            # Calculate balance from transactions
            apt_transactions = Transaction.objects.filter(apartment=apt)
            balance = apt_transactions.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
            
            print(f"\n🏠 Διαμέρισμα {apt.apartment_number}:")
            print(f"   👤 Ιδιοκτήτης: {apt.owner_name}")
            print(f"   💰 Υπόλοιπο: {format_currency(balance)}")
            
            if balance > 0:
                print("   ✅ Κατάσταση: Πιστωτικό υπόλοιπο")
            elif balance < 0:
                print("   ⚠️ Κατάσταση: Χρεωστικό υπόλοιπο")
            else:
                print("   ⚖️ Κατάσταση: Εξισορροπημένο")

        # 10. SUMMARY
        print_header("📋 ΣΥΝΟΨΗ ΑΝΑΛΥΣΗΣ", "=")
        
        print("🏢 Κτίριο: Αραχώβης 12")
        print("📅 Περίοδος: Φεβρουάριος 2025")
        print(f"🏠 Διαμερίσματα: {apartments.count()}")
        print(f"💸 Συνολικές Δαπάνες: {format_currency(total_expenses)}")
        print(f"💰 Συνολικές Εισπράξεις: {format_currency(total_receipts)}")
        print(f"⏳ Εκκρεμείς Εισπράξεις: {pending_receipts.count()} ({format_currency(pending_amount)})")
        print("🎯 Υποχρεώσεις Περιόδου: 334,85 €")
        print(f"📊 Κάλυψη: {'✅ Επαρκής' if total_receipts >= Decimal('334.85') else '⚠️ Ανεπαρκής'}")

        print("\n🔍 ΠΙΘΑΝΕΣ ΑΙΤΙΕΣ ΓΙΑ ΤΟ ΠΟΣΟ 334,85 €:")
        print("   1. Υπολογισμός κοινοχρήστων βάσει τελευταίου φύλλου")
        print("   2. Μηνιαίες δόσεις αποθεματικού")
        print("   3. Κόστος πακέτων υπηρεσιών")
        print("   4. Τρέχουσες ανεκδοτές δαπάνες")
        print("   5. Combination των παραπάνω")

        print("\n🎯 ΠΡΟΤΑΣΕΙΣ ΕΝΕΡΓΕΙΩΝ:")
        print(f"   • Επιβεβαίωση των {pending_receipts.count()} εκκρεμών πληρωμών")
        print("   • Έλεγχος υπολογισμού κοινοχρήστων")
        print("   • Επαλήθευση δόσεων αποθεματικού")
        print("   • Ενημέρωση φύλλου κοινοχρήστων")

if __name__ == "__main__":
    analyze_arachovis_building()
