# backend/core/urls.py

from django.urls import path
from .views import get_csrf_token

urlpatterns = [
    # GET /api/csrf/  →  επιστρέφει CSRF cookie
    path('csrf/', get_csrf_token, name='get_csrf_token'),
]
