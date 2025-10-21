from django.urls import path, include  
    # type: ignore
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet
from .internal_views import InternalTenantCreateView

router = DefaultRouter()
router.register("", TenantViewSet)   # /api/tenants/

urlpatterns = [
    path("", include(router.urls)),
    
    # Internal API endpoints (secured with IsInternalService permission)
    path("internal/create/", InternalTenantCreateView.as_view(), name="internal-tenant-create"),
]
