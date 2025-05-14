from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet

router = DefaultRouter()
router.register("", TenantViewSet)   # /api/tenants/

urlpatterns = [
    path("", include(router.urls)),
]
