"""
🔍 Django Management Command για έλεγχο υγείας του οικονομικού συστήματος

Χρήση:
    python manage.py system_health_check [--detailed] [--fix] [--report-only]

Επιλογές:
    --detailed    : Λεπτομερής έξοδος
    --fix         : Αυτόματη διόρθωση προβλημάτων
    --report-only : Μόνο αναφορά χωρίς έλεγχο
"""

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment
from datetime import datetime
from typing import Dict, Any
import json


class SystemHealthChecker:
    """🔍 Main class για έλεγχο υγείας του συστήματος"""
    
    def __init__(self, detailed: bool = False, auto_fix: bool = False, stdout=None):
        self.detailed = detailed
        self.auto_fix = auto_fix
        self.stdout = stdout
        self.results = {
            'timestamp': datetime.now(),
            'building': None,
            'checks': {},
            'summary': {
                'total_checks': 0,
                'passed': 0,
                'failed': 0,
                'warnings': 0
            }
        }
        
    def print_header(self):
        """Εκτύπωση header"""
        self.stdout.write("SYSTEM HEALTH CHECK - New Concierge")
        self.stdout.write("=" * 60)
        self.stdout.write(f"Ημερομηνία: {self.results['timestamp'].strftime('%d/%m/%Y %H:%M:%S')}")
        self.stdout.write("Κτίριο: Αραχώβης 12, Αθήνα 106 80, Ελλάδα")
        self.stdout.write(f"Λεπτομερής έξοδος: {'Ενεργή' if self.detailed else 'Απενεργή'}")
        self.stdout.write(f"Αυτόματη διόρθωση: {'Ενεργή' if self.auto_fix else 'Απενεργή'}")
        self.stdout.write("=" * 60)
        self.stdout.write("")
        
    def check_building_data(self) -> Dict[str, Any]:
        """Έλεγχος βασικών δεδομένων κτιρίου"""
        self.stdout.write("ΕΛΕΓΧΟΣ ΒΑΣΙΚΩΝ ΔΕΔΟΜΕΝΩΝ ΚΤΙΡΙΟΥ")
        self.stdout.write("-" * 40)
        
        with schema_context('demo'):
            building = Building.objects.first()
            apartments = Apartment.objects.all()
            
            result = {
                'building_exists': building is not None,
                'apartments_count': apartments.count(),
                'apartments_with_mills': apartments.filter(participation_mills__gt=0).count(),
                'total_mills': sum(apt.participation_mills for apt in apartments),
                'expected_mills': 1000
            }
            
            # Εκτύπωση αποτελεσμάτων
            self.stdout.write(f"Κτίριο υπάρχει: {'Ναι' if result['building_exists'] else 'Όχι'}")
            self.stdout.write(f"Διαμερίσματα: {result['apartments_count']}")
            self.stdout.write(f"Διαμερίσματα με χιλιοστά: {result['apartments_with_mills']}")
            self.stdout.write(f"Συνολικά χιλιοστά: {result['total_mills']}")
            self.stdout.write(f"Αναμενόμενα χιλιοστά: {result['expected_mills']}")
            
            # Έλεγχος αν τα χιλιοστά είναι 0 (πρόβλημα) ή > 0 (λειτουργικό)
            if result['total_mills'] == 0:
                self.stdout.write("Δεν υπάρχουν χιλιοστά - πρόβλημα!")
                self.results['summary']['failed'] += 1
            elif result['total_mills'] == result['expected_mills']:
                self.stdout.write("Τα χιλιοστά είναι 1000 (προτεινόμενο)")
                self.results['summary']['passed'] += 1
            else:
                # Τα χιλιοστά δεν είναι 1000, αλλά το σύστημα λειτουργεί κανονικά
                difference = result['total_mills'] - result['expected_mills']
                scaling_factor = result['total_mills'] / result['expected_mills']
                
                self.stdout.write(f"Τα χιλιοστά είναι {result['total_mills']} (αναμενόμενα {result['expected_mills']})")
                self.stdout.write(f"   Scaling factor: {scaling_factor:.2f}x")
                self.stdout.write("   Το σύστημα λειτουργεί κανονικά με οποιοδήποτε σύνολο χιλιοστών")
                
                # Αυτόματη διόρθωση αν είναι ενεργοποιημένη
                if self.auto_fix and result['apartments_count'] > 0:
                    self.stdout.write("Εφαρμογή έξυπνης αυτόματης διόρθωσης...")
                    
                    # Έξυπνη διόρθωση
                    changes = []
                    
                    # Έξυπνη διόρθωση με καλύτερη λογική
                    if abs(difference) <= result['apartments_count']:
                        # Μικρή διαφορά - κατανέμουμε ισόποσα
                        self.stdout.write("Μικρή διαφορά - ισόποση κατανομή")
                        adjustment_per_apartment = difference / result['apartments_count']
                        
                        for apartment in apartments:
                            current_mills = apartment.participation_mills or 0
                            new_mills = max(0, current_mills - adjustment_per_apartment)
                            apartment.participation_mills = new_mills
                            apartment.save()
                            
                            self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills} ({adjustment_per_apartment:+.1f})")
                    
                    else:
                        # Μεγάλη διαφορά - έλεγχος για ομοιόμορφη κατανομή
                        self.stdout.write("Μεγάλη διαφορά - ανάλυση κατανομής")
                        
                        # Έλεγχος αν όλα τα διαμερίσματα έχουν ίδια χιλιοστά
                        unique_mills = set(apt.participation_mills or 0 for apt in apartments)
                        
                        if len(unique_mills) == 1:
                            # Όλα τα διαμερίσματα έχουν ίδια χιλιοστά - πιθανό scaling issue
                            common_mills = list(unique_mills)[0]
                            if common_mills > 0:
                                # Υπολογισμός scaling factor
                                scaling_factor = 1000 / (common_mills * result['apartments_count'])
                                self.stdout.write(f"   Ανιχνεύθηκε scaling issue: factor = {scaling_factor:.2f}")
                                
                                # Εφαρμογή scaling correction
                                for apartment in apartments:
                                    current_mills = apartment.participation_mills or 0
                                    new_mills = current_mills * scaling_factor
                                    apartment.participation_mills = new_mills
                                    apartment.save()
                                    
                                    self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills:.1f} (×{scaling_factor:.2f})")
                            else:
                                # Όλα είναι 0 - ισόποση κατανομή
                                equal_share = 1000 / result['apartments_count']
                                for apartment in apartments:
                                    apartment.participation_mills = equal_share
                                    apartment.save()
                                    self.stdout.write(f"   ✅ {apartment.number}: 0 → {equal_share:.1f}")
                        else:
                            # Διαφορετικά χιλιοστά - αναλογική κατανομή
                            self.stdout.write("Αναλογική κατανομή λόγω διαφορετικών χιλιοστών")
                            total_current = sum(apt.participation_mills or 0 for apt in apartments)
                            
                            if total_current > 0:
                                # Αναλογική μείωση/αύξηση
                                for apartment in apartments:
                                    current_mills = apartment.participation_mills or 0
                                    if total_current > 0:
                                        proportion = current_mills / total_current
                                        adjustment = difference * proportion
                                        new_mills = max(0, current_mills - adjustment)
                                    else:
                                        new_mills = 1000 / result['apartments_count']
                                    
                                    apartment.participation_mills = new_mills
                                    apartment.save()
                                    
                                    self.stdout.write(f"   {apartment.number}: {current_mills} → {new_mills:.1f}")
                            else:
                                # Αν δεν υπάρχουν καθόλου χιλιοστά, κατανέμουμε ισόποσα
                                equal_share = 1000 / result['apartments_count']
                                for apartment in apartments:
                                    apartment.participation_mills = equal_share
                                    apartment.save()
                                    self.stdout.write(f"   ✅ {apartment.number}: 0 → {equal_share:.1f}")
                    
                    # Επαναυπολογισμός μετά τη διόρθωση
                    updated_total = sum(apt.participation_mills for apt in Apartment.objects.all())
                    self.stdout.write(f"   Νέο σύνολο χιλιοστών: {updated_total}")
                    
                    if abs(updated_total - 1000) < 0.1:
                        self.stdout.write("   Η έξυπνη διόρθωση ήταν επιτυχής!")
                        self.results['summary']['passed'] += 1
                    else:
                        self.stdout.write(f"   Η διόρθωση δεν ήταν πλήρης (σύνολο: {updated_total})")
                        self.results['summary']['failed'] += 1
                else:
                    self.stdout.write("Συμβουλή: Εκτελέστε με --fix για έξυπνη αυτόματη διόρθωση")
                    self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['building_data'] = result
            self.stdout.write("")
            return result
            
    def check_financial_data(self) -> Dict[str, Any]:
        """Έλεγχος οικονομικών δεδομένων"""
        self.stdout.write("ΕΛΕΓΧΟΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
        self.stdout.write("-" * 40)
        
        with schema_context('demo'):
            expenses = Expense.objects.all()
            transactions = Transaction.objects.all()
            payments = Payment.objects.all()
            
            result = {
                'expenses_count': expenses.count(),
                'transactions_count': transactions.count(),
                'payments_count': payments.count(),
                'total_expenses': sum(exp.amount for exp in expenses),
                'total_transactions': sum(txn.amount for txn in transactions),
                'total_payments': sum(pay.amount for pay in payments),
                'months_with_data': len(set(exp.date.month for exp in expenses)) if expenses.exists() else 0,
                'expense_balance': 0,  # Θα ενημερωθεί παρακάτω
                'payment_balance': 0   # Θα ενημερωθεί παρακάτω
            }
            
            # Εκτύπωση αποτελεσμάτων
            self.stdout.write(f"Δαπάνες: {result['expenses_count']}")
            self.stdout.write(f"Συναλλαγές: {result['transactions_count']}")
            self.stdout.write(f"Πληρωμές: {result['payments_count']}")
            self.stdout.write(f"Μήνες με δεδομένα: {result['months_with_data']}")
            self.stdout.write(f"Συνολικές δαπάνες: {result['total_expenses']:.2f}€")
            self.stdout.write(f"Συνολικές συναλλαγές: {result['total_transactions']:.2f}€")
            self.stdout.write(f"Συνολικές πληρωμές: {result['total_payments']:.2f}€")
            
            # Έλεγχος ισορροπίας - Διορθωμένη λογική
            # Υπολογισμός των συναλλαγών που αφορούν δαπάνες
            expense_related_transactions = sum(txn.amount for txn in transactions.filter(
                type__in=['common_expense_charge', 'common_expense_payment']
            ))
            
            # Υπολογισμός των συναλλαγών που αφορούν πληρωμές
            payment_related_transactions = sum(txn.amount for txn in transactions.filter(
                type='payment_received'
            ))
            
            # Σωστός έλεγχος ισορροπίας
            expense_balance = result['total_expenses'] + expense_related_transactions  # Θα πρέπει να είναι 0
            payment_balance = result['total_payments'] - payment_related_transactions  # Πληρωμές χωρίς συναλλαγές
            
            if abs(expense_balance) < 0.01:  # Μικρή ανοχή για floating point
                self.stdout.write(f"Ισορροπία δαπανών: {expense_balance:.2f}€ (σωστή)")
                self.results['summary']['passed'] += 1
            else:
                self.stdout.write(f"Ισορροπία δαπανών: {expense_balance:.2f}€ (λάθος)")
                self.results['summary']['failed'] += 1
            
            # Ενημέρωση του result με τις πραγματικές τιμές
            result['expense_balance'] = expense_balance
            result['payment_balance'] = payment_balance
            
            # Έλεγχος πληρωμών χωρίς συναλλαγές (φυσιολογικό)
            if payment_balance > 0.01:
                self.stdout.write(f"Πληρωμές χωρίς συναλλαγές: {payment_balance:.2f}€ (φυσιολογικό)")
                self.results['summary']['warnings'] += 1
            else:
                self.stdout.write("Όλες οι πληρωμές έχουν συναλλαγές")
                self.results['summary']['passed'] += 1
            
            # Επιπλέον έλεγχος για τις πληρωμές
            self.results['summary']['total_checks'] += 1
            self.results['checks']['financial_data'] = result
            self.stdout.write("")
            return result
            
    def check_balance_transfer(self) -> Dict[str, Any]:
        """Έλεγχος μεταφοράς υπολοίπων"""
        self.stdout.write("ΕΛΕΓΧΟΣ ΜΕΤΑΦΟΡΑΣ ΥΠΟΛΟΙΠΩΝ")
        self.stdout.write("-" * 40)
        
        with schema_context('demo'):
            apartments = Apartment.objects.all()
            months_with_data = sorted(set(exp.date.month for exp in Expense.objects.all())) if Expense.objects.exists() else []
            
            result = {
                'apartments_checked': 0,
                'months_checked': len(months_with_data),
                'balance_issues': 0,
                'transfer_issues': 0
            }
            
            if not months_with_data:
                self.stdout.write("Δεν υπάρχουν δεδομένα για έλεγχο μεταφοράς υπολοίπων")
                self.results['summary']['passed'] += 1
                self.results['summary']['total_checks'] += 1
                self.results['checks']['balance_transfer'] = result
                self.stdout.write("")
                return result
            
            for apartment in apartments:
                apartment_balances = []
                for month in months_with_data:
                    # Υπολογισμός υπολοίπου ανά μήνα
                    expenses = sum(exp.amount for exp in Expense.objects.filter(
                        date__month=month
                    ))
                    payments = sum(pay.amount for pay in Payment.objects.filter(
                        apartment=apartment, date__month=month
                    ))
                    balance = payments - expenses
                    apartment_balances.append(balance)
                    
                    if self.detailed:
                        self.stdout.write(f"   🏠 {apartment.number}: {month}/2024 - Υπόλοιπο: {balance:.2f}€")
                
                # Έλεγχος μεταφοράς υπολοίπων
                for i in range(len(apartment_balances) - 1):
                    if abs(apartment_balances[i] - apartment_balances[i+1]) > 0.01:
                        result['transfer_issues'] += 1
                        if self.detailed:
                            self.stdout.write(f"   Πρόβλημα μεταφοράς: {apartment.number}")
                
                result['apartments_checked'] += 1
                
            if result['transfer_issues'] == 0:
                self.stdout.write("Η μεταφορά υπολοίπων είναι σωστή")
                self.results['summary']['passed'] += 1
            else:
                self.stdout.write(f"Βρέθηκαν {result['transfer_issues']} προβλήματα μεταφοράς")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['balance_transfer'] = result
            self.stdout.write("")
            return result
            
    def check_duplicate_charges(self) -> Dict[str, Any]:
        """Έλεγχος διπλών χρεώσεων"""
        self.stdout.write("ΕΛΕΓΧΟΣ ΔΙΠΛΩΝ ΧΡΕΩΣΕΩΝ")
        self.stdout.write("-" * 40)
        
        with schema_context('demo'):
            expenses = Expense.objects.all()
            payments = Payment.objects.all()
            
            # Έλεγχος διπλών δαπανών
            expense_duplicates = []
            for expense in expenses:
                duplicates = Expense.objects.filter(
                    title=expense.title,
                    amount=expense.amount,
                    date=expense.date
                ).exclude(id=expense.id)
                if duplicates.exists():
                    expense_duplicates.append(expense.id)
                    
            # Έλεγχος διπλών πληρωμών
            payment_duplicates = []
            for payment in payments:
                duplicates = Payment.objects.filter(
                    apartment=payment.apartment,
                    amount=payment.amount,
                    date=payment.date,
                    method=payment.method
                ).exclude(id=payment.id)
                if duplicates.exists():
                    payment_duplicates.append(payment.id)
                    
            result = {
                'expense_duplicates': len(expense_duplicates),
                'payment_duplicates': len(payment_duplicates),
                'total_duplicates': len(expense_duplicates) + len(payment_duplicates)
            }
            
            self.stdout.write(f"Διπλές δαπάνες: {result['expense_duplicates']}")
            self.stdout.write(f"Διπλές πληρωμές: {result['payment_duplicates']}")
            self.stdout.write(f"Συνολικές διπλές: {result['total_duplicates']}")
            
            if result['total_duplicates'] == 0:
                self.stdout.write("Δεν βρέθηκαν διπλές χρεώσεις")
                self.results['summary']['passed'] += 1
            else:
                self.stdout.write(f"Βρέθηκαν {result['total_duplicates']} διπλές χρεώσεις")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['duplicate_charges'] = result
            self.stdout.write("")
            return result
            
    def check_data_integrity(self) -> Dict[str, Any]:
        """Έλεγχος ακεραιότητας δεδομένων"""
        self.stdout.write("ΕΛΕΓΧΟΣ ΑΚΕΡΑΙΟΤΗΤΑΣ ΔΕΔΟΜΕΝΩΝ")
        self.stdout.write("-" * 40)
        
        with schema_context('demo'):
            result = {
                'orphaned_expenses': 0,
                'orphaned_payments': 0,
                'invalid_amounts': 0,
                'missing_titles': 0
            }
            
            # Έλεγχος orphaned records
            for expense in Expense.objects.all():
                if not expense.building:
                    result['orphaned_expenses'] += 1
                if expense.amount <= 0:
                    result['invalid_amounts'] += 1
                if not expense.title:
                    result['missing_titles'] += 1
                    
            for payment in Payment.objects.all():
                if not payment.apartment:
                    result['orphaned_payments'] += 1
                if payment.amount <= 0:
                    result['invalid_amounts'] += 1
                    
            total_issues = sum(result.values())
            
            self.stdout.write(f"Δαπάνες χωρίς κτίριο: {result['orphaned_expenses']}")
            self.stdout.write(f"Πληρωμές χωρίς διαμέρισμα: {result['orphaned_payments']}")
            self.stdout.write(f"Λάθος ποσά: {result['invalid_amounts']}")
            self.stdout.write(f"Λείπουν τίτλοι: {result['missing_titles']}")
            self.stdout.write(f"Συνολικά προβλήματα: {total_issues}")
            
            if total_issues == 0:
                self.stdout.write("Η ακεραιότητα δεδομένων είναι σωστή")
                self.results['summary']['passed'] += 1
            else:
                self.stdout.write(f"Βρέθηκαν {total_issues} προβλήματα ακεραιότητας")
                self.results['summary']['failed'] += 1
                
            self.results['summary']['total_checks'] += 1
            self.results['checks']['data_integrity'] = result
            self.stdout.write("")
            return result
            
    def generate_summary(self):
        """Δημιουργία συνοπτικής αναφοράς"""
        self.stdout.write("ΣΥΝΟΠΤΙΚΗ ΑΝΑΦΟΡΑ")
        self.stdout.write("=" * 60)
        
        summary = self.results['summary']
        total = summary['total_checks']
        passed = summary['passed']
        failed = summary['failed']
        
        self.stdout.write(f"Συνολικοί έλεγχοι: {total}")
        self.stdout.write(f"Επιτυχείς: {passed}")
        self.stdout.write(f"Αποτυχείς: {failed}")
        self.stdout.write(f"Προειδοποιήσεις: {summary['warnings']}")
        
        if total > 0:
            success_rate = (passed / total) * 100
            self.stdout.write(f"Ποσοστό επιτυχίας: {success_rate:.1f}%")
            
            if success_rate == 100:
                self.stdout.write("ΕΞΑΙΡΕΤΙΚΑ! Όλοι οι έλεγχοι επιτυχείς!")
                self.stdout.write("Το σύστημα είναι έτοιμο για παραγωγική χρήση!")
            elif success_rate >= 80:
                self.stdout.write("ΚΑΛΑ! Το σύστημα λειτουργεί σχετικά καλά")
            elif success_rate >= 60:
                self.stdout.write("ΠΡΟΣΟΧΗ! Χρειάζεται βελτίωση")
            else:
                self.stdout.write("Κρίσιμο!! Χρειάζεται άμεση διόρθωση")
                
        self.stdout.write("=" * 60)
        
    def run_all_checks(self):
        """Εκτέλεση όλων των ελέγχων"""
        self.print_header()
        
        try:
            self.check_building_data()
            self.check_financial_data()
            self.check_balance_transfer()
            self.check_duplicate_charges()
            self.check_data_integrity()
            
        except Exception as e:
            self.stdout.write(f"Σφάλμα κατά τον έλεγχο: {str(e)}")
            self.results['summary']['failed'] += 1
            
        self.generate_summary()
        return self.results


class Command(BaseCommand):
    help = 'Έλεγχος υγείας του οικονομικού συστήματος'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Λεπτομερής έξοδος',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Αυτόματη διόρθωση προβλημάτων',
        )
        parser.add_argument(
            '--report-only',
            action='store_true',
            help='Μόνο αναφορά χωρίς έλεγχο',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Εξαγωγή αποτελεσμάτων σε JSON',
        )
        
    def handle(self, *args, **options):
        if options['report_only']:
            self.stdout.write("📋 REPORT ONLY MODE")
            self.stdout.write("=" * 60)
            self.stdout.write("Αυτή η λειτουργία θα υλοποιηθεί στο μέλλον")
            return
            
        checker = SystemHealthChecker(
            detailed=options['detailed'], 
            auto_fix=options['fix'],
            stdout=self.stdout
        )
        results = checker.run_all_checks()
        
        # Εξαγωγή σε JSON αν ζητηθεί
        if options['json']:
            json_output = json.dumps(results, default=str, indent=2)
            self.stdout.write("\nJSON OUTPUT:")
            self.stdout.write(json_output)
        
        # Επιστροφή κωδικού εξόδου
        if results['summary']['failed'] > 0:
            raise CommandError("Βρέθηκαν προβλήματα στον έλεγχο υγείας")
        else:
            self.stdout.write(self.style.SUCCESS("Όλοι οι έλεγχοι επιτυχείς!"))
