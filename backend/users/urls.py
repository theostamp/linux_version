from django.urls import path, include # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore
from rest_framework_simplejwt.views import ( # type: ignore
    TokenObtainPairView,
    TokenRefreshView
)
from .views import UserViewSet, me_view, logout_view  # αφαίρεσα το login_view αφού θα χρησιμοποιήσουμε το JWT

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('me/', me_view, name='me'),
    path('login/', TokenObtainPairView.as_view(), name='login'),  # JWT login
    path('logout/', logout_view, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
