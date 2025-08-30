# Configuration for hardcoded values
# This file contains configuration values that were previously hardcoded

# Default building settings - UPDATED: Removed hardcoded values to prevent mysterious amounts
DEFAULT_BUILDING_SETTINGS = {
    'reserve_fund_goal': 0.00,  # Changed from 5000.00 to prevent automatic goals
    'reserve_fund_duration_months': 0,  # Changed from 12 to prevent automatic duration
    'reserve_contribution_per_apartment': 0.00,  # Changed from 5.00 to prevent mysterious 50€ (5€×10 apartments)
}

# Default apartment settings
DEFAULT_APARTMENT_SETTINGS = {
    'participation_mills': 100.00,
    'current_balance': 0.00,
}

# Test data
TEST_DATA = {
    'email': 'test@example.com',
    'admin_email': 'admin@example.com',
    'user_email': 'user@example.com',
    'phone': '2103456789',
}

# Verification script defaults
VERIFICATION_DEFAULTS = {
    'test_amount': 100.00,
    'test_expense': 500.00,
    'test_payment': 300.00,
}

# TODO: Move these values to environment variables or database settings
