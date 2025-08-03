from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExpenseViewSet, TransactionViewSet, PaymentViewSet,
    FinancialDashboardViewSet, CommonExpenseViewSet, MeterReadingViewSet,
    ReportViewSet
)

router = DefaultRouter()
router.register(r'expenses', ExpenseViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'dashboard', FinancialDashboardViewSet, basename='dashboard')
router.register(r'common-expenses', CommonExpenseViewSet, basename='common-expenses')
router.register(r'meter-readings', MeterReadingViewSet)
router.register(r'reports', ReportViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
] 