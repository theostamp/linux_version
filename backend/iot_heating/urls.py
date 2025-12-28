from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HeatingDeviceViewSet

router = DefaultRouter()
router.register(r'devices', HeatingDeviceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

