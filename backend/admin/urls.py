# admin/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .subscriptions_views import AdminSubscriptionsViewSet, AdminSubscriptionsStatsView, AdminSubscriptionsExportView
from .billing_views import AdminBillingStatsView, AdminRecentPaymentsView, AdminGenerateMonthlyInvoicesView, AdminBillingExportView
from .settings_views import AdminSystemSettingsView, AdminSystemStatusView, AdminSystemBackupView, AdminSystemLogsView

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', views.AdminUsersViewSet, basename='admin-users')
router.register(r'subscriptions', AdminSubscriptionsViewSet, basename='admin-subscriptions')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Users endpoints
    path('users/stats/', views.AdminUsersStatsView.as_view(), name='admin-users-stats'),
    path('users/export/', views.AdminUsersExportView.as_view(), name='admin-users-export'),
    
    # Subscriptions endpoints
    path('subscriptions/stats/', AdminSubscriptionsStatsView.as_view(), name='admin-subscriptions-stats'),
    path('subscriptions/export/', AdminSubscriptionsExportView.as_view(), name='admin-subscriptions-export'),
    
    # Billing endpoints
    path('billing/stats/', AdminBillingStatsView.as_view(), name='admin-billing-stats'),
    path('billing/recent-payments/', AdminRecentPaymentsView.as_view(), name='admin-recent-payments'),
    path('billing/generate-monthly-invoices/', AdminGenerateMonthlyInvoicesView.as_view(), name='admin-generate-invoices'),
    path('billing/export/', AdminBillingExportView.as_view(), name='admin-billing-export'),
    
    # System settings endpoints
    path('settings/', AdminSystemSettingsView.as_view(), name='admin-settings'),
    path('system/status/', AdminSystemStatusView.as_view(), name='admin-system-status'),
    path('system/backup/', AdminSystemBackupView.as_view(), name='admin-system-backup'),
    path('system/logs/', AdminSystemLogsView.as_view(), name='admin-system-logs'),
]


