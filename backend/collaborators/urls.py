from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollaboratorViewSet, CollaborationProjectViewSet, CollaborationContractViewSet,
    CollaborationInvoiceViewSet, CollaborationMeetingViewSet, CollaboratorPerformanceViewSet
)

router = DefaultRouter()
router.register(r'collaborators', CollaboratorViewSet)
router.register(r'projects', CollaborationProjectViewSet)
router.register(r'contracts', CollaborationContractViewSet)
router.register(r'invoices', CollaborationInvoiceViewSet)
router.register(r'meetings', CollaborationMeetingViewSet)
router.register(r'performance', CollaboratorPerformanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
] 