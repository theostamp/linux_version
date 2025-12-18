"""
Unit tests for Date Helper Utilities

Tests the centralized date handling utilities to ensure:
1. Month string parsing works correctly
2. Month date range calculation is accurate
3. Reserve fund timeline checks work properly
4. Edge cases are handled gracefully
"""

from datetime import date
from django.test import TestCase
from django_tenants.utils import schema_context

from buildings.models import Building
from financial.utils.date_helpers import (
    parse_month_string,
    get_month_date_range,
    is_date_in_reserve_fund_timeline,
    get_month_first_day,
    get_next_month_start,
    months_between
)


class TestParseMonthString(TestCase):
    """Test suite for parse_month_string function"""
    
    def test_parse_valid_month_string(self):
        """Test parsing a valid month string"""
        year, month = parse_month_string("2025-10")
        self.assertEqual(year, 2025)
        self.assertEqual(month, 10)
    
    def test_parse_january(self):
        """Test parsing January"""
        year, month = parse_month_string("2025-01")
        self.assertEqual(year, 2025)
        self.assertEqual(month, 1)
    
    def test_parse_december(self):
        """Test parsing December"""
        year, month = parse_month_string("2025-12")
        self.assertEqual(year, 2025)
        self.assertEqual(month, 12)
    
    def test_parse_invalid_month_too_high(self):
        """Test that invalid month (13) raises ValueError"""
        with self.assertRaises(ValueError):
            parse_month_string("2025-13")
    
    def test_parse_invalid_month_zero(self):
        """Test that invalid month (0) raises ValueError"""
        with self.assertRaises(ValueError):
            parse_month_string("2025-00")
    
    def test_parse_invalid_format(self):
        """Test that invalid format raises ValueError"""
        with self.assertRaises(ValueError):
            parse_month_string("2025/10")
    
    def test_parse_missing_parts(self):
        """Test that incomplete string raises ValueError"""
        with self.assertRaises(ValueError):
            parse_month_string("2025")


class TestGetMonthDateRange(TestCase):
    """Test suite for get_month_date_range function"""
    
    def test_get_range_october(self):
        """Test getting date range for October"""
        start, end = get_month_date_range("2025-10")
        self.assertEqual(start, date(2025, 10, 1))
        self.assertEqual(end, date(2025, 11, 1))
    
    def test_get_range_december(self):
        """Test getting date range for December (year boundary)"""
        start, end = get_month_date_range("2025-12")
        self.assertEqual(start, date(2025, 12, 1))
        self.assertEqual(end, date(2026, 1, 1))
    
    def test_get_range_january(self):
        """Test getting date range for January"""
        start, end = get_month_date_range("2025-01")
        self.assertEqual(start, date(2025, 1, 1))
        self.assertEqual(end, date(2025, 2, 1))
    
    def test_get_range_february_non_leap(self):
        """Test getting date range for February (non-leap year)"""
        start, end = get_month_date_range("2025-02")
        self.assertEqual(start, date(2025, 2, 1))
        self.assertEqual(end, date(2025, 3, 1))
    
    def test_get_range_february_leap(self):
        """Test getting date range for February (leap year)"""
        start, end = get_month_date_range("2024-02")
        self.assertEqual(start, date(2024, 2, 1))
        self.assertEqual(end, date(2024, 3, 1))


class TestIsDateInReserveFundTimeline(TestCase):
    """Test suite for is_date_in_reserve_fund_timeline function"""
    
    def setUp(self):
        """Set up test data"""
        with schema_context('demo'):
            # Get or create test building
            self.building = Building.objects.filter(id=1).first()
            if not self.building:
                self.building = Building.objects.create(
                    id=1,
                    name='Test Building',
                    address='Test Address 1',
                    city='Athens',
                    postal_code='11111'
                )
    
    def test_date_within_timeline(self):
        """Test date that is within the reserve fund timeline"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date in November (should be within timeline)
            test_date = date(2025, 11, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertTrue(result)
    
    def test_date_before_timeline(self):
        """Test date that is before the reserve fund timeline"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date in September (should be before timeline)
            test_date = date(2025, 9, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
    
    def test_date_after_timeline(self):
        """Test date that is after the reserve fund timeline"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 1, 1)
            self.building.reserve_fund_duration_months = 6
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date in December (should be after 6-month timeline)
            test_date = date(2025, 12, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
    
    def test_date_on_start_boundary(self):
        """Test date that is exactly on the start boundary"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date on start boundary
            test_date = date(2025, 10, 1)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertTrue(result)
    
    def test_date_on_end_boundary(self):
        """Test date that is exactly on the end boundary"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 1, 1)
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date on end boundary (December 2025)
            test_date = date(2025, 12, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertTrue(result)
    
    def test_no_start_date(self):
        """Test when building has no reserve fund start date"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = None
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            test_date = date(2025, 10, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
    
    def test_no_duration(self):
        """Test when building has no reserve fund duration"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = None
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            test_date = date(2025, 10, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
    
    def test_zero_duration(self):
        """Test when building has zero duration"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = 0
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            test_date = date(2025, 10, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
    
    def test_with_explicit_target_date(self):
        """Test using explicit target_date instead of calculated duration"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 1, 1)
            self.building.reserve_fund_duration_months = 12
            self.building.reserve_fund_target_date = date(2025, 6, 30)  # Ends earlier than 12 months
            self.building.save()
            
            # Test date in July (should be outside because target_date is June 30)
            test_date = date(2025, 7, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)
            
            # Test date in June (should be within)
            test_date = date(2025, 6, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertTrue(result)
    
    def test_year_boundary_crossing(self):
        """Test reserve fund timeline that crosses year boundary"""
        with schema_context('demo'):
            self.building.reserve_fund_start_date = date(2025, 10, 1)
            self.building.reserve_fund_duration_months = 6
            self.building.reserve_fund_target_date = None
            self.building.save()
            
            # Test date in January 2026 (should be within 6-month timeline)
            test_date = date(2026, 1, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertTrue(result)
            
            # Test date in April 2026 (should be outside)
            test_date = date(2026, 4, 15)
            result = is_date_in_reserve_fund_timeline(test_date, self.building)
            self.assertFalse(result)


class TestGetMonthFirstDay(TestCase):
    """Test suite for get_month_first_day function"""
    
    def test_get_first_day_october(self):
        """Test getting first day of October"""
        result = get_month_first_day(2025, 10)
        self.assertEqual(result, date(2025, 10, 1))
    
    def test_get_first_day_january(self):
        """Test getting first day of January"""
        result = get_month_first_day(2025, 1)
        self.assertEqual(result, date(2025, 1, 1))
    
    def test_get_first_day_december(self):
        """Test getting first day of December"""
        result = get_month_first_day(2025, 12)
        self.assertEqual(result, date(2025, 12, 1))


class TestMonthsBetween(TestCase):
    """Test suite for months_between function"""
    
    def test_months_between_same_year(self):
        """Test calculating months between dates in same year"""
        start = date(2025, 1, 1)
        end = date(2025, 6, 1)
        result = months_between(start, end)
        self.assertEqual(result, 5)
    
    def test_months_between_different_years(self):
        """Test calculating months between dates across years"""
        start = date(2025, 10, 1)
        end = date(2026, 3, 1)
        result = months_between(start, end)
        self.assertEqual(result, 5)
    
    def test_months_between_same_month(self):
        """Test calculating months between dates in same month"""
        start = date(2025, 10, 1)
        end = date(2025, 10, 31)
        result = months_between(start, end)
        self.assertEqual(result, 0)
    
    def test_months_between_negative(self):
        """Test calculating months when end is before start"""
        start = date(2025, 6, 1)
        end = date(2025, 1, 1)
        result = months_between(start, end)
        self.assertEqual(result, -5)
    
    def test_months_between_full_year(self):
        """Test calculating months for a full year"""
        start = date(2025, 1, 1)
        end = date(2026, 1, 1)
        result = months_between(start, end)
        self.assertEqual(result, 12)


class TestGetNextMonthStart(TestCase):
    """Test suite for get_next_month_start function"""
    
    def test_next_month_mid_month(self):
        """Test next month start from a mid-month date"""
        result = get_next_month_start(date(2025, 12, 18))
        self.assertEqual(result, date(2026, 1, 1))
    
    def test_next_month_from_first_day(self):
        """Test next month start when already on first day"""
        result = get_next_month_start(date(2025, 10, 1))
        self.assertEqual(result, date(2025, 11, 1))
    
    def test_next_month_year_boundary(self):
        """Test next month start across year boundary"""
        result = get_next_month_start(date(2025, 12, 31))
        self.assertEqual(result, date(2026, 1, 1))

