# backend/tenants/urls.py

from django.urls import path
from .views import AcceptTenantInviteView

app_name = 'tenants'

urlpatterns = [
    path('accept-invite/', AcceptTenantInviteView.as_view(), name='accept-tenant-invite'),
]