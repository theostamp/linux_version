"""
Μόνιμη Λύση για Σωστό Υπολογισμό Υπολοίπων
==========================================

Αυτή η υπηρεσία παρέχει:
1. Αυτόματη επαλήθευση υπολοίπων
2. Ανίχνευση διπλών καταχωρήσεων
3. Επαναυπολογισμός υπολοίπων από ιστορικό συναλλαγών
4. Συστήματα ειδοποιήσεων για σφάλματα
"""

from decimal import Decimal
from datetime import datetime, date
from typing import Dict, List, Tuple, Optional, Any
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Q
from django.core.mail import send_mail
from django.conf import settings

from apartments.models import Apartment
from buildings.models import Building
from financial.models import Payment, Transaction
from users.models import CustomUser


class BalanceIntegrityService:
    """
    Υπηρεσία για τη διασφάλιση της ακεραιότητας των υπολοίπων
    """
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        
    def validate_all_balances(self) -> Dict[str, Any]:
        """
        Επαληθεύει όλα τα υπολοίπα του κτιρίου
        """
        print("🔍 ΕΠΑΛΗΘΕΥΣΗ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 50)
        
        results = {
            'building_id': self.building_id,
            'building_name': self.building.name,
            'total_apartments': self.apartments.count(),
            'validated_apartments': 0,
            'errors_found': 0,
            'corrections_made': 0,
            'apartment_results': [],
            'duplicate_transactions': [],
            'summary': {}
        }
        
        for apartment in self.apartments:
            print(f"\n🏠 Διαμέρισμα: {apartment.number} - {apartment.owner_name}")
            
            apartment_result = self.validate_apartment_balance(apartment)
            results['apartment_results'].append(apartment_result)
            results['validated_apartments'] += 1
            
            if apartment_result['has_errors']:
                results['errors_found'] += 1
                print(f"❌ Σφάλματα βρέθηκαν: {len(apartment_result['errors'])}")
            else:
                print("✅ Υπόλοιπο σωστό")
        
        # Ανίχνευση διπλών καταχωρήσεων
        duplicates = self.detect_duplicate_transactions()
        results['duplicate_transactions'] = duplicates
        
        if duplicates:
            print(f"\n⚠️ Βρέθηκαν {len(duplicates)} διπλές καταχωρήσεις")
            results['errors_found'] += len(duplicates)
        
        # Συνοψηση αποτελεσμάτων
        results['summary'] = {
            'total_errors': results['errors_found'],
            'apartments_with_errors': len([r for r in results['apartment_results'] if r['has_errors']]),
            'duplicate_transactions': len(duplicates),
            'validation_date': timezone.now().isoformat()
        }
        
        print(f"\n📊 ΣΥΝΟΨΗ:")
        print(f"   Συνολικά διαμερίσματα: {results['total_apartments']}")
        print(f"   Σφάλματα βρέθηκαν: {results['errors_found']}")
        print(f"   Διπλές καταχωρήσεις: {len(duplicates)}")
        
        return results
    
    def validate_apartment_balance(self, apartment: Apartment) -> Dict[str, Any]:
        """
        Επαληθεύει το υπόλοιπο ενός διαμερίσματος
        """
        result = {
            'apartment_id': apartment.id,
            'apartment_number': apartment.number,
            'owner_name': apartment.owner_name,
            'current_balance': float(apartment.current_balance or 0),
            'calculated_balance': 0,
            'difference': 0,
            'has_errors': False,
            'errors': [],
            'transactions_count': 0,
            'payments_count': 0
        }
        
        try:
            # Υπολογισμός από ιστορικό συναλλαγών
            calculated_balance = self._calculate_balance_from_transactions(apartment)
            result['calculated_balance'] = float(calculated_balance)
            
            # Υπολογισμός διαφοράς
            current_balance = apartment.current_balance or Decimal('0.00')
            difference = abs(current_balance - calculated_balance)
            result['difference'] = float(difference)
            
            # Έλεγχος για σφάλματα
            if difference > Decimal('0.01'):  # Tolerance για στρογγυλοποίηση
                result['has_errors'] = True
                result['errors'].append({
                    'type': 'balance_mismatch',
                    'description': f'Υπόλοιπο DB ({current_balance}€) ≠ Υπολογισμένο ({calculated_balance}€)',
                    'difference': float(difference)
                })
            
            # Έλεγχος για παράξενες συναλλαγές
            suspicious_transactions = self._detect_suspicious_transactions(apartment)
            if suspicious_transactions:
                result['has_errors'] = True
                result['errors'].extend(suspicious_transactions)
            
            # Στατιστικά
            result['transactions_count'] = Transaction.objects.filter(apartment=apartment).count()
            result['payments_count'] = Payment.objects.filter(apartment=apartment).count()
            
        except Exception as e:
            result['has_errors'] = True
            result['errors'].append({
                'type': 'calculation_error',
                'description': f'Σφάλμα υπολογισμού: {str(e)}'
            })
        
        return result
    
    def _calculate_balance_from_transactions(self, apartment: Apartment) -> Decimal:
        """
        Υπολογίζει το υπόλοιπο από το ιστορικό συναλλαγών
        """
        transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'created_at')
        
        balance = Decimal('0.00')
        
        for transaction in transactions:
            if transaction.type in ['payment', 'common_expense_payment', 'payment_received', 'refund']:
                balance += transaction.amount
            elif transaction.type in ['common_expense_charge', 'expense_created', 'expense_issued', 
                                    'interest_charge', 'penalty_charge']:
                balance -= transaction.amount
        
        return balance
    
    def _detect_suspicious_transactions(self, apartment: Apartment) -> List[Dict[str, Any]]:
        """
        Ανιχνεύει παράξενες συναλλαγές
        """
        suspicious = []
        
        # Έλεγχος για συναλλαγές με ίδιο ποσό την ίδια ημέρα
        transactions = Transaction.objects.filter(apartment=apartment).order_by('date')
        
        for i, transaction in enumerate(transactions):
            # Έλεγχος για διπλές καταχωρήσεις την ίδια ημέρα
            same_day_same_amount = Transaction.objects.filter(
                apartment=apartment,
                date__date=transaction.date.date(),
                amount=transaction.amount,
                type=transaction.type
            ).exclude(id=transaction.id)
            
            if same_day_same_amount.exists():
                suspicious.append({
                    'type': 'duplicate_same_day',
                    'description': f'Διπλή καταχώριση: {transaction.amount}€ ({transaction.get_type_display()})',
                    'transaction_id': transaction.id,
                    'date': transaction.date.isoformat()
                })
            
            # Έλεγχος για συναλλαγές με μηδενικό υπόλοιπο μετά από πληρωμή
            if (transaction.type in ['payment', 'common_expense_payment', 'payment_received'] and
                transaction.balance_after != Decimal('0.00') and
                abs(transaction.balance_after) < transaction.amount):
                suspicious.append({
                    'type': 'balance_not_zero_after_payment',
                    'description': f'Υπόλοιπο δεν μηδενίστηκε μετά πληρωμής: {transaction.balance_after}€',
                    'transaction_id': transaction.id,
                    'date': transaction.date.isoformat()
                })
        
        return suspicious
    
    def detect_duplicate_transactions(self) -> List[Dict[str, Any]]:
        """
        Ανιχνεύει διπλές καταχωρήσεις σε όλο το κτίριο
        """
        duplicates = []
        
        # Έλεγχος για συναλλαγές με ίδιο ποσό, τύπο και ημερομηνία
        apartments = self.apartments
        
        for apartment in apartments:
            transactions = Transaction.objects.filter(apartment=apartment).order_by('date', 'amount')
            
            for i, transaction in enumerate(transactions):
                # Έλεγχος για διπλές καταχωρήσεις
                potential_duplicates = Transaction.objects.filter(
                    apartment=apartment,
                    date__date=transaction.date.date(),
                    amount=transaction.amount,
                    type=transaction.type,
                    description__icontains=transaction.description.split(':')[0] if ':' in transaction.description else transaction.description
                ).exclude(id=transaction.id)
                
                if potential_duplicates.exists():
                    duplicates.append({
                        'apartment_number': apartment.number,
                        'owner_name': apartment.owner_name,
                        'original_transaction_id': transaction.id,
                        'duplicate_transaction_id': potential_duplicates.first().id,
                        'amount': float(transaction.amount),
                        'type': transaction.get_type_display(),
                        'date': transaction.date.isoformat(),
                        'description': transaction.description
                    })
        
        return duplicates
    
    def fix_apartment_balance(self, apartment: Apartment, force_correction: bool = False) -> Dict[str, Any]:
        """
        Διορθώνει το υπόλοιπο ενός διαμερίσματος
        """
        result = {
            'apartment_id': apartment.id,
            'apartment_number': apartment.number,
            'owner_name': apartment.owner_name,
            'old_balance': float(apartment.current_balance or 0),
            'new_balance': 0,
            'correction_made': False,
            'errors': []
        }
        
        try:
            with transaction.atomic():
                # Υπολογισμός σωστού υπολοίπου
                correct_balance = self._calculate_balance_from_transactions(apartment)
                
                # Έλεγχος αν χρειάζεται διόρθωση
                current_balance = apartment.current_balance or Decimal('0.00')
                difference = abs(current_balance - correct_balance)
                
                if difference > Decimal('0.01') or force_correction:
                    # Ενημέρωση υπολοίπου
                    apartment.current_balance = correct_balance
                    apartment.save()
                    
                    result['new_balance'] = float(correct_balance)
                    result['correction_made'] = True
                    
                    print(f"✅ Διορθώθηκε υπόλοιπο διαμερίσματος {apartment.number}: {current_balance}€ → {correct_balance}€")
                else:
                    result['new_balance'] = float(current_balance)
                    print(f"✅ Υπόλοιπο διαμερίσματος {apartment.number} είναι σωστό: {current_balance}€")
        
        except Exception as e:
            result['errors'].append({
                'type': 'correction_error',
                'description': f'Σφάλμα διόρθωσης: {str(e)}'
            })
        
        return result
    
    def fix_all_balances(self, force_correction: bool = False) -> Dict[str, Any]:
        """
        Διορθώνει όλα τα υπολοίπα του κτιρίου
        """
        print("🔧 ΔΙΟΡΘΩΣΗ ΥΠΟΛΟΙΠΩΝ")
        print("=" * 40)
        
        results = {
            'building_id': self.building_id,
            'building_name': self.building.name,
            'apartments_processed': 0,
            'corrections_made': 0,
            'errors': [],
            'apartment_results': []
        }
        
        for apartment in self.apartments:
            print(f"\n🏠 Διαμέρισμα: {apartment.number}")
            
            apartment_result = self.fix_apartment_balance(apartment, force_correction)
            results['apartment_results'].append(apartment_result)
            results['apartments_processed'] += 1
            
            if apartment_result['correction_made']:
                results['corrections_made'] += 1
            
            if apartment_result['errors']:
                results['errors'].extend(apartment_result['errors'])
        
        print(f"\n📊 ΣΥΝΟΨΗ ΔΙΟΡΘΩΣΗΣ:")
        print(f"   Διαμερίσματα επεξεργασμένα: {results['apartments_processed']}")
        print(f"   Διορθώσεις που έγιναν: {results['corrections_made']}")
        print(f"   Σφάλματα: {len(results['errors'])}")
        
        return results
    
    def remove_duplicate_transactions(self, duplicates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Αφαιρεί διπλές καταχωρήσεις
        """
        print("🗑️ ΑΦΑΙΡΕΣΗ ΔΙΠΛΩΝ ΚΑΤΑΧΩΡΗΣΕΩΝ")
        print("=" * 40)
        
        results = {
            'duplicates_found': len(duplicates),
            'duplicates_removed': 0,
            'errors': []
        }
        
        for duplicate in duplicates:
            try:
                with transaction.atomic():
                    # Διαγραφή της διπλής καταχώρισης
                    duplicate_transaction = Transaction.objects.get(id=duplicate['duplicate_transaction_id'])
                    duplicate_transaction.delete()
                    
                    results['duplicates_removed'] += 1
                    print(f"✅ Διαγράφηκε διπλή καταχώριση: {duplicate['apartment_number']} - {duplicate['amount']}€")
                    
                    # Επαναυπολογισμός υπολοίπου διαμερίσματος
                    apartment = Apartment.objects.get(number=duplicate['apartment_number'], building_id=self.building_id)
                    self.fix_apartment_balance(apartment)
                    
            except Exception as e:
                results['errors'].append({
                    'apartment_number': duplicate['apartment_number'],
                    'error': str(e)
                })
                print(f"❌ Σφάλμα διαγραφής: {duplicate['apartment_number']} - {e}")
        
        print(f"\n📊 ΣΥΝΟΨΗ:")
        print(f"   Διπλές καταχωρήσεις που βρέθηκαν: {results['duplicates_found']}")
        print(f"   Διπλές καταχωρήσεις που διαγράφηκαν: {results['duplicates_removed']}")
        print(f"   Σφάλματα: {len(results['errors'])}")
        
        return results
    
    def generate_integrity_report(self) -> str:
        """
        Δημιουργεί αναφορά ακεραιότητας
        """
        validation_results = self.validate_all_balances()
        
        report = f"""
# 📊 ΑΝΑΦΟΡΑ ΑΚΕΡΑΙΟΤΗΤΑΣ ΥΠΟΛΟΙΠΩΝ

## 🏢 Κτίριο
- **Όνομα**: {validation_results['building_name']}
- **ID**: {validation_results['building_id']}
- **Ημερομηνία Επαλήθευσης**: {validation_results['summary']['validation_date']}

## 📈 Συνολικά Στοιχεία
- **Συνολικά Διαμερίσματα**: {validation_results['total_apartments']}
- **Διαμερίσματα Επαληθευμένα**: {validation_results['validated_apartments']}
- **Σφάλματα Βρεθέντα**: {validation_results['summary']['total_errors']}
- **Διπλές Καταχωρήσεις**: {validation_results['summary']['duplicate_transactions']}

## 🔍 Λεπτομέρειες Σφαλμάτων
"""
        
        for apartment_result in validation_results['apartment_results']:
            if apartment_result['has_errors']:
                report += f"""
### 🏠 Διαμέρισμα {apartment_result['apartment_number']} - {apartment_result['owner_name']}
- **Τρέχον Υπόλοιπο**: {apartment_result['current_balance']}€
- **Υπολογισμένο Υπόλοιπο**: {apartment_result['calculated_balance']}€
- **Διαφορά**: {apartment_result['difference']}€

**Σφάλματα**:
"""
                for error in apartment_result['errors']:
                    report += f"- {error['description']}\n"
        
        if validation_results['duplicate_transactions']:
            report += "\n## ⚠️ Διπλές Καταχωρήσεις\n"
            for duplicate in validation_results['duplicate_transactions']:
                report += f"""
- **Διαμέρισμα**: {duplicate['apartment_number']} - {duplicate['owner_name']}
- **Ποσό**: {duplicate['amount']}€
- **Τύπος**: {duplicate['type']}
- **Ημερομηνία**: {duplicate['date']}
- **Περιγραφή**: {duplicate['description']}
"""
        
        return report
    
    def send_integrity_alert(self, results: Dict[str, Any], admin_email: str = None):
        """
        Στέλνει ειδοποίηση για προβλήματα ακεραιότητας
        """
        if not admin_email:
            admin_email = getattr(settings, 'ADMIN_EMAIL', 'admin@example.com')
        
        if results['errors_found'] > 0 or results['duplicate_transactions']:
            subject = f"⚠️ Προβλήματα Ακεραιότητας - {self.building.name}"
            
            message = f"""
Βρέθηκαν προβλήματα ακεραιότητας στο κτίριο {self.building.name}:

Σφάλματα: {results['errors_found']}
Διπλές Καταχωρήσεις: {len(results['duplicate_transactions'])}

Παρακαλώ ελέγξτε το σύστημα.
"""
            
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [admin_email])
                print(f"📧 Εστάλη ειδοποίηση στο {admin_email}")
            except Exception as e:
                print(f"❌ Σφάλμα αποστολής email: {e}")


class BalanceMaintenanceService:
    """
    Υπηρεσία για προληπτική συντήρηση υπολοίπων
    """
    
    @staticmethod
    def run_daily_validation():
        """
        Τρέχει καθημερινή επαλήθευση όλων των κτιρίων
        """
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"🔍 Επαλήθευση κτιρίου: {building.name}")
            
            service = BalanceIntegrityService(building.id)
            results = service.validate_all_balances()
            
            if results['errors_found'] > 0:
                service.send_integrity_alert(results)
    
    @staticmethod
    def run_weekly_cleanup():
        """
        Τρέχει εβδομαδιαία καθαρισμό
        """
        buildings = Building.objects.all()
        
        for building in buildings:
            print(f"🧹 Καθαρισμός κτιρίου: {building.name}")
            
            service = BalanceIntegrityService(building.id)
            
            # Επαλήθευση
            validation_results = service.validate_all_balances()
            
            # Διόρθωση υπολοίπων
            if validation_results['errors_found'] > 0:
                service.fix_all_balances()
            
            # Αφαίρεση διπλών καταχωρήσεων
            if validation_results['duplicate_transactions']:
                service.remove_duplicate_transactions(validation_results['duplicate_transactions'])
