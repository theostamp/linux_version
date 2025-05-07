from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, me_view, login_view ,logout_view

router = DefaultRouter()
router.register(r'', UserViewSet)  # Προσοχή: ΔΕΝ πρέπει να προηγείται

urlpatterns = [
    path('me/', me_view, name='me'),            # ✅ ΠΡΩΤΑ
    path('login/', login_view, name='login'),   # ✅ ΠΡΩΤΑ
    path('logout/', logout_view, name='logout'),
    path('', include(router.urls)),             # ❗️ ΤΕΛΕΥΤΑΙΟ
]
