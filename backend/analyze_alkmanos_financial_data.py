#!/usr/bin/env python3
"""
Financial Data Analysis Script for Alkmanos 22 Building
Analyzes all financial parameters and calculations to identify potential issues
"""

import os
import sys
import django
from decimal import Decimal
from datetime import datetime, date
from typing import Dict, Any, List

# Setup Django environment
sys.path.append('/home/theo/projects/linux_version/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db.models import Sum, Q, Count
from django.db import transaction
from buildings.models import Building
from apartments.models import Apartment
from financial.models import (
    Expense, Transaction, Payment, CommonExpensePeriod, 
    ApartmentShare, Supplier, MeterReading
)
from financial.services import CommonExpenseCalculator, AdvancedCommonExpenseCalculator

class FinancialDataAnalyzer:
    """Comprehensive financial data analyzer for building management system"""
    
    def __init__(self, building_id: int):
        self.building_id = building_id
        self.building = Building.objects.get(id=building_id)
        self.apartments = Apartment.objects.filter(building_id=building_id)
        self.issues = []
        self.warnings = []
        self.recommendations = []
        
    def analyze_all(self) -> Dict[str, Any]:
        """Run comprehensive analysis of all financial data"""
        print(f"🔍 Starting comprehensive financial analysis for building: {self.building.name}")
        print(f"📍 Address: {self.building.address}")
        print(f"🏢 Building ID: {self.building_id}")
        print("=" * 80)
        
        results = {
            'building_info': self.analyze_building_info(),
            'apartments': self.analyze_apartments(),
            'expenses': self.analyze_expenses(),
            'transactions': self.analyze_transactions(),
            'payments': self.analyze_payments(),
            'reserve_fund': self.analyze_reserve_fund(),
            'calculations': self.analyze_calculations(),
            'data_integrity': self.analyze_data_integrity(),
            'issues': self.issues,
            'warnings': self.warnings,
            'recommendations': self.recommendations
        }
        
        self.print_summary(results)
        return results
    
    def analyze_building_info(self) -> Dict[str, Any]:
        """Analyze building configuration and settings"""
        print("\n📋 1. BUILDING INFORMATION ANALYSIS")
        print("-" * 50)
        
        info = {
            'name': self.building.name,
            'address': self.building.address,
            'total_apartments': self.apartments.count(),
            'reserve_fund_goal': float(self.building.reserve_fund_goal or 0),
            'reserve_fund_duration_months': self.building.reserve_fund_duration_months or 0,
            'reserve_contribution_per_apartment': float(self.building.reserve_contribution_per_apartment or 0),
            'management_fee_per_apartment': float(self.building.management_fee_per_apartment or 0),
            'reserve_fund_start_date': self.building.reserve_fund_start_date,
            'created_at': self.building.created_at,
            'updated_at': self.building.updated_at
        }
        
        # Check for potential issues
        if not self.building.reserve_fund_goal:
            self.warnings.append("Reserve fund goal not set")
        
        if not self.building.reserve_fund_duration_months:
            self.warnings.append("Reserve fund duration not set")
            
        if not self.building.reserve_contribution_per_apartment:
            self.warnings.append("Reserve contribution per apartment not set")
        
        print(f"🏢 Building: {info['name']}")
        print(f"📍 Address: {info['address']}")
        print(f"🏠 Total Apartments: {info['total_apartments']}")
        print(f"💰 Reserve Fund Goal: €{info['reserve_fund_goal']:,.2f}")
        print(f"⏱️ Reserve Fund Duration: {info['reserve_fund_duration_months']} months")
        print(f"💵 Reserve Contribution per Apartment: €{info['reserve_contribution_per_apartment']:,.2f}")
        print(f"🏛️ Management Fee per Apartment: €{info['management_fee_per_apartment']:,.2f}")
        
        return info
    
    def analyze_apartments(self) -> Dict[str, Any]:
        """Analyze apartment data and participation mills"""
        print("\n🏠 2. APARTMENTS ANALYSIS")
        print("-" * 50)
        
        apartments_data = []
        total_mills = 0
        apartments_with_mills = 0
        apartments_with_balance = 0
        total_balance = Decimal('0.00')
        
        for apt in self.apartments:
            apt_data = {
                'id': apt.id,
                'number': apt.number,
                'identifier': apt.identifier,
                'owner_name': apt.owner_name,
                'tenant_name': apt.tenant_name,
                'participation_mills': apt.participation_mills or 0,
                'heating_mills': apt.heating_mills or 0,
                'elevator_mills': apt.elevator_mills or 0,
                'current_balance': float(apt.current_balance or 0),
                'square_meters': apt.square_meters or 0
            }
            
            apartments_data.append(apt_data)
            total_mills += apt.participation_mills or 0
            if apt.participation_mills:
                apartments_with_mills += 1
            if apt.current_balance:
                apartments_with_balance += 1
                total_balance += apt.current_balance
        
        # Check for issues
        if total_mills != 1000:
            self.issues.append(f"Total participation mills ({total_mills}) should be 1000")
        
        if apartments_with_mills != len(self.apartments):
            self.warnings.append(f"{len(self.apartments) - apartments_with_mills} apartments missing participation mills")
        
        summary = {
            'total_apartments': len(self.apartments),
            'total_mills': total_mills,
            'apartments_with_mills': apartments_with_mills,
            'apartments_with_balance': apartments_with_balance,
            'total_balance': float(total_balance),
            'average_balance': float(total_balance / len(self.apartments)) if self.apartments else 0,
            'apartments': apartments_data
        }
        
        print(f"🏠 Total Apartments: {summary['total_apartments']}")
        print(f"📊 Total Participation Mills: {summary['total_mills']}")
        print(f"✅ Apartments with Mills: {summary['apartments_with_mills']}")
        print(f"💰 Total Balance: €{summary['total_balance']:,.2f}")
        print(f"📈 Average Balance: €{summary['average_balance']:,.2f}")
        
        return summary
    
    def analyze_expenses(self) -> Dict[str, Any]:
        """Analyze expense data and distribution"""
        print("\n💸 3. EXPENSES ANALYSIS")
        print("-" * 50)
        
        expenses = Expense.objects.filter(building_id=self.building_id)
        
        # Group by category and distribution type
        categories = {}
        distribution_types = {}
        total_amount = Decimal('0.00')
        issued_expenses = 0
        unissued_expenses = 0
        
        for expense in expenses:
            total_amount += expense.amount
            
            # Category analysis
            category = expense.get_category_display()
            if category not in categories:
                categories[category] = {'count': 0, 'amount': Decimal('0.00')}
            categories[category]['count'] += 1
            categories[category]['amount'] += expense.amount
            
            # Distribution type analysis
            dist_type = expense.get_distribution_type_display()
            if dist_type not in distribution_types:
                distribution_types[dist_type] = {'count': 0, 'amount': Decimal('0.00')}
            distribution_types[dist_type]['count'] += 1
            distribution_types[dist_type]['amount'] += expense.amount
            
            if expense.is_issued:
                issued_expenses += 1
            else:
                unissued_expenses += 1
        
        # Check for issues
        if unissued_expenses > 0:
            self.warnings.append(f"{unissued_expenses} unissued expenses found")
        
        summary = {
            'total_expenses': len(expenses),
            'total_amount': float(total_amount),
            'issued_expenses': issued_expenses,
            'unissued_expenses': unissued_expenses,
            'categories': {k: {'count': v['count'], 'amount': float(v['amount'])} for k, v in categories.items()},
            'distribution_types': {k: {'count': v['count'], 'amount': float(v['amount'])} for k, v in distribution_types.items()}
        }
        
        print(f"💸 Total Expenses: {summary['total_expenses']}")
        print(f"💰 Total Amount: €{summary['total_amount']:,.2f}")
        print(f"✅ Issued Expenses: {summary['issued_expenses']}")
        print(f"⏳ Unissued Expenses: {summary['unissued_expenses']}")
        
        print("\n📊 Expense Categories:")
        for category, data in categories.items():
            print(f"  • {category}: {data['count']} expenses, €{data['amount']:,.2f}")
        
        print("\n📈 Distribution Types:")
        for dist_type, data in distribution_types.items():
            print(f"  • {dist_type}: {data['count']} expenses, €{data['amount']:,.2f}")
        
        return summary
    
    def analyze_transactions(self) -> Dict[str, Any]:
        """Analyze transaction history and balance calculations"""
        print("\n💳 4. TRANSACTIONS ANALYSIS")
        print("-" * 50)
        
        transactions = Transaction.objects.filter(building_id=self.building_id)
        
        # Group by type
        transaction_types = {}
        total_transactions = len(transactions)
        total_amount = Decimal('0.00')
        
        for transaction in transactions:
            total_amount += transaction.amount
            
            trans_type = transaction.get_type_display()
            if trans_type not in transaction_types:
                transaction_types[trans_type] = {'count': 0, 'amount': Decimal('0.00')}
            transaction_types[trans_type]['count'] += 1
            transaction_types[trans_type]['amount'] += transaction.amount
        
        # Check apartment balances
        apartment_balances = {}
        for apt in self.apartments:
            apt_transactions = transactions.filter(apartment=apt)
            calculated_balance = apt_transactions.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            
            apartment_balances[apt.number] = {
                'stored_balance': float(apt.current_balance or 0),
                'calculated_balance': float(calculated_balance),
                'difference': float(calculated_balance - (apt.current_balance or 0))
            }
            
            # Check for balance discrepancies
            if abs(calculated_balance - (apt.current_balance or 0)) > Decimal('0.01'):
                self.issues.append(f"Balance discrepancy for apartment {apt.number}: stored={apt.current_balance}, calculated={calculated_balance}")
        
        summary = {
            'total_transactions': total_transactions,
            'total_amount': float(total_amount),
            'transaction_types': {k: {'count': v['count'], 'amount': float(v['amount'])} for k, v in transaction_types.items()},
            'apartment_balances': apartment_balances
        }
        
        print(f"💳 Total Transactions: {summary['total_transactions']}")
        print(f"💰 Total Amount: €{summary['total_amount']:,.2f}")
        
        print("\n📊 Transaction Types:")
        for trans_type, data in transaction_types.items():
            print(f"  • {trans_type}: {data['count']} transactions, €{data['amount']:,.2f}")
        
        return summary
    
    def analyze_payments(self) -> Dict[str, Any]:
        """Analyze payment data and collection"""
        print("\n💵 5. PAYMENTS ANALYSIS")
        print("-" * 50)
        
        payments = Payment.objects.filter(apartment__building_id=self.building_id)
        
        # Group by type and method
        payment_types = {}
        payment_methods = {}
        total_payments = len(payments)
        total_amount = Decimal('0.00')
        
        for payment in payments:
            total_amount += payment.amount
            
            # Payment type analysis
            pay_type = payment.get_payment_type_display()
            if pay_type not in payment_types:
                payment_types[pay_type] = {'count': 0, 'amount': Decimal('0.00')}
            payment_types[pay_type]['count'] += 1
            payment_types[pay_type]['amount'] += payment.amount
            
            # Payment method analysis
            pay_method = payment.get_method_display()
            if pay_method not in payment_methods:
                payment_methods[pay_method] = {'count': 0, 'amount': Decimal('0.00')}
            payment_methods[pay_method]['count'] += 1
            payment_methods[pay_method]['amount'] += payment.amount
        
        summary = {
            'total_payments': total_payments,
            'total_amount': float(total_amount),
            'payment_types': {k: {'count': v['count'], 'amount': float(v['amount'])} for k, v in payment_types.items()},
            'payment_methods': {k: {'count': v['count'], 'amount': float(v['amount'])} for k, v in payment_methods.items()}
        }
        
        print(f"💵 Total Payments: {summary['total_payments']}")
        print(f"💰 Total Amount: €{summary['total_amount']:,.2f}")
        
        print("\n📊 Payment Types:")
        for pay_type, data in payment_types.items():
            print(f"  • {pay_type}: {data['count']} payments, €{data['amount']:,.2f}")
        
        print("\n💳 Payment Methods:")
        for pay_method, data in payment_methods.items():
            print(f"  • {pay_method}: {data['count']} payments, €{data['amount']:,.2f}")
        
        return summary
    
    def analyze_reserve_fund(self) -> Dict[str, Any]:
        """Analyze reserve fund calculations and status"""
        print("\n🏦 6. RESERVE FUND ANALYSIS")
        print("-" * 50)
        
        # Get reserve fund payments
        reserve_payments = Payment.objects.filter(
            apartment__building_id=self.building_id,
            payment_type='reserve_fund'
        )
        
        total_reserve_collected = reserve_payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        # Calculate monthly target
        monthly_target = 0
        if self.building.reserve_fund_goal and self.building.reserve_fund_duration_months:
            monthly_target = float(self.building.reserve_fund_goal) / float(self.building.reserve_fund_duration_months)
        else:
            monthly_target = float(self.building.reserve_contribution_per_apartment or 0) * len(self.apartments)
        
        # Calculate progress
        progress_percentage = 0
        if self.building.reserve_fund_goal:
            progress_percentage = (float(total_reserve_collected) / float(self.building.reserve_fund_goal)) * 100
        
        summary = {
            'reserve_fund_goal': float(self.building.reserve_fund_goal or 0),
            'reserve_fund_duration_months': self.building.reserve_fund_duration_months or 0,
            'monthly_target': monthly_target,
            'total_collected': float(total_reserve_collected),
            'progress_percentage': progress_percentage,
            'reserve_payments_count': len(reserve_payments),
            'reserve_fund_start_date': self.building.reserve_fund_start_date
        }
        
        print(f"🎯 Reserve Fund Goal: €{summary['reserve_fund_goal']:,.2f}")
        print(f"⏱️ Duration: {summary['reserve_fund_duration_months']} months")
        print(f"📅 Monthly Target: €{summary['monthly_target']:,.2f}")
        print(f"💰 Total Collected: €{summary['total_collected']:,.2f}")
        print(f"📊 Progress: {summary['progress_percentage']:.1f}%")
        print(f"💳 Reserve Payments: {summary['reserve_payments_count']}")
        
        # Check for issues
        if summary['progress_percentage'] > 100:
            self.warnings.append(f"Reserve fund over-collected: {summary['progress_percentage']:.1f}%")
        
        if summary['monthly_target'] == 0:
            self.issues.append("Monthly reserve fund target is zero")
        
        return summary
    
    def analyze_calculations(self) -> Dict[str, Any]:
        """Test calculation accuracy and logic"""
        print("\n🧮 7. CALCULATION ANALYSIS")
        print("-" * 50)
        
        try:
            # Test basic calculation
            basic_calculator = CommonExpenseCalculator(self.building_id)
            basic_shares = basic_calculator.calculate_shares()
            
            # Test advanced calculation
            advanced_calculator = AdvancedCommonExpenseCalculator(
                building_id=self.building_id,
                reserve_fund_monthly_total=float(self.building.reserve_contribution_per_apartment or 0) * len(self.apartments)
            )
            advanced_shares = advanced_calculator.calculate_advanced_shares()
            
            # Analyze results
            basic_total = sum(share['total_amount'] for share in basic_shares.values())
            advanced_total = sum(share['total_amount'] for share in advanced_shares['shares'].values())
            
            # Check for calculation issues
            if abs(basic_total - advanced_total) > Decimal('0.01'):
                self.issues.append(f"Calculation discrepancy: basic={basic_total}, advanced={advanced_total}")
            
            summary = {
                'basic_calculation_total': float(basic_total),
                'advanced_calculation_total': float(advanced_total),
                'calculation_difference': float(basic_total - advanced_total),
                'basic_shares_count': len(basic_shares),
                'advanced_shares_count': len(advanced_shares['shares']),
                'reserve_contribution': float(advanced_shares.get('reserve_contribution', 0))
            }
            
            print(f"🧮 Basic Calculation Total: €{summary['basic_calculation_total']:,.2f}")
            print(f"🧮 Advanced Calculation Total: €{summary['advanced_calculation_total']:,.2f}")
            print(f"📊 Calculation Difference: €{summary['calculation_difference']:,.2f}")
            print(f"💰 Reserve Contribution: €{summary['reserve_contribution']:,.2f}")
            
            return summary
            
        except Exception as e:
            self.issues.append(f"Calculation error: {str(e)}")
            return {'error': str(e)}
    
    def analyze_data_integrity(self) -> Dict[str, Any]:
        """Check data integrity and consistency"""
        print("\n🔍 8. DATA INTEGRITY ANALYSIS")
        print("-" * 50)
        
        integrity_checks = {
            'apartments_without_mills': 0,
            'apartments_without_owner': 0,
            'expenses_without_supplier': 0,
            'transactions_without_apartment': 0,
            'payments_without_reference': 0,
            'negative_balances': 0,
            'zero_amount_transactions': 0
        }
        
        # Check apartments
        for apt in self.apartments:
            if not apt.participation_mills:
                integrity_checks['apartments_without_mills'] += 1
            if not apt.owner_name:
                integrity_checks['apartments_without_owner'] += 1
        
        # Check expenses
        expenses_without_supplier = Expense.objects.filter(
            building_id=self.building_id,
            supplier__isnull=True
        ).count()
        integrity_checks['expenses_without_supplier'] = expenses_without_supplier
        
        # Check transactions
        transactions_without_apartment = Transaction.objects.filter(
            building_id=self.building_id,
            apartment__isnull=True
        ).count()
        integrity_checks['transactions_without_apartment'] = transactions_without_apartment
        
        zero_amount_transactions = Transaction.objects.filter(
            building_id=self.building_id,
            amount=0
        ).count()
        integrity_checks['zero_amount_transactions'] = zero_amount_transactions
        
        # Check payments
        payments_without_reference = Payment.objects.filter(
            apartment__building_id=self.building_id,
            reference_number=''
        ).count()
        integrity_checks['payments_without_reference'] = payments_without_reference
        
        # Check negative balances
        negative_balances = Apartment.objects.filter(
            building_id=self.building_id,
            current_balance__lt=0
        ).count()
        integrity_checks['negative_balances'] = negative_balances
        
        # Add warnings for integrity issues
        if integrity_checks['apartments_without_mills'] > 0:
            self.warnings.append(f"{integrity_checks['apartments_without_mills']} apartments without participation mills")
        
        if integrity_checks['apartments_without_owner'] > 0:
            self.warnings.append(f"{integrity_checks['apartments_without_owner']} apartments without owner name")
        
        if integrity_checks['expenses_without_supplier'] > 0:
            self.warnings.append(f"{integrity_checks['expenses_without_supplier']} expenses without supplier")
        
        if integrity_checks['transactions_without_apartment'] > 0:
            self.issues.append(f"{integrity_checks['transactions_without_apartment']} transactions without apartment reference")
        
        if integrity_checks['zero_amount_transactions'] > 0:
            self.warnings.append(f"{integrity_checks['zero_amount_transactions']} zero-amount transactions")
        
        print(f"🏠 Apartments without mills: {integrity_checks['apartments_without_mills']}")
        print(f"👤 Apartments without owner: {integrity_checks['apartments_without_owner']}")
        print(f"🏢 Expenses without supplier: {integrity_checks['expenses_without_supplier']}")
        print(f"💳 Transactions without apartment: {integrity_checks['transactions_without_apartment']}")
        print(f"💰 Zero-amount transactions: {integrity_checks['zero_amount_transactions']}")
        print(f"📝 Payments without reference: {integrity_checks['payments_without_reference']}")
        print(f"📉 Negative balances: {integrity_checks['negative_balances']}")
        
        return integrity_checks
    
    def print_summary(self, results: Dict[str, Any]):
        """Print analysis summary with issues and recommendations"""
        print("\n" + "=" * 80)
        print("📋 ANALYSIS SUMMARY")
        print("=" * 80)
        
        print(f"\n🏢 Building: {results['building_info']['name']}")
        print(f"📍 Address: {results['building_info']['address']}")
        print(f"🏠 Total Apartments: {results['apartments']['total_apartments']}")
        print(f"💰 Total Expenses: €{results['expenses']['total_amount']:,.2f}")
        print(f"💵 Total Payments: €{results['payments']['total_amount']:,.2f}")
        print(f"🏦 Reserve Fund Progress: {results['reserve_fund']['progress_percentage']:.1f}%")
        
        if self.issues:
            print(f"\n❌ ISSUES FOUND ({len(self.issues)}):")
            for i, issue in enumerate(self.issues, 1):
                print(f"  {i}. {issue}")
        
        if self.warnings:
            print(f"\n⚠️ WARNINGS ({len(self.warnings)}):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        
        if self.recommendations:
            print(f"\n💡 RECOMMENDATIONS ({len(self.recommendations)}):")
            for i, rec in enumerate(self.recommendations, 1):
                print(f"  {i}. {rec}")
        
        print(f"\n✅ Analysis completed successfully!")
        print("=" * 80)

def main():
    """Main analysis function"""
    # Building ID for Alkmanos 22
    building_id = 4
    
    try:
        analyzer = FinancialDataAnalyzer(building_id)
        results = analyzer.analyze_all()
        
        # Save results to file
        import json
        from datetime import datetime
        
        output_file = f"financial_analysis_alkmanos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Convert Decimal objects to float for JSON serialization
        def convert_decimals(obj):
            if isinstance(obj, Decimal):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_decimals(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_decimals(item) for item in obj]
            elif hasattr(obj, 'isoformat'):  # datetime objects
                return obj.isoformat()
            return obj
        
        results_json = convert_decimals(results)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results_json, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Analysis results saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
