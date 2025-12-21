from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContractorViewSet, ServiceReceiptViewSet, ScheduledMaintenanceViewSet,
    MaintenanceTicketViewSet, WorkOrderViewSet, PublicScheduledMaintenanceListView,
    PublicMaintenanceCountersView, PaymentScheduleViewSet, PaymentInstallmentViewSet, PaymentReceiptViewSet,
    MarketplacePartnerViewSet
)

router = DefaultRouter()
router.register(r'contractors', ContractorViewSet)
router.register(r'receipts', ServiceReceiptViewSet)
router.register(r'scheduled-maintenance', ScheduledMaintenanceViewSet)
# Backwards-compatible alias expected by frontend
router.register(r'scheduled', ScheduledMaintenanceViewSet, basename='scheduled-maintenance-alias')
router.register(r'tickets', MaintenanceTicketViewSet)
router.register(r'work-orders', WorkOrderViewSet)
# Payment system routes
router.register(r'payment-schedules', PaymentScheduleViewSet)
router.register(r'payment-installments', PaymentInstallmentViewSet)
router.register(r'payment-receipts', PaymentReceiptViewSet)
router.register(r'marketplace-partners', MarketplacePartnerViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('public/scheduled/', PublicScheduledMaintenanceListView.as_view(), name='public-scheduled-maintenance'),
    path('public/counters/', PublicMaintenanceCountersView.as_view(), name='public-maintenance-counters'),
]