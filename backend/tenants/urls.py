# backend/tenants/urls.py

from django.urls import re_path
from .views import AcceptTenantInviteView

app_name = 'tenants'

urlpatterns = [
    # Accept both /accept-invite and /accept-invite/ to avoid 301 redirect issues
    # with Next.js proxy that may strip trailing slashes (POST → GET loses body)
    re_path(r'^accept-invite/?$', AcceptTenantInviteView.as_view(), name='accept-tenant-invite'),
]