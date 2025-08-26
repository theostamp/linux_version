from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, TransactionViewSet, PaymentViewSet,
    FinancialDashboardViewSet, CommonExpenseViewSet, MeterReadingViewSet,
    ReportViewSet, SupplierViewSet, ApartmentTransactionViewSet,
    SystemHealthCheckView, auto_fix_system_issues
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
] 