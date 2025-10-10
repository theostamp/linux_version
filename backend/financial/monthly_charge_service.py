"""
Monthly Charge Service - Automatic Monthly Charge Creation

This service handles automatic creation of monthly recurring charges:
- Management Fees (Δαπάνες Διαχείρισης)
- Reserve Fund (Αποθεματικό)
- Project Installments (Δόσεις Έργων)

Created: 2025-10-10
Purpose: Ensure all monthly charges are created consistently and automatically
"""

import logging
from decimal import Decimal
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from dateutil.relativedelta import relativedelta

from django.db import transaction
from django.utils import timezone

from buildings.models import Building
from apartments.models import Apartment
from .models import Expense, Transaction
from .utils.date_helpers import is_date_in_reserve_fund_timeline, get_month_first_day

logger = logging.getLogger(__name__)


class MonthlyChargeService:
    """
    Κεντρική υπηρεσία για αυτόματη δημιουργία μηνιαίων χρεώσεων
    
    ΚΑΝΟΝΕΣ:
    1. Management Fees ξεκινούν από τον μήνα που ορίζεται το πακέτο (financial_system_start_date)
    2. Reserve Fund ξεκινάει από reserve_fund_start_date
    3. Όλες οι χρεώσεις γίνονται την 1η του μήνα
    4. Αν δεν πληρωθούν, μεταφέρονται αυτόματα στον επόμενο μήνα
    """
    
    @staticmethod
    @transaction.atomic
    def create_monthly_charges(building: Building, target_month: date) -> Dict[str, Any]:
        """
        Δημιουργία όλων των μηνιαίων χρεώσεων για μια πολυκατοικία
        
        Args:
            building: Η πολυκατοικία
            target_month: Ο μήνας για τον οποίο δημιουργούμε χρεώσεις (date object, 1η του μήνα)
            
        Returns:
            Dict με στατιστικά: {
                'management_fees_created': bool,
                'management_fees_amount': Decimal,
                'reserve_fund_created': bool,
                'reserve_fund_amount': Decimal,
                'apartments_charged': int,
                'transactions_created': int
            }
        """
        # Normalize to first day of month
        target_month = get_month_first_day(target_month.year, target_month.month)
        
        result = {
            'building_id': building.id,
            'building_name': building.name,
            'target_month': target_month.strftime('%Y-%m'),
            'management_fees_created': False,
            'management_fees_amount': Decimal('0.00'),
            'reserve_fund_created': False,
            'reserve_fund_amount': Decimal('0.00'),
            'apartments_charged': 0,
            'transactions_created': 0
        }
        
        # 1. Management Fees (Δαπάνες Διαχείρισης)
        if MonthlyChargeService._should_charge_management_fees(building, target_month):
            mgmt_result = MonthlyChargeService._create_management_fee_charges(
                building, target_month
            )
            result['management_fees_created'] = mgmt_result['created']
            result['management_fees_amount'] = mgmt_result['total_amount']
            result['transactions_created'] += mgmt_result['transactions_created']
            logger.info(f"✅ Management fees created for {building.name} - {target_month}: {mgmt_result['total_amount']}€")
        
        # 2. Reserve Fund (Αποθεματικό)
        if MonthlyChargeService._should_charge_reserve_fund(building, target_month):
            reserve_result = MonthlyChargeService._create_reserve_fund_charges(
                building, target_month
            )
            result['reserve_fund_created'] = reserve_result['created']
            result['reserve_fund_amount'] = reserve_result['total_amount']
            result['transactions_created'] += reserve_result['transactions_created']
            logger.info(f"✅ Reserve fund created for {building.name} - {target_month}: {reserve_result['total_amount']}€")
        
        # 3. Project Installments (Δόσεις Έργων)
        # TODO: Implement project installments when needed
        
        result['apartments_charged'] = building.apartments.count()
        
        logger.info(
            f"📊 Monthly charges completed for {building.name} - {target_month}: "
            f"{result['transactions_created']} transactions created"
        )
        
        return result
    
    @staticmethod
    def _should_charge_management_fees(building: Building, target_month: date) -> bool:
        """
        Έλεγχος αν πρέπει να χρεώσουμε management fees για τον συγκεκριμένο μήνα
        
        Management fees ξεκινούν από το financial_system_start_date
        """
        # Έλεγχος αν υπάρχει management fee ρύθμιση
        if not building.management_fee_per_apartment or building.management_fee_per_apartment <= 0:
            return False
        
        # Έλεγχος αν έχει ορισθεί ημερομηνία έναρξης
        if not building.financial_system_start_date:
            logger.warning(f"⚠️ Building {building.name} has management fees but no financial_system_start_date")
            return False
        
        # Έλεγχος αν ο μήνας είναι μετά την έναρξη
        # Σύγκριση year-month (ignore day)
        start_year_month = (building.financial_system_start_date.year, building.financial_system_start_date.month)
        target_year_month = (target_month.year, target_month.month)
        
        if target_year_month < start_year_month:
            logger.debug(f"⏭️ Skipping management fees for {building.name} - {target_month}: before start date")
            return False
        
        # Έλεγχος αν έχει ήδη δημιουργηθεί για αυτόν τον μήνα
        existing_charges = Transaction.objects.filter(
            building=building,
            type='management_fee_charge',
            date__year=target_month.year,
            date__month=target_month.month
        ).exists()
        
        if existing_charges:
            logger.debug(f"⏭️ Management fees already exist for {building.name} - {target_month}")
            return False
        
        return True
    
    @staticmethod
    def _should_charge_reserve_fund(building: Building, target_month: date) -> bool:
        """
        Έλεγχος αν πρέπει να χρεώσουμε reserve fund για τον συγκεκριμένο μήνα
        
        Reserve fund ξεκινάει από reserve_fund_start_date και έχει duration
        """
        # Χρήση της κεντρικής date helper function
        if not is_date_in_reserve_fund_timeline(target_month, building):
            return False
        
        # Έλεγχος αν έχει ήδη δημιουργηθεί για αυτόν τον μήνα
        existing_charges = Transaction.objects.filter(
            building=building,
            type='reserve_fund_charge',
            date__year=target_month.year,
            date__month=target_month.month
        ).exists()
        
        if existing_charges:
            logger.debug(f"⏭️ Reserve fund already exists for {building.name} - {target_month}")
            return False
        
        return True
    
    @staticmethod
    def _create_management_fee_charges(
        building: Building, 
        target_month: date
    ) -> Dict[str, Any]:
        """
        Δημιουργία management fee charges για όλα τα διαμερίσματα
        
        Returns:
            {
                'created': bool,
                'total_amount': Decimal,
                'transactions_created': int
            }
        """
        apartments = building.apartments.all()
        fee_per_apartment = building.management_fee_per_apartment
        transactions_created = 0
        
        for apartment in apartments:
            # Δημιουργία Transaction record
            Transaction.objects.create(
                apartment=apartment,
                building=building,
                type='management_fee_charge',
                amount=fee_per_apartment,
                date=timezone.make_aware(timezone.datetime.combine(target_month, timezone.datetime.min.time())),
                description=f"Δαπάνες Διαχείρισης {target_month.strftime('%B %Y')}",
                balance_before=apartment.current_balance,
                balance_after=apartment.current_balance + fee_per_apartment
            )
            
            # Ενημέρωση apartment balance
            apartment.current_balance += fee_per_apartment
            apartment.save(update_fields=['current_balance'])
            
            transactions_created += 1
        
        total_amount = fee_per_apartment * apartments.count()
        
        return {
            'created': True,
            'total_amount': total_amount,
            'transactions_created': transactions_created
        }
    
    @staticmethod
    def _create_reserve_fund_charges(
        building: Building,
        target_month: date
    ) -> Dict[str, Any]:
        """
        Δημιουργία reserve fund charges για όλα τα διαμερίσματα
        
        Το ποσό κατανέμεται ανά participation_mills
        """
        if not building.reserve_fund_goal or not building.reserve_fund_duration_months:
            return {
                'created': False,
                'total_amount': Decimal('0.00'),
                'transactions_created': 0
            }
        
        # Υπολογισμός μηνιαίου στόχου
        monthly_target = building.reserve_fund_goal / building.reserve_fund_duration_months
        
        apartments = building.apartments.all()
        total_mills = sum(apt.participation_mills or 0 for apt in apartments)
        
        if total_mills == 0:
            logger.warning(f"⚠️ Building {building.name} has 0 total participation mills")
            return {
                'created': False,
                'total_amount': Decimal('0.00'),
                'transactions_created': 0
            }
        
        transactions_created = 0
        total_charged = Decimal('0.00')
        
        for apartment in apartments:
            # Υπολογισμός μεριδίου διαμερίσματος
            apartment_mills = apartment.participation_mills or 0
            apartment_share = (monthly_target * Decimal(str(apartment_mills))) / Decimal(str(total_mills))
            apartment_share = apartment_share.quantize(Decimal('0.01'))
            
            # Δημιουργία Transaction record
            Transaction.objects.create(
                apartment=apartment,
                building=building,
                type='reserve_fund_charge',
                amount=apartment_share,
                date=timezone.make_aware(timezone.datetime.combine(target_month, timezone.datetime.min.time())),
                description=f"Εισφορά Αποθεματικού {target_month.strftime('%B %Y')}",
                balance_before=apartment.current_balance,
                balance_after=apartment.current_balance + apartment_share
            )
            
            # Ενημέρωση apartment balance
            apartment.current_balance += apartment_share
            apartment.save(update_fields=['current_balance'])
            
            transactions_created += 1
            total_charged += apartment_share
        
        return {
            'created': True,
            'total_amount': total_charged,
            'transactions_created': transactions_created
        }
    
    @staticmethod
    def create_charges_for_building(
        building_id: int,
        start_month: Optional[date] = None,
        end_month: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Δημιουργία charges για μια πολυκατοικία για εύρος μηνών
        
        Χρήσιμο για:
        - Retroactive creation όταν προστίθεται νέα πολυκατοικία
        - Bulk creation για πολλούς μήνες
        
        Args:
            building_id: ID πολυκατοικίας
            start_month: Έναρξη (default: financial_system_start_date)
            end_month: Λήξη (default: τρέχων μήνας)
            
        Returns:
            List of results, one per month
        """
        building = Building.objects.get(id=building_id)
        
        # Default values
        if start_month is None:
            start_month = building.financial_system_start_date or date.today().replace(day=1)
        else:
            start_month = get_month_first_day(start_month.year, start_month.month)
        
        if end_month is None:
            end_month = date.today().replace(day=1)
        else:
            end_month = get_month_first_day(end_month.year, end_month.month)
        
        results = []
        current_month = start_month
        
        while current_month <= end_month:
            result = MonthlyChargeService.create_monthly_charges(building, current_month)
            results.append(result)
            
            # Move to next month
            current_month = current_month + relativedelta(months=1)
        
        return results
    
    @staticmethod
    def create_charges_for_all_buildings(target_month: Optional[date] = None) -> List[Dict[str, Any]]:
        """
        Δημιουργία charges για όλες τις ενεργές πολυκατοικίες
        
        Αυτή η μέθοδος καλείται από το cron job κάθε μήνα
        
        Args:
            target_month: Μήνας (default: τρέχων μήνας)
            
        Returns:
            List of results, one per building
        """
        if target_month is None:
            target_month = date.today().replace(day=1)
        else:
            target_month = get_month_first_day(target_month.year, target_month.month)
        
        buildings = Building.objects.filter(is_active=True)
        results = []
        
        for building in buildings:
            try:
                result = MonthlyChargeService.create_monthly_charges(building, target_month)
                results.append(result)
            except Exception as e:
                logger.error(
                    f"❌ Error creating monthly charges for {building.name}: {e}",
                    exc_info=True
                )
                results.append({
                    'building_id': building.id,
                    'building_name': building.name,
                    'error': str(e),
                    'success': False
                })
        
        logger.info(f"📊 Monthly charges created for {len(results)} buildings")
        
        return results

