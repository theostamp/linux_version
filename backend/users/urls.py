from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView  # <-- ΠΡΟΣΘΕΣΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
from .views import UserViewSet, me_view, login_view, logout_view

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('me/', me_view, name='me'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # <-- ΠΡΟΣΘΕΣΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
    path('', include(router.urls)),  # Αυτό πρέπει να μείνει τελευταίο
]