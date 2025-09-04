from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContractorViewSet, ServiceReceiptViewSet, ScheduledMaintenanceViewSet,
    MaintenanceTicketViewSet, WorkOrderViewSet
)

router = DefaultRouter()
router.register(r'contractors', ContractorViewSet)
router.register(r'receipts', ServiceReceiptViewSet)
router.register(r'scheduled-maintenance', ScheduledMaintenanceViewSet)
router.register(r'tickets', MaintenanceTicketViewSet)
router.register(r'work-orders', WorkOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 