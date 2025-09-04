from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet,
    OfferViewSet,
    ContractViewSet,
    MilestoneViewSet,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'offers', OfferViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'milestones', MilestoneViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
