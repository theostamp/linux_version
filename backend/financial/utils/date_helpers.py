"""
Date Utility Functions - Single Source of Truth for Date Operations

This module provides centralized date handling utilities for the financial system.
It replaces multiple duplicate implementations across the codebase.

Created: 2025-10-10
Purpose: Eliminate duplicate date parsing and reserve fund timeline logic
"""

import logging
from datetime import date, timedelta
from typing import Tuple, Optional
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)


def parse_month_string(month: str) -> Tuple[int, int]:
    """
    Parse YYYY-MM string into (year, month) tuple.
    
    Args:
        month: Month string in format "YYYY-MM" (e.g., "2025-10")
        
    Returns:
        Tuple[int, int]: (year, month) tuple
        
    Raises:
        ValueError: If month string is invalid format
        
    Example:
        >>> year, month = parse_month_string("2025-10")
        >>> print(f"{year}-{month:02d}")
        2025-10
    """
    try:
        year, mon = map(int, month.split('-'))
        
        # Validate month range
        if not (1 <= mon <= 12):
            raise ValueError(f"Month must be between 1-12, got {mon}")
            
        return year, mon
        
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid month string format: {month}. Expected 'YYYY-MM'") from e


def get_month_date_range(month: str) -> Tuple[date, date]:
    """
    Convert YYYY-MM string to (start_date, end_date) tuple.
    
    The start_date is the first day of the month (day 1).
    The end_date is the first day of the NEXT month (for exclusive range queries).
    
    Args:
        month: Month string in format "YYYY-MM"
        
    Returns:
        Tuple[date, date]: (start_date, end_date) where end_date is exclusive
        
    Example:
        >>> start, end = get_month_date_range("2025-10")
        >>> print(f"Range: {start} to {end}")
        Range: 2025-10-01 to 2025-11-01
        >>> # Use in queries: date__gte=start, date__lt=end
    """
    year, mon = parse_month_string(month)
    start_date = date(year, mon, 1)
    
    # Calculate first day of next month
    if mon == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, mon + 1, 1)
        
    return start_date, end_date


def is_date_in_reserve_fund_timeline(
    target_date: date,
    building
) -> bool:
    """
    Check if a date falls within the reserve fund collection period.
    
    This is the SINGLE SOURCE OF TRUTH for reserve fund timeline checks.
    
    Replaces:
    - CommonExpenseCalculator._is_month_in_reserve_fund_timeline()
    - FinancialDashboardService._is_month_within_reserve_fund_period()
    
    Logic:
    1. Check if reserve fund is configured (start_date and duration exist)
    2. Calculate end date from:
       - building.reserve_fund_target_date if set, OR
       - start_date + duration_months
    3. Compare target_date (as year-month) against the period
    
    Args:
        target_date: The date to check
        building: Building object with reserve fund configuration
        
    Returns:
        bool: True if target_date is within the reserve fund collection period
        
    Example:
        >>> from buildings.models import Building
        >>> building = Building.objects.get(id=1)
        >>> target = date(2025, 10, 15)
        >>> is_in_timeline = is_date_in_reserve_fund_timeline(target, building)
        >>> print(f"In timeline: {is_in_timeline}")
    """
    # Check if reserve fund is configured
    if not building.reserve_fund_start_date:
        logger.debug(f"Reserve fund not configured: no start_date")
        return False
        
    if not building.reserve_fund_duration_months or building.reserve_fund_duration_months <= 0:
        logger.debug(f"Reserve fund not configured: invalid duration")
        return False
    
    try:
        start_date = building.reserve_fund_start_date
        
        # Calculate or use target end date
        if building.reserve_fund_target_date:
            end_date = building.reserve_fund_target_date
        else:
            # Calculate: start_date + duration_months
            end_date = start_date + relativedelta(months=building.reserve_fund_duration_months)
        
        # Compare year-month tuples (ignore day component)
        target_year_month = (target_date.year, target_date.month)
        start_year_month = (start_date.year, start_date.month)
        end_year_month = (end_date.year, end_date.month)
        
        # Check if target is within range [start, end] (inclusive)
        is_within = start_year_month <= target_year_month <= end_year_month
        
        logger.debug(
            f"Reserve fund timeline check: target={target_date}, "
            f"start={start_date}, end={end_date}, is_within={is_within}"
        )
        
        return is_within
        
    except Exception as e:
        logger.error(f"Error checking reserve fund timeline: {e}", exc_info=True)
        # Safe default: return False on error
        return False


def get_month_first_day(year: int, month: int) -> date:
    """
    Get the first day of a given month.
    
    Args:
        year: Year (e.g., 2025)
        month: Month (1-12)
        
    Returns:
        date: First day of the month
        
    Example:
        >>> first_day = get_month_first_day(2025, 10)
        >>> print(first_day)
        2025-10-01
    """
    return date(year, month, 1)


def months_between(start_date: date, end_date: date) -> int:
    """
    Calculate the number of months between two dates.
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        int: Number of months difference
        
    Example:
        >>> start = date(2025, 1, 15)
        >>> end = date(2025, 6, 20)
        >>> months = months_between(start, end)
        >>> print(f"Months: {months}")
        Months: 5
    """
    return (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)


