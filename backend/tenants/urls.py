# backend/tenants/urls.py

from django.urls import path
from .views import AcceptTenantInviteView

app_name = 'tenants'

urlpatterns = [
    path('', AcceptTenantInviteView.as_view(), name='accept-tenant-invite'),
]