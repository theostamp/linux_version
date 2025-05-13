# backend/users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    get_csrf_token,
    login_view,
    logout_view,
    me_view,
    UserViewSet,
)

router = DefaultRouter()
# Εγγραφή του UserViewSet στο βασικό path '' → 
# GET /api/users/           list users
# GET /api/users/{pk}/      retrieve user
# POST /api/users/          create user (εφόσον το επιτρέπουν τα permissions)
# PUT/PATCH /api/users/{pk}/ update user
# DELETE /api/users/{pk}/   delete user
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # Endpoint για τοποθέτηση CSRF cookie (εφόσον χρειάζεται ακόμη)
    path('csrf/', get_csrf_token, name='get_csrf_token'),
    # Login με email + password → JWT tokens
    path('login/', login_view, name='login'),
    # Logout (blacklist του refresh token)
    path('logout/', logout_view, name='logout'),
    # Πληροφορίες για τον τρέχοντα authenticated χρήστη
    path('me/', me_view, name='me'),
    # Routes για CRUD χρήστη μέσω ViewSet
    path('', include(router.urls)),
]
