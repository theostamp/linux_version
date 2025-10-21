from django.urls import path
from .internal_views import InternalTenantCreateView

urlpatterns = [
    path("", InternalTenantCreateView.as_view(), name="internal-tenant-create"),
]
