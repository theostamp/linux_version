from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, TransactionViewSet, PaymentViewSet,
    FinancialDashboardViewSet, CommonExpenseViewSet, MeterReadingViewSet,
    ReportViewSet, SupplierViewSet, ApartmentTransactionViewSet,
    SystemHealthCheckView, auto_fix_system_issues, financial_overview,
    FinancialReceiptViewSet, MonthlyBalanceViewSet, my_apartment_data,
    cleanup_orphan_transactions, database_cleanup
)
from .backup_views import backup_database, restore_database
from .tests_views import (
    run_financial_tests, stop_financial_tests, get_tests_status,
    get_test_coverage_info, clear_test_results
)

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'dashboard', FinancialDashboardViewSet, basename='dashboard')
router.register(r'common-expenses', CommonExpenseViewSet, basename='common-expenses')
router.register(r'meter-readings', MeterReadingViewSet)
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'apartments', ApartmentTransactionViewSet, basename='apartment-transactions')
router.register(r'receipts', FinancialReceiptViewSet)
router.register(r'monthly-balances', MonthlyBalanceViewSet, basename='monthly-balances')

urlpatterns = [
    path('', include(router.urls)),
    # Custom URL pattern for apartment transactions
    path('apartments/<int:apartment_id>/transactions/', 
         ApartmentTransactionViewSet.as_view({'get': 'list'}), 
         name='apartment-transactions-list'),
    # Custom URL pattern for building apartments summary
    path('building/<int:pk>/apartments-summary/', 
         FinancialDashboardViewSet.as_view({'get': 'apartments_summary'}), 
         name='building-apartments-summary'),
    # System health check endpoint
    path('system-health/', SystemHealthCheckView.as_view(), name='system-health-check'),
    # Auto fix system issues endpoint
    path('auto-fix/', auto_fix_system_issues, name='auto-fix-system-issues'),
    # Financial overview endpoint
    path('overview/', financial_overview, name='financial-overview'),
    # Financial Tests endpoints
    path('tests/run/', run_financial_tests, name='run-financial-tests'),
    path('tests/stop/', stop_financial_tests, name='stop-financial-tests'),
    path('tests/status/', get_tests_status, name='get-tests-status'),
    path('tests/coverage/', get_test_coverage_info, name='get-test-coverage'),
    path('tests/clear/', clear_test_results, name='clear-test-results'),
    # My Apartment endpoint για ενοίκους
    path('my-apartment/', my_apartment_data, name='my-apartment-data'),
    path('my-apartment', my_apartment_data, name='my-apartment-data-no-slash'),
    # Admin cleanup endpoints
    path('admin/cleanup-orphan-transactions/', cleanup_orphan_transactions, name='cleanup-orphan-transactions'),
    path('admin/database-cleanup/', database_cleanup, name='database-cleanup'),
    # Backup & Restore endpoints
    path('admin/backup/', backup_database, name='backup-database'),
    path('admin/restore/', restore_database, name='restore-database'),
] 