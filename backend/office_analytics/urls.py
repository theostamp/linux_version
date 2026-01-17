"""
Office Analytics URL Configuration
"""

from django.urls import path
from .views import (
    OfficeDashboardView,
    PortfolioOverviewView,
    BuildingsFinancialStatusView,
    TopDebtorsView,
    PendingMaintenanceView,
    CashFlowView,
    AlertsView,
    ResidentSearchView,
)

app_name = 'office_analytics'

urlpatterns = [
    # Main dashboard endpoint - returns all data
    path('dashboard/', OfficeDashboardView.as_view(), name='dashboard'),
    
    # Individual endpoints for granular access
    path('portfolio/', PortfolioOverviewView.as_view(), name='portfolio'),
    path('buildings-status/', BuildingsFinancialStatusView.as_view(), name='buildings-status'),
    path('top-debtors/', TopDebtorsView.as_view(), name='top-debtors'),
    path('pending-maintenance/', PendingMaintenanceView.as_view(), name='pending-maintenance'),
    path('cash-flow/', CashFlowView.as_view(), name='cash-flow'),
    path('alerts/', AlertsView.as_view(), name='alerts'),
    path('residents/', ResidentSearchView.as_view(), name='residents'),
]
