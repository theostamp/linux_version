from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    OfferViewSet,
    ContractViewSet,
    ProjectsDashboardViewSet,
    ProcurementEventViewSet,
    DecisionViewSet,
    ProjectTaskViewSet,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'offers', OfferViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'procurement', ProcurementEventViewSet)
router.register(r'decisions', DecisionViewSet)
router.register(r'tasks', ProjectTaskViewSet)
router.register(r'dashboard', ProjectsDashboardViewSet, basename='projects-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
