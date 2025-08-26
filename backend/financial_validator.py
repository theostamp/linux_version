import os
import sys
import django
from decimal import Decimal
from typing import Dict, List, Any, Tuple
from datetime import datetime, date
from django.db.models import Sum, Q
from django.utils import timezone

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'new_concierge_backend.settings')
django.setup()

from django_tenants.utils import schema_context
from buildings.models import Building
from apartments.models import Apartment
from financial.models import Expense, Transaction, Payment, CommonExpensePeriod, ApartmentShare
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator, FinancialDashboardService


class FinancialDataValidator:
    """
    Εργαλείο αυτοματοποιημένου ελέγχου για εντοπισμό πιθανών αστοχιών
    στο οικονομικό σύστημα διαχείρισης κτιρίων.
    """
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.issues = []
        self.warnings = []
        
    def run_full_validation(self) -> Dict[str, Any]:
        """
        Εκτελεί πλήρη επικύρωση όλων των οικονομικών δεδομένων
        """
        print(f"🔍 ΕΠΙΚΥΡΩΣΗ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ - ΚΤΙΡΙΟ {self.building.name}")
        print("=" * 80)
        
        # 1. Έλεγχος βασικών κανόνων
        self._validate_participation_mills()
        self._validate_balance_consistency()
        self._validate_reserve_fund_logic()
        
        # 2. Έλεγχος χρονικών ασυνέπειων
        self._validate_future_expenses()
        self._validate_pending_transactions()
        
        # 3. Έλεγχος λογικής υπολογισμών
        self._validate_expense_distribution()
        self._validate_payment_breakdown()
        
        # 4. Έλεγχος ασυμφωνιών φύλλου κοινοχρήστων
        self._validate_common_expense_sheet_logic()
        
        # 5. Έλεγχος δεδομένων αποθεματικού
        self._validate_reserve_fund_data()
        
        return {
            'building_id': self.building_id,
            'building_name': self.building.name,
            'total_apartments': len(self.apartments),
            'issues': self.issues,
            'warnings': self.warnings,
            'critical_issues': len([i for i in self.issues if i['severity'] == 'critical']),
            'total_issues': len(self.issues),
            'total_warnings': len(self.warnings),
            'validation_date': timezone.now().isoformat()
        }
    
    def _validate_participation_mills(self):
        """Έλεγχος συνολικών χιλιοστών συμμετοχής"""
        print("\n📊 ΕΛΕΓΧΟΣ ΧΙΛΙΟΣΤΩΝ ΣΥΜΜΕΤΟΧΗΣ")
        
        total_mills = sum(apt.participation_mills or 0 for apt in self.apartments)
        
        if total_mills != 1000:
            self.issues.append({
                'type': 'participation_mills_mismatch',
                'severity': 'critical',
                'message': f'Συνολικό χιλιοστά ({total_mills}) ≠ 1000',
                'details': {
                    'total_mills': total_mills,
                    'difference': abs(1000 - total_mills)
                }
            })
            print(f"   ❌ ΚΡΙΤΙΚΟ: Συνολικό χιλιοστά = {total_mills} (πρέπει να είναι 1000)")
        else:
            print(f"   ✅ Συνολικό χιλιοστά = {total_mills}")
        
        # Έλεγχος για διαμερίσματα χωρίς χιλιοστά
        apartments_without_mills = [apt for apt in self.apartments if not apt.participation_mills]
        if apartments_without_mills:
            self.warnings.append({
                'type': 'apartments_without_mills',
                'severity': 'warning',
                'message': f'{len(apartments_without_mills)} διαμερίσματα χωρίς χιλιοστά',
                'details': {
                    'apartments': [apt.number for apt in apartments_without_mills]
                }
            })
            print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: {len(apartments_without_mills)} διαμερίσματα χωρίς χιλιοστά")
    
    def _validate_balance_consistency(self):
        """Έλεγχος συνέπειας υπολοίπων"""
        print("\n💰 ΕΛΕΓΧΟΣ ΣΥΝΕΠΕΙΑΣ ΥΠΟΛΟΙΠΩΝ")
        
        for apartment in self.apartments:
            calculated_balance = self._calculate_historical_balance(apartment)
            stored_balance = apartment.current_balance or Decimal('0.00')
            
            discrepancy = abs(calculated_balance - stored_balance)
            
            if discrepancy > Decimal('0.01'):  # Ανοχή 1 λεπτού
                self.issues.append({
                    'type': 'balance_discrepancy',
                    'severity': 'critical',
                    'message': f'Ασυμφωνία υπολοίπου διαμερίσματος {apartment.number}',
                    'details': {
                        'apartment_number': apartment.number,
                        'stored_balance': float(stored_balance),
                        'calculated_balance': float(calculated_balance),
                        'discrepancy': float(discrepancy)
                    }
                })
                print(f"   ❌ ΚΡΙΤΙΚΟ: Διαμέρισμα {apartment.number} - Ασυμφωνία {discrepancy:,.2f}€")
            else:
                print(f"   ✅ Διαμέρισμα {apartment.number} - Υπόλοιπο συνεπές")
    
    def _validate_reserve_fund_logic(self):
        """Έλεγχος λογικής αποθεματικού"""
        print("\n🏦 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        
        # Έλεγχος αν υπάρχουν εκκρεμότητες
        total_obligations = sum(abs(apt.current_balance) for apt in self.apartments if apt.current_balance and apt.current_balance < 0)
        
        if total_obligations > 0:
            # Έλεγχος αν συλλέγεται αποθεματικό ενώ υπάρχουν εκκρεμότητες
            dashboard_service = FinancialDashboardService(self.building_id)
            summary = dashboard_service.get_summary()
            reserve_contribution = summary.get('reserve_fund_contribution', 0)
            
            if reserve_contribution > 0:
                self.issues.append({
                    'type': 'reserve_fund_with_obligations',
                    'severity': 'critical',
                    'message': 'Συλλογή αποθεματικού ενώ υπάρχουν εκκρεμότητες',
                    'details': {
                        'total_obligations': float(total_obligations),
                        'reserve_contribution': float(reserve_contribution)
                    }
                })
                print(f"   ❌ ΚΡΙΤΙΚΟ: Συλλέγεται αποθεματικό ({reserve_contribution:,.2f}€) ενώ υπάρχουν εκκρεμότητες ({total_obligations:,.2f}€)")
            else:
                print(f"   ✅ Δεν συλλέγεται αποθεματικό (εκκρεμότητες: {total_obligations:,.2f}€)")
        else:
            print(f"   ✅ Δεν υπάρχουν εκκρεμότητες - Αποθεματικό μπορεί να συλλέγεται")
    
    def _validate_future_expenses(self):
        """Έλεγχος δαπανών μελλοντικών ημερομηνιών"""
        print("\n📅 ΕΛΕΓΧΟΣ ΔΑΠΑΝΩΝ ΜΕΛΛΟΝΤΙΚΩΝ ΗΜΕΡΟΜΗΝΙΩΝ")
        
        today = date.today()
        future_expenses = Expense.objects.filter(
            building_id=self.building_id,
            date__gt=today
        )
        
        if future_expenses.exists():
            self.warnings.append({
                'type': 'future_expenses',
                'severity': 'warning',
                'message': f'{future_expenses.count()} δαπάνες με μελλοντική ημερομηνία',
                'details': {
                    'expense_count': future_expenses.count(),
                    'expenses': [
                        {
                            'id': exp.id,
                            'title': exp.title,
                            'amount': float(exp.amount),
                            'date': exp.date.isoformat()
                        }
                        for exp in future_expenses[:10]  # Πρώτες 10 μόνο
                    ]
                }
            })
            print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: {future_expenses.count()} δαπάνες με μελλοντική ημερομηνία")
        else:
            print(f"   ✅ Όλες οι δαπάνες έχουν παρελθοντική ημερομηνία")
    
    def _validate_pending_transactions(self):
        """Έλεγχος εκκρεμών συναλλαγών"""
        print("\n⏳ ΕΛΕΓΧΟΣ ΕΚΚΡΕΜΩΝ ΣΥΝΑΛΛΑΓΩΝ")
        
        pending_transactions = Transaction.objects.filter(
            building_id=self.building_id,
            status='pending'
        )
        
        if pending_transactions.exists():
            self.warnings.append({
                'type': 'pending_transactions',
                'severity': 'warning',
                'message': f'{pending_transactions.count()} εκκρεμείς συναλλαγές',
                'details': {
                    'transaction_count': pending_transactions.count(),
                    'total_amount': float(pending_transactions.aggregate(total=Sum('amount'))['total'] or 0)
                }
            })
            print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: {pending_transactions.count()} εκκρεμείς συναλλαγές")
        else:
            print(f"   ✅ Δεν υπάρχουν εκκρεμείς συναλλαγές")
    
    def _validate_expense_distribution(self):
        """Έλεγχος κατανομής δαπανών"""
        print("\n📋 ΕΛΕΓΧΟΣ ΚΑΤΑΝΟΜΗΣ ΔΑΠΑΝΩΝ")
        
        # Έλεγχος αν όλες οι δαπάνες έχουν έγκυρο τρόπο κατανομής
        invalid_distribution_expenses = Expense.objects.filter(
            building_id=self.building_id,
            distribution_type__isnull=True
        )
        
        if invalid_distribution_expenses.exists():
            self.issues.append({
                'type': 'invalid_expense_distribution',
                'severity': 'critical',
                'message': f'{invalid_distribution_expenses.count()} δαπάνες χωρίς τρόπο κατανομής',
                'details': {
                    'expense_count': invalid_distribution_expenses.count()
                }
            })
            print(f"   ❌ ΚΡΙΤΙΚΟ: {invalid_distribution_expenses.count()} δαπάνες χωρίς τρόπο κατανομής")
        else:
            print(f"   ✅ Όλες οι δαπάνες έχουν έγκυρο τρόπο κατανομής")
    
    def _validate_payment_breakdown(self):
        """Έλεγχος ανάλυσης πληρωμών"""
        print("\n💳 ΕΛΕΓΧΟΣ ΑΝΑΛΥΣΗΣ ΠΛΗΡΩΜΩΝ")
        
        # Έλεγχος αν το άθροισμα των μερών πληρωμής ισούται με το συνολικό ποσό
        payments_with_breakdown = Payment.objects.filter(
            apartment__building_id=self.building_id
        )
        
        for payment in payments_with_breakdown:
            breakdown_sum = (payment.reserve_fund_amount or Decimal('0.00')) + \
                           (payment.previous_obligations_amount or Decimal('0.00'))
            
            if abs(payment.amount - breakdown_sum) > Decimal('0.01'):
                self.warnings.append({
                    'type': 'payment_breakdown_mismatch',
                    'severity': 'warning',
                    'message': f'Ασυμφωνία ανάλυσης πληρωμής διαμερίσματος {payment.apartment.number}',
                    'details': {
                        'apartment_number': payment.apartment.number,
                        'total_amount': float(payment.amount),
                        'breakdown_sum': float(breakdown_sum),
                        'difference': float(abs(payment.amount - breakdown_sum))
                    }
                })
                print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Διαμέρισμα {payment.apartment.number} - Ασυμφωνία ανάλυσης")
    
    def _validate_common_expense_sheet_logic(self):
        """Έλεγχος λογικής φύλλου κοινοχρήστων"""
        print("\n📄 ΕΛΕΓΧΟΣ ΛΟΓΙΚΗΣ ΦΥΛΛΟΥ ΚΟΙΝΟΧΡΗΣΤΩΝ")
        
        # Έλεγχος αν χρησιμοποιούνται σωστά τα πεδία
        calculator = CommonExpenseCalculator(self.building_id)
        shares = calculator.calculate_shares(include_reserve_fund=True)
        
        for apartment_id, share_data in shares.items():
            apartment = Apartment.objects.get(id=apartment_id)
            
            # Έλεγχος αν previous_balance = ιστορικό υπόλοιπο
            expected_previous_balance = self._calculate_historical_balance(apartment, None)
            if abs(share_data['previous_balance'] - expected_previous_balance) > Decimal('0.01'):
                self.issues.append({
                    'type': 'incorrect_previous_balance',
                    'severity': 'critical',
                    'message': f'Λανθασμένο previous_balance διαμερίσματος {apartment.number}',
                    'details': {
                        'apartment_number': apartment.number,
                        'calculated_previous_balance': float(share_data['previous_balance']),
                        'expected_previous_balance': float(expected_previous_balance)
                    }
                })
                print(f"   ❌ ΚΡΙΤΙΚΟ: Διαμέρισμα {apartment.number} - Λανθασμένο previous_balance")
    
    def _validate_reserve_fund_data(self):
        """Έλεγχος δεδομένων αποθεματικού"""
        print("\n🏦 ΕΛΕΓΧΟΣ ΔΕΔΟΜΕΝΩΝ ΑΠΟΘΕΜΑΤΙΚΟΥ")
        
        # Έλεγχος αν υπάρχει στόχος αποθεματικού αλλά όχι διάρκεια
        if self.building.reserve_fund_goal and not self.building.reserve_fund_duration_months:
            self.warnings.append({
                'type': 'reserve_fund_missing_duration',
                'severity': 'warning',
                'message': 'Στόχος αποθεματικού χωρίς διάρκεια',
                'details': {
                    'reserve_fund_goal': float(self.building.reserve_fund_goal)
                }
            })
            print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Στόχος αποθεματικού χωρίς διάρκεια")
        
        # Έλεγχος αν υπάρχει διάρκεια αλλά όχι στόχος
        if self.building.reserve_fund_duration_months and not self.building.reserve_fund_goal:
            self.warnings.append({
                'type': 'reserve_fund_missing_goal',
                'severity': 'warning',
                'message': 'Διάρκεια αποθεματικού χωρίς στόχο',
                'details': {
                    'reserve_fund_duration_months': self.building.reserve_fund_duration_months
                }
            })
            print(f"   ⚠️  ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Διάρκεια αποθεματικού χωρίς στόχο")
    
    def _calculate_historical_balance(self, apartment: Apartment, end_date: date = None) -> Decimal:
        """
        Υπολογίζει το ιστορικό υπόλοιπο διαμερίσματος
        """
        if not end_date:
            end_date = date.today()
        
        # Μετατροπή end_date σε timezone-aware datetime
        end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
        
        # Υπολογισμός από πληρωμές
        total_payments = Payment.objects.filter(
            apartment=apartment,
            date__lt=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός χρεώσεων από συναλλαγές
        total_charges = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_charge', 'expense_created', 'expense_issued', 
                     'interest_charge', 'penalty_charge']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Υπολογισμός επιπλέον εισπράξεων από συναλλαγές
        additional_payments = Transaction.objects.filter(
            apartment=apartment,
            date__lt=end_datetime,
            type__in=['common_expense_payment', 'payment_received', 'refund']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return total_payments + additional_payments - total_charges
    
    def generate_report(self) -> str:
        """
        Δημιουργεί αναφορά επικύρωσης
        """
        report = []
        report.append("# ΑΝΑΦΟΡΑ ΕΠΙΚΥΡΩΣΗΣ ΟΙΚΟΝΟΜΙΚΩΝ ΔΕΔΟΜΕΝΩΝ")
        report.append(f"**Κτίριο:** {self.building.name}")
        report.append(f"**Ημερομηνία:** {timezone.now().strftime('%d/%m/%Y %H:%M')}")
        report.append(f"**Συνολικά διαμερίσματα:** {len(self.apartments)}")
        report.append("")
        
        # Σύνοψη
        critical_issues = len([i for i in self.issues if i['severity'] == 'critical'])
        report.append(f"## ΣΥΝΟΨΗ")
        report.append(f"- **Κρίσιμα προβλήματα:** {critical_issues}")
        report.append(f"- **Συνολικά προβλήματα:** {len(self.issues)}")
        report.append(f"- **Προειδοποιήσεις:** {len(self.warnings)}")
        report.append("")
        
        # Κρίσιμα προβλήματα
        if critical_issues > 0:
            report.append("## ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ")
            for issue in [i for i in self.issues if i['severity'] == 'critical']:
                report.append(f"### {issue['message']}")
                report.append(f"- **Τύπος:** {issue['type']}")
                if issue['details']:
                    for key, value in issue['details'].items():
                        report.append(f"- **{key}:** {value}")
                report.append("")
        
        # Προειδοποιήσεις
        if self.warnings:
            report.append("## ΠΡΟΕΙΔΟΠΟΙΗΣΕΙΣ")
            for warning in self.warnings:
                report.append(f"### {warning['message']}")
                report.append(f"- **Τύπος:** {warning['type']}")
                if warning['details']:
                    for key, value in warning['details'].items():
                        report.append(f"- **{key}:** {value}")
                report.append("")
        
        return "\n".join(report)


def validate_building_financial_data(building_id: int) -> Dict[str, Any]:
    """
    Εκτελεί επικύρωση οικονομικών δεδομένων για ένα κτίριο
    """
    with schema_context('demo'):
        validator = FinancialDataValidator(building_id)
        result = validator.run_full_validation()
        
        # Εμφάνιση αποτελεσμάτων
        print(f"\n" + "=" * 80)
        print("📊 ΑΠΟΤΕΛΕΣΜΑΤΑ ΕΠΙΚΥΡΩΣΗΣ")
        print(f"   Κτίριο: {result['building_name']}")
        print(f"   Κρίσιμα προβλήματα: {result['critical_issues']}")
        print(f"   Συνολικά προβλήματα: {result['total_issues']}")
        print(f"   Προειδοποιήσεις: {result['total_warnings']}")
        
        if result['critical_issues'] > 0:
            print(f"\n❌ ΒΡΕΘΗΚΑΝ ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ!")
        elif result['total_issues'] > 0:
            print(f"\n⚠️  ΒΡΕΘΗΚΑΝ ΠΡΟΒΛΗΜΑΤΑ")
        else:
            print(f"\n✅ ΔΕΝ ΒΡΕΘΗΚΑΝ ΚΡΙΣΙΜΑ ΠΡΟΒΛΗΜΑΤΑ")
        
        return result


def validate_all_buildings() -> List[Dict[str, Any]]:
    """
    Εκτελεί επικύρωση για όλα τα κτίρια
    """
    with schema_context('demo'):
        buildings = Building.objects.all()
        results = []
        
        for building in buildings:
            print(f"\n{'='*80}")
            result = validate_building_financial_data(building.id)
            results.append(result)
        
        # Σύνοψη για όλα τα κτίρια
        total_critical = sum(r['critical_issues'] for r in results)
        total_issues = sum(r['total_issues'] for r in results)
        total_warnings = sum(r['total_warnings'] for r in results)
        
        print(f"\n{'='*80}")
        print("📊 ΣΥΝΟΨΗ ΓΙΑ ΟΛΑ ΤΑ ΚΤΙΡΙΑ")
        print(f"   Κτίρια ελεγμένα: {len(results)}")
        print(f"   Συνολικά κρίσιμα προβλήματα: {total_critical}")
        print(f"   Συνολικά προβλήματα: {total_issues}")
        print(f"   Συνολικές προειδοποιήσεις: {total_warnings}")
        
        return results


if __name__ == "__main__":
    # Εκτέλεση επικύρωσης για όλα τα κτίρια
    results = validate_all_buildings()
    
    # Δημιουργία αναφορών
    with schema_context('demo'):
        for result in results:
            if result['critical_issues'] > 0 or result['total_issues'] > 0:
                validator = FinancialDataValidator(result['building_id'])
                report = validator.generate_report()
                
                # Αποθήκευση αναφοράς σε αρχείο
                filename = f"financial_validation_report_building_{result['building_id']}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.md"
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(report)
                print(f"📄 Αποθηκεύτηκε αναφορά: {filename}")
