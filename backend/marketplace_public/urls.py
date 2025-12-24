from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MarketplaceOfferRequestViewSet, MarketplaceProviderViewSet

router = DefaultRouter()
router.register(r"providers", MarketplaceProviderViewSet, basename="marketplace-provider")
router.register(r"offer-requests", MarketplaceOfferRequestViewSet, basename="marketplace-offer-request")

urlpatterns = [
    path("", include(router.urls)),
]


