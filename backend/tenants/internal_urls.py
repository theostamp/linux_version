from django.urls import path
from .internal_views import InternalTenantCreateView
from .tenant_status_views import TenantStatusView, ResendVerificationView

urlpatterns = [
    path("", InternalTenantCreateView.as_view(), name="internal-tenant-create"),
    path("<str:tenant_subdomain>/status/", TenantStatusView.as_view(), name="tenant-status"),
    path("<str:tenant_subdomain>/resend-verification/", ResendVerificationView.as_view(), name="tenant-resend-verification"),
]
