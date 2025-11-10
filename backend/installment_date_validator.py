#!/usr/bin/env python3
"""
🛡️ Script για validation και προστασία από λάθος ημερομηνίες δόσεων
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

class InstallmentDateValidator:
    """Κλάση για validation ημερομηνιών δόσεων"""
    
    @staticmethod
    def validate_project_installments(building_id):
        """Validation όλων των δόσεων ενός κτιρίου"""
        
        with schema_context('demo'):
            try:
                building = Building.objects.get(id=building_id)
            except Building.DoesNotExist:
                return {'valid': False, 'error': f'Κτίριο με ID {building_id} δεν βρέθηκε'}
            
            projects = ScheduledMaintenance.objects.filter(
                building=building,
                payment_schedule__isnull=False
            )
            
            results = {
                'valid': True,
                'building_name': building.name,
                'projects_checked': 0,
                'projects_with_issues': 0,
                'issues': []
            }
            
            for maintenance in projects:
                results['projects_checked'] += 1
                project_result = InstallmentDateValidator._validate_single_project(maintenance)
                
                if not project_result['valid']:
                    results['valid'] = False
                    results['projects_with_issues'] += 1
                    results['issues'].extend(project_result['issues'])
            
            return results
    
    @staticmethod
    def _validate_single_project(maintenance):
        """Validation ενός έργου"""
        
        schedule = maintenance.payment_schedule
        
        # Υπολογισμός αναμενόμενων ημερομηνιών
        from dateutil.relativedelta import relativedelta
        
        expected_dates = []
        current_date = schedule.start_date
        
        # Προκαταβολή
        if schedule.advance_amount > 0:
            expected_dates.append(('Προκαταβολή', current_date))
            current_date = current_date + relativedelta(months=1)
        
        # Δόσεις
        for i in range(schedule.installment_count):
            expected_dates.append((f'Δόση {i+1}', current_date))
            current_date = current_date + relativedelta(months=1)
        
        # Εύρεση πραγματικών δαπανών
        expenses = Expense.objects.filter(
            building=maintenance.building,
            title__icontains=maintenance.title
        ).order_by('date')
        
        result = {
            'valid': True,
            'project_title': maintenance.title,
            'issues': []
        }
        
        expense_list = list(expenses)
        
        # Έλεγχος κάθε δαπάνης
        for i, (desc, expected_date) in enumerate(expected_dates):
            if i < len(expense_list):
                actual_date = expense_list[i].date
                if expected_date != actual_date:
                    result['valid'] = False
                    result['issues'].append({
                        'type': 'date_mismatch',
                        'description': f"{desc}: Αναμενόμενη {expected_date}, Πραγματική {actual_date}",
                        'expected': expected_date,
                        'actual': actual_date
                    })
            else:
                result['valid'] = False
                result['issues'].append({
                    'type': 'missing_expense',
                    'description': f"Δεν βρέθηκε δαπάνη για {desc}",
                    'expected_date': expected_date
                })
        
        # Έλεγχος για επιπλέον δαπάνες
        if len(expense_list) > len(expected_dates):
            result['valid'] = False
            result['issues'].append({
                'type': 'extra_expenses',
                'description': f"Υπάρχουν {len(expense_list) - len(expected_dates)} επιπλέον δαπάνες",
                'extra_count': len(expense_list) - len(expected_dates)
            })
        
        return result
    
    @staticmethod
    def fix_project_installments(building_id, dry_run=True):
        """Διόρθωση δόσεων με λάθος ημερομηνίες"""
        
        with schema_context('demo'):
            building = Building.objects.get(id=building_id)
            
            projects = ScheduledMaintenance.objects.filter(
                building=building,
                payment_schedule__isnull=False
            )
            
            fixes_applied = 0
            
            for maintenance in projects:
                schedule = maintenance.payment_schedule
                
                # Υπολογισμός σωστών ημερομηνιών
                from dateutil.relativedelta import relativedelta
                
                expected_dates = []
                current_date = schedule.start_date
                
                # Προκαταβολή
                if schedule.advance_amount > 0:
                    expected_dates.append(('Προκαταβολή', current_date))
                    current_date = current_date + relativedelta(months=1)
                
                # Δόσεις
                for i in range(schedule.installment_count):
                    expected_dates.append((f'Δόση {i+1}', current_date))
                    current_date = current_date + relativedelta(months=1)
                
                # Εύρεση και διόρθωση δαπανών
                expenses = Expense.objects.filter(
                    building=building,
                    title__icontains=maintenance.title
                ).order_by('date')
                
                expense_list = list(expenses)
                
                for i, (desc, expected_date) in enumerate(expected_dates):
                    if i < len(expense_list):
                        expense = expense_list[i]
                        if expense.date != expected_date:
                            if not dry_run:
                                expense.date = expected_date
                                expense.save()
                            fixes_applied += 1
            
            return {
                'dry_run': dry_run,
                'fixes_applied': fixes_applied,
                'message': f"{'Θα εφαρμοστούν' if dry_run else 'Εφαρμόστηκαν'} {fixes_applied} διορθώσεις"
            }

def main():
    """Κύρια συνάρτηση"""
    
    print("🛡️ INSTALLMENT DATE VALIDATOR")
    print("=" * 70)
    
    # Validation
    print("🔍 ΕΛΕΓΧΟΣ ΔΟΣΕΩΝ...")
    result = InstallmentDateValidator.validate_project_installments(1)
    
    if result['valid']:
        print("✅ Όλες οι δόσεις έχουν σωστές ημερομηνίες!")
        print(f"✅ Ελέγχθηκαν {result['projects_checked']} έργα")
    else:
        print("❌ Βρέθηκαν προβλήματα!")
        print(f"❌ {result['projects_with_issues']} από {result['projects_checked']} έργα έχουν προβλήματα")
        
        for issue in result['issues']:
            print(f"   - {issue['description']}")
        
        print("\n🔧 ΔΙΟΡΘΩΣΗ...")
        fix_result = InstallmentDateValidator.fix_project_installments(1, dry_run=True)
        print(f"   {fix_result['message']}")
        
        if fix_result['fixes_applied'] > 0:
            print("\n⚠️ Για εφαρμογή των διορθώσεων, τρέξτε:")
            print("   InstallmentDateValidator.fix_project_installments(1, dry_run=False)")
    
    print("\n" + "=" * 70)
    print("✅ Η validation ολοκληρώθηκε!")

if __name__ == "__main__":
    main()
