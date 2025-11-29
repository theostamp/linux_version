"""
Office Finance URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    OfficeExpenseCategoryViewSet,
    OfficeIncomeCategoryViewSet,
    OfficeExpenseViewSet,
    OfficeIncomeViewSet,
    OfficeFinanceDashboardView,
    OfficeFinanceYearlySummaryView,
    InitializeDefaultCategoriesView,
)

router = DefaultRouter()
router.register(r'expense-categories', OfficeExpenseCategoryViewSet, basename='expense-category')
router.register(r'income-categories', OfficeIncomeCategoryViewSet, basename='income-category')
router.register(r'expenses', OfficeExpenseViewSet, basename='expense')
router.register(r'incomes', OfficeIncomeViewSet, basename='income')

urlpatterns = [
    # Dashboard & Summary
    path('dashboard/', OfficeFinanceDashboardView.as_view(), name='office-finance-dashboard'),
    path('yearly-summary/', OfficeFinanceYearlySummaryView.as_view(), name='yearly-summary'),
    path('init-categories/', InitializeDefaultCategoriesView.as_view(), name='init-categories'),
    
    # Router URLs
    path('', include(router.urls)),
]

